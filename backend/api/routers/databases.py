from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from core.database import get_db
from models.domain import DatabaseConnection
import os
import shutil

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter()

class DatabaseCreate(BaseModel):
    name: str
    db_type: str
    connection_url: str

class DatabaseResponse(BaseModel):
    id: int
    name: str
    db_type: str
    connection_url: str
    is_active: bool

    class Config:
        from_attributes = True

@router.post("/databases", response_model=DatabaseResponse)
async def create_database_connection(db_info: DatabaseCreate, db: Session = Depends(get_db)):
    """Create a new target database connection record."""
    new_conn = DatabaseConnection(
        name=db_info.name,
        db_type=db_info.db_type,
        connection_url=db_info.connection_url,
        is_active=False
    )
    db.add(new_conn)
    db.commit()
    db.refresh(new_conn)
    return new_conn

@router.get("/databases", response_model=List[DatabaseResponse])
async def list_database_connections(db: Session = Depends(get_db)):
    """List all saved target database connections."""
    return db.query(DatabaseConnection).all()

@router.post("/databases/upload_csv", response_model=DatabaseResponse)
async def upload_csv_database(
    name: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload a CSV file as a target database connection."""
    try:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        new_conn = DatabaseConnection(
            name=name,
            db_type="csv",
            connection_url=file_path,
            is_active=False
        )
        db.add(new_conn)
        db.commit()
        db.refresh(new_conn)
        return new_conn
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.patch("/databases/{db_id}/activate")
async def activate_database_connection(db_id: int, db: Session = Depends(get_db)):
    """Set a specific database connection as the 'active' target for scans."""
    # Deactivate all others first
    db.query(DatabaseConnection).update({DatabaseConnection.is_active: False})
    
    conn = db.query(DatabaseConnection).get(db_id)
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    conn.is_active = True
    db.commit()
    return {"message": f"Connection '{conn.name}' is now active"}

@router.delete("/databases/{db_id}")
async def delete_database_connection(db_id: int, db: Session = Depends(get_db)):
    """Remove a database connection record."""
    conn = db.query(DatabaseConnection).get(db_id)
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    db.delete(conn)
    db.commit()
    return {"message": "Connection deleted"}
