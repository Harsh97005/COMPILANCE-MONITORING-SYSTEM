from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from core.database import get_db
from models.domain import Violation, Rule

router = APIRouter()

@router.get("/violations")
async def get_violations(db: Session = Depends(get_db), limit: int = 100, offset: int = 0):
    """Endpoint to fetch paginated violations with rule details from the database."""
    try:
        query = db.query(Violation, Rule).join(Rule, Violation.rule_id == Rule.id)
        total = query.count()
        results = query.offset(offset).limit(limit).all()
        
        violations_list = []
        for violation, rule in results:
            violations_list.append({
                "id": violation.id,
                "rule_id": rule.id,
                "rule_name": rule.name,
                "severity": rule.severity,
                "table_name": violation.table_name,
                "record_id": violation.record_id,
                "detected_at": violation.detected_at.isoformat() if violation.detected_at else None,
                "metadata": violation.metadata_json
            })
            
        return {
            "violations": violations_list,
            "total": total,
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
from fastapi.responses import StreamingResponse
import io
import csv

@router.get("/violations/export")
async def export_violations(db: Session = Depends(get_db)):
    """Export all violations as CSV using streaming for performance with large datasets."""
    
    def generate_csv():
        # Using a generator for streaming
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write Header
        writer.writerow(["Violation ID", "Rule ID", "Rule Name", "Severity", "Table Name", "Record ID", "Detected At"])
        yield output.getvalue()
        output.truncate(0)
        output.seek(0)

        # Batch fetch violations to avoid memory pressure
        batch_size = 1000
        offset = 0
        while True:
            # Query joined data
            results = db.query(Violation, Rule).join(Rule, Violation.rule_id == Rule.id).offset(offset).limit(batch_size).all()
            if not results:
                break
                
            for violation, rule in results:
                writer.writerow([
                    violation.id,
                    rule.id,
                    rule.name,
                    rule.severity,
                    violation.table_name,
                    violation.record_id,
                    violation.detected_at.isoformat() if violation.detected_at else ""
                ])
                yield output.getvalue()
                output.truncate(0)
                output.seek(0)
            
            offset += batch_size

    return StreamingResponse(
        generate_csv(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=compliance_violations.csv"}
    )
