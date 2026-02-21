import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from core.database import get_db
from models.domain import Policy, Rule
import shutil

router = APIRouter()

# Ensure uploads directory exists
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/policies")
async def upload_policy(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Endpoint for uploading PDF policy documents."""
    try:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Create policy record
        new_policy = Policy(filename=file.filename, status="completed")
        db.add(new_policy)
        db.commit()
        db.refresh(new_policy)
        
        return {"message": "Policy uploaded successfully", "policy_id": new_policy.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("/policies/{policy_id}/extract")
async def extract_rules(policy_id: int, db: Session = Depends(get_db)):
    """Endpoint to trigger extraction of rules from a policy."""
    policy = db.query(Policy).get(policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    
    # Mock extracted rules for the MVP demonstration
    # In a real app, this would use AI/NLP
    mock_rules = [
        {"name": "Monitor New Users", "description": "Identify users created after 2022 for compliance review.", "severity": "medium", "target_table": "users", "condition": "created_date > '2022-01-01'", "sql": ""},
        {"name": "No Personal Expenses", "description": "Detects corporate card usage for non-work related purchases.", "severity": "high", "target_table": "expenses", "condition": "category = 'personal'", "sql": "SELECT * FROM expenses WHERE category = 'personal'"},
        {"name": "Travel Limit Check", "description": "Ensures flight bookings don't exceed $1,000 without approval.", "severity": "medium", "target_table": "travel_bookings", "condition": "amount > 1000 AND status != 'approved'", "sql": "SELECT * FROM travel_bookings WHERE amount > 1000 AND status != 'approved'"},
        {"name": "Duplicate Invoice Detection", "description": "Flags multiple invoices from the same vendor with the same amount.", "severity": "critical", "target_table": "invoices", "condition": "", "sql": "SELECT id, vendor_id, amount FROM invoices GROUP BY vendor_id, amount HAVING count(*) > 1"},
        {"name": "High Risk Jurisdiction Check", "description": "Detects accounts related to Switzerland banks for additional KYC.", "severity": "medium", "target_table": "bank_accounts", "condition": "bank_name LIKE 'Switzerland%'", "sql": "SELECT * FROM bank_accounts WHERE bank_name LIKE 'Switzerland%' LIMIT 100"}
    ]
    
    added_rules = []
    for r in mock_rules:
        new_rule = Rule(
            policy_id=policy_id,
            name=r["name"],
            description=r["description"],
            severity=r["severity"],
            condition=r["condition"],
            sql_query=r["sql"],
            target_table=r["target_table"]
        )
        db.add(new_rule)
        added_rules.append(new_rule)
    
    db.commit()
    
    return {"message": "Rules extracted", "rules_count": len(added_rules)}

@router.get("/policies/rules")
async def get_all_rules(db: Session = Depends(get_db)):
    """Get all rules in the system."""
    return db.query(Rule).all()

@router.get("/policies/latest")
async def get_latest_policy(db: Session = Depends(get_db)):
    """Get the most recently uploaded policy."""
    policy = db.query(Policy).order_by(Policy.id.desc()).first()
    if not policy:
        return None
    return policy

@router.delete("/policies/{policy_id}")
async def delete_policy(policy_id: int, db: Session = Depends(get_db)):
    """Delete a policy and its rules."""
    policy = db.query(Policy).get(policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    
    # Cascade delete is handled by DB if configured, otherwise manual
    db.query(Rule).filter(Rule.policy_id == policy_id).delete()
    db.delete(policy)
    db.commit()
    return {"message": "Policy and associated rules deleted"}

@router.get("/policies/{policy_id}/rules")
async def get_policy_rules(policy_id: int, db: Session = Depends(get_db)):
    """Get all rules extracted for a specific policy."""
    rules = db.query(Rule).filter(Rule.policy_id == policy_id).all()
    return rules
