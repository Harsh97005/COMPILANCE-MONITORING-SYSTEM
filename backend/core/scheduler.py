try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.interval import IntervalTrigger
    HAS_SCHEDULER = True
except ImportError:
    HAS_SCHEDULER = False
    
from engine.scanner import RuleEngine
from core.database import SessionLocal
from models.domain import Rule, DatabaseConnection, ScanJob
import logging
import os

logger = logging.getLogger(__name__)

async def run_periodic_scan():
    """
    Background job that runs every 5 minutes.
    Scans all active rules against their target tables.
    """
    if not HAS_SCHEDULER:
        return

    print("--- [SCHEDULER] Periodic scan heartbeat triggered ---")
    logger.info("Starting periodic compliance scan...")
    db = SessionLocal()
    try:
        # 1. Check for active database connection
        active_conn = db.query(DatabaseConnection).filter(DatabaseConnection.is_active == True).first()
        if not active_conn:
            print("--- [SCHEDULER] Skipped: No active database connection found ---")
            logger.warning("Periodic scan skipped: No active database connection.")
            return

        # 2. Get all rules
        rules = db.query(Rule).all()
        if not rules:
            print(f"--- [SCHEDULER] Skipped: No rules found for connection {active_conn.name} ---")
            logger.warning("Periodic scan skipped: No rules found.")
            return

        print(f"--- [SCHEDULER] Processing {len(rules)} rules on {active_conn.name} ---")
        
        # 3. Create a Scan Job record
        new_job = ScanJob(
            table_name=f"Periodic: {active_conn.name}",
            status="running",
            records_scanned=0,
            violations_found=0
        )
        db.add(new_job)
        db.commit()
        db.refresh(new_job)

        engine = RuleEngine(target_db_url=active_conn.connection_url, db_type=active_conn.db_type)
        total_violations = 0
        
        for rule in rules:
            logger.info(f"Periodic Scan: Applying Rule {rule.id} to {rule.target_table}")
            violations_generator = engine.execute_rule(
                rule.id, 
                rule.target_table, 
                rule.sql_query, 
                condition=getattr(rule, 'condition', None)
            )
            saved_count = engine.save_violations(rule.id, rule.target_table, violations_generator)
            total_violations += saved_count

        # 4. Update Job status
        new_job.status = "completed"
        new_job.violations_found = total_violations
        new_job.progress = 100
        db.commit()
        
        print(f"--- [SCHEDULER] Success: {total_violations} violations detected ---")
        logger.info(f"Periodic scan completed. Found {total_violations} new violations.")

    except Exception as e:
        print(f"--- [SCHEDULER] ERROR: {str(e)} ---")
        logger.error(f"Periodic scan failed: {e}")
        if 'new_job' in locals():
            try:
                new_job.status = "failed"
                db.commit()
            except: pass
    finally:
        db.close()

def start_scheduler():
    if not HAS_SCHEDULER:
        print("--- [SYSTEM] Warning: APScheduler is NOT installed. Periodic scanning is disabled. ---")
        print("--- [SYSTEM] To enable it, run: pip install APScheduler ---")
        return None

    print("--- [SYSTEM] Initializing Compliance Scheduler ---")
    scheduler = AsyncIOScheduler()
    
    # Add the job with a 5-minute interval
    scheduler.add_job(
        run_periodic_scan,
        trigger=IntervalTrigger(minutes=5),
        id="compliance_periodic_scan",
        name="Run periodic compliance scan every 5 minutes",
        replace_existing=True,
    )
    
    try:
        from apscheduler.triggers.date import DateTrigger
        from datetime import datetime, timedelta
        
        # Also trigger one run almost immediately (after 5 seconds) to verify it works
        scheduler.add_job(
            run_periodic_scan,
            trigger=DateTrigger(run_date=datetime.now() + timedelta(seconds=5)),
            id="verify_scheduler_init",
            replace_existing=True,
        )
    except Exception as e:
        logger.error(f"Failed to schedule immediate run: {e}")
        
    scheduler.start()
    logger.info("Scheduled periodic compliance scan (every 5 minutes)")
    print("--- [SYSTEM] Scheduler started successfully ---")
    return scheduler
