from workers.celery_app import celery_app
from engine.scanner import RuleEngine
from core.database import SessionLocal
from models.domain import Rule, ScanJob
import logging

logger = logging.getLogger(__name__)

@celery_app.task(bind=True)
def scan_table_task(self, job_id: int, table_name: str, target_db_url: str, db_type: str = "postgres"):
    """
    Background worker task to scan a specific table against all active rules.
    Runs asynchronously and independently per table for horizontal scale.
    """
    db = SessionLocal()
    job = db.query(ScanJob).filter(ScanJob.id == job_id).first()
    
    if not job:
        logger.error(f"Job {job_id} not found.")
        db.close()
        return

    job.status = "running"
    db.commit()

    try:
        engine = RuleEngine(target_db_url=target_db_url, db_type=db_type)
        
        rules = db.query(Rule).all()
        total_rules = len(rules)
        total_violations = 0
        total_records_scanned = engine.get_record_count(table_name)
        
        # Optimization: Ensure index on common filter columns
        if table_name != "All Tables":
            engine.ensure_index(table_name, "created_date")
            engine.ensure_index(table_name, "id")

        # Initial status update
        job.records_scanned = total_records_scanned
        job.progress = 0
        db.commit()

        for i, rule in enumerate(rules):
            logger.info(f"Applying Rule {rule.id} to {table_name}")
            
            violations_generator = engine.execute_rule(
                rule.id, 
                table_name, 
                rule.sql_query, 
                condition=getattr(rule, 'condition', None)
            )
            
            saved_count = engine.save_violations(rule.id, table_name, violations_generator)
            total_violations += saved_count
            
            # Update incremental progress
            progress_percent = int(((i + 1) / total_rules) * 100)
            job.progress = progress_percent
            job.violations_found = total_violations
            db.commit()

        job.status = "completed"
        job.progress = 100
        job.violations_found = total_violations
        job.records_scanned = total_records_scanned
        db.commit()
        return f"Scan {job_id} completed: {total_violations} violations found."

    except Exception as e:
        logger.error(f"Scan {job_id} failed: {e}")
        job.status = "failed"
        db.commit()
        raise e
    finally:
        if 'engine' in locals():
            engine.cleanup()
        db.close()
