from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from core.database import SessionLocal
from models.domain import Violation
import logging

import pandas as pd
import sqlite3
import tempfile
import os

logger = logging.getLogger(__name__)

class RuleEngine:
    def __init__(self, target_db_url: str, db_type: str = "postgres"):
        """
        Initializes the Rule Engine to connect to the target database directly.
        This allows executing checks without loading target data into memory.
        """
        self.db_type = db_type
        self.target_db_url = target_db_url
        
        if db_type == "csv":
            # For CSV, use a temporary file-based SQLite database instead of in-memory.
            # In-memory SQLite databases are destroyed when the connection closes, 
            # causing data loss between to_sql and execute_rule.
            self.temp_db = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
            self.temp_db_path = self.temp_db.name
            self.temp_db.close()
            
            logger.info(f"Loading CSV into temporary SQLite DB: {self.temp_db_path}")
            self.target_engine = create_engine(f'sqlite:///{self.temp_db_path}')
            
            # Use chunked reading for large files to avoid OOM
            # For simplicity in this demo, we read all, but with logging
            try:
                df = pd.read_csv(target_db_url)
                logger.info(f"CSV read complete: {len(df)} rows found.")
                
                # Create a generic 'data' table or use the filename
                table_name = target_db_url.split('/')[-1].split('\\')[-1].split('.')[0]
                # Clean up col names for SQLite
                df.columns = [c.replace(' ', '_').lower() for c in df.columns]
                
                logger.info(f"Writing CSV data to table '{table_name}'...")
                df.to_sql(table_name, self.target_engine, index=True, index_label='id', if_exists='replace')
                self.csv_table_name = table_name
                logger.info(f"Temporary database initialization complete.")
            except Exception as e:
                logger.error(f"Failed to load CSV: {e}")
                raise
        else:
            self.target_engine = create_engine(target_db_url)
            
    def ensure_index(self, table_name: str, column_name: str):
        """Ensures an index exists on the target table for performance."""
        try:
            with self.target_engine.connect() as conn:
                index_name = f"idx_{table_name}_{column_name}"
                if self.db_type == "postgres":
                    conn.execute(text(f"CREATE INDEX IF NOT EXISTS {index_name} ON {table_name} ({column_name})"))
                    logger.info(f"Ensured index {index_name} exists.")
                elif self.db_type == "sqlite" or self.db_type == "csv":
                    # SQLite syntax is slightly different
                    conn.execute(text(f"CREATE INDEX IF NOT EXISTS {index_name} ON {table_name} ({column_name})"))
                    logger.info(f"Ensured index {index_name} exists on SQLite.")
        except Exception as e:
            logger.warning(f"Could not create index {column_name} on {table_name}: {e}")
            
    def get_record_count(self, table_name: str) -> int:
        if self.db_type == "csv":
            table_to_use = self.csv_table_name
        else:
            table_to_use = table_name
            
        try:
            with self.target_engine.connect() as conn:
                # Use double quotes for table name to handle hyphens/spaces
                count = conn.execute(text(f'SELECT COUNT(*) FROM "{table_to_use}"')).scalar()
                return count if count else 0
        except Exception as e:
            logger.error(f"Failed to get record count: {e}")
            return 0
    
    def execute_rule(self, rule_id: int, table_name: str, sql_query: str, condition: str = None):
        """
        Executes a query directly against the target database.
        If condition is provided, it generates a SELECT query for the target table.
        Uses a generator to stream results for memory efficiency on 1M+ row tables.
        """
        if condition and not sql_query:
            # Simple translation: Convert condition into a full SQL query
            sql_query = f'SELECT * FROM "{table_name}" WHERE {condition}'
            logger.info(f"Translated condition to SQL: {sql_query}")

        if self.db_type == "csv":
            # In CSV mode, replace the generic mock table names with the actual CSV table
            quoted_table = f'"{self.csv_table_name}"'
            sql_query = sql_query.replace('FROM expenses', f'FROM {quoted_table}')
            sql_query = sql_query.replace('FROM travel_bookings', f'FROM {quoted_table}')
            sql_query = sql_query.replace('FROM invoices', f'FROM {quoted_table}')
            sql_query = sql_query.replace('FROM bank_accounts', f'FROM {quoted_table}')
            sql_query = sql_query.replace(f'FROM "{table_name}"', f'FROM {quoted_table}')
            
            logger.info(f"Executing Rule {rule_id} on CSV table {self.csv_table_name}")
        else:
            logger.info(f"Executing Rule {rule_id} on table {table_name}")
            
        try:
            with self.target_engine.connect() as conn:
                # Use execution_options to stream results if the driver supports it
                result = conn.execution_options(stream_results=True).execute(text(sql_query))
                
                # Fetch only necessary identifiers in batches of 1000
                batch = []
                for row in result:
                    metadata = dict(row._mapping)
                    # Try common ID columns
                    record_id = "unknown"
                    for id_col in ['id', 'user_id', 'vendor_id', 'bank_id', 'account_number', 'entity_id', 'record_id']:
                        if id_col in metadata:
                            record_id = str(metadata[id_col])
                            break
                    batch.append({"record_id": record_id, "metadata": metadata})
                    if len(batch) >= 1000:
                        yield batch
                        batch = []
                
                if batch:
                    yield batch
                    
        except Exception as e:
            logger.error(f"Failed to execute rule {rule_id}: {e}")
            yield []

    def save_violations(self, rule_id: int, table_name: str, violations_generator):
        """
        Saves violations in chunks from the generator.
        Prevents duplicates using a lookup check.
        """
        total_saved = 0
        app_db = SessionLocal()
        try:
            for batch in violations_generator:
                if not batch:
                    continue
                    
                logger.info(f"Processing batch of {len(batch)} potential violations for Rule {rule_id}")
                
                # Filter out existing violations to avoid unique constraint errors
                # For 1M+ rows, we check in manageable chunks
                record_ids = [v["record_id"] for v in batch]
                existing = app_db.query(Violation.record_id).filter(
                    Violation.rule_id == rule_id,
                    Violation.table_name == table_name,
                    Violation.record_id.in_(record_ids)
                ).all()
                existing_ids = {r[0] for r in existing}
                
                new_violations = [v for v in batch if v["record_id"] not in existing_ids]
                
                if not new_violations:
                    continue

                objects_to_insert = [
                    Violation(
                        rule_id=rule_id,
                        table_name=table_name,
                        record_id=v["record_id"],
                        metadata_json=v["metadata"]
                    ) for v in new_violations
                ]
                
                app_db.bulk_save_objects(objects_to_insert)
                app_db.commit()
                total_saved += len(new_violations)
                logger.info(f"Saved {len(new_violations)} new violations (Skipped {len(batch) - len(new_violations)} duplicates)")
                
            return total_saved
        except Exception as e:
            app_db.rollback()
            logger.error(f"Bulk insert failed: {e}")
            raise
        finally:
            app_db.close()

