from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Index, JSON
from sqlalchemy.sql import func
from core.database import Base

class Policy(Base):
    __tablename__ = "policies"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending, processing, completed, failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Rule(Base):
    __tablename__ = "rules"

    id = Column(Integer, primary_key=True, index=True)
    policy_id = Column(Integer, ForeignKey("policies.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String, default="medium")  # low, medium, high, critical
    condition = Column(Text, nullable=True) # Logical condition e.g. "created_date > '2022-01-01'"
    sql_query = Column(Text, nullable=False) # Precompiled executable SQL
    target_table = Column(String, nullable=False) # The table this rule applies to
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Violation(Base):
    __tablename__ = "violations"

    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(Integer, ForeignKey("rules.id", ondelete="CASCADE"), nullable=False)
    table_name = Column(String, nullable=False)
    record_id = Column(String, nullable=False) # ID of the offending row in the target DB
    metadata_json = Column(JSON, nullable=True) # Supporting details
    detected_at = Column(DateTime(timezone=True), server_default=func.now())

    # Critical Indexes for Scale
    __table_args__ = (
        Index("idx_violations_rule_id", rule_id),
        Index("idx_violations_table_name", table_name),
        Index("idx_violations_detected_at", detected_at),
        Index("idx_violations_unique_lookup", rule_id, table_name, record_id, unique=True), # Prevent duplicate violations per rule
    )

class ScanJob(Base):
    __tablename__ = "scan_jobs"

    id = Column(Integer, primary_key=True, index=True)
    table_name = Column(String, nullable=False)
    status = Column(String, default="running") # running, completed, failed
    records_scanned = Column(Integer, default=0)
    violations_found = Column(Integer, default=0)
    progress = Column(Integer, default=0) # 0 to 100
    start_time = Column(DateTime(timezone=True), server_default=func.now())
    end_time = Column(DateTime(timezone=True), nullable=True)

class DatabaseConnection(Base):
    __tablename__ = "database_connections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    db_type = Column(String, nullable=False)  # postgres, mysql, sqlite
    connection_url = Column(String, nullable=False)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
