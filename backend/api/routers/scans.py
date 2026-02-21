from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from core.database import get_db
from models.domain import Policy, Rule, Violation, ScanJob, DatabaseConnection
import os

router = APIRouter()

@router.post("/scans")
async def trigger_scan(db: Session = Depends(get_db)):
    """Endpoint to trigger a compliance scan."""
    # 1. Check for rules
    rule_count = db.query(Rule).count()
    if rule_count == 0:
        raise HTTPException(status_code=400, detail="Cannot start scan: No compliance rules found. Please upload a policy first.")
    
    # 2. Check for active database connection
    active_conn = db.query(DatabaseConnection).filter(DatabaseConnection.is_active == True).first()
    if not active_conn:
        raise HTTPException(status_code=400, detail="Cannot start scan: No active database connection. Please connect and activate a database in the Monitor page.")

    # 3. Create Scan Job
    new_job = ScanJob(
        table_name="All Tables" if active_conn.db_type != 'csv' else os.path.basename(active_conn.connection_url),
        status="running",
        records_scanned=0,
        violations_found=0
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    
    # 4. Trigger Celery Job
    from workers.tasks import scan_table_task
    scan_table_task.delay(new_job.id, new_job.table_name, active_conn.connection_url, active_conn.db_type)
    
    return {"message": f"Scan triggered successfully on {active_conn.name}", "job_id": new_job.id}

@router.get("/scans")
async def get_all_scans(db: Session = Depends(get_db)):
    """Endpoint to get a list of all scan jobs (history)."""
    return db.query(ScanJob).order_by(ScanJob.start_time.desc()).all()

@router.get("/scans/{job_id}")
async def get_scan_status(job_id: int, db: Session = Depends(get_db)):
    """Endpoint to get the status of a specific scan job."""
    job = db.query(ScanJob).get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Scan job not found")
    return job

@router.get("/stats")
async def get_system_stats(db: Session = Depends(get_db)):
    """Backend stats for dashboard KPIs with real data and health score."""
    last_job = db.query(ScanJob).order_by(ScanJob.start_time.desc()).first()
    last_scan_time = last_job.start_time.strftime("%Y-%m-%d %I:%M %p") if last_job else "--"
    
    violations_count = db.query(Violation).count()
    # In a real system, we'd sum records_scanned from the latest complete scan jobs for each table
    # For MVP scalability, we'll use the records_scanned from the last job as a proxy or a total count
    total_records = db.query(func.sum(ScanJob.records_scanned)).scalar() or 0
    
    # Calculate health score: 100 - (weighted impact of violations)
    # If no records scanned yet, score is 100 or --
    health_score = 100
    if total_records > 0:
        # Each violation subtracts from health based on density
        health_score = max(0, 100 - (violations_count * 100 // max(1, total_records // 10))) 
        # Example: 100k records, 1k violations -> 100 - (1000 * 100 / 10000) = 90%
    
    return {
        "policies": db.query(Policy).count(),
        "rules": db.query(Rule).count(),
        "violations": violations_count,
        "last_scan": last_scan_time,
        "overall_health": health_score if total_records > 0 else 100,
        "total_records": total_records
    }