def scan_users_for_rule(rule_id: int):
    """
    Service function to scan users for a specific rule.
    Optimized for large datasets.
    """
    db = SessionLocal()
    try:
        from models.domain import Rule, DatabaseConnection
        rule = db.query(Rule).get(rule_id)
        if not rule:
            logger.error(f"Rule {rule_id} not found")
            return 0
            
        # Get active database connection
        active_conn = db.query(DatabaseConnection).filter(DatabaseConnection.is_active == True).first()
        if not active_conn:
            logger.error("No active database connection found")
            return 0
            
        engine = RuleEngine(target_db_url=active_conn.connection_url, db_type=active_conn.db_type)
        
        logger.info(f"Starting standalone scan for Rule {rule.id} on table {rule.target_table}")
        
        violations_generator = engine.execute_rule(
            rule.id, 
            rule.target_table, 
            rule.sql_query, 
            condition=getattr(rule, 'condition', None)
        )
        
        saved_count = engine.save_violations(rule.id, rule.target_table, violations_generator)
        
        logger.info(f"Finished standalone scan: {saved_count} violations created.")
        return saved_count
    except Exception as e:
        logger.error(f"Error in scan_users_for_rule: {e}")
        return 0
    finally:
        db.close()

    def cleanup(self):
        """Cleanup temporary resources."""
        if hasattr(self, 'temp_db_path') and os.path.exists(self.temp_db_path):
            try:
                os.remove(self.temp_db_path)
                logger.info(f"Cleaned up temporary DB: {self.temp_db_path}")
            except Exception as e:
                logger.error(f"Failed to cleanup temp DB: {e}")
