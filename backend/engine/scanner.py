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
    
    def execute_rule(self, rule_id: int, table_name: str, sql_query: str):
        """
        Executes a precompiled SQL query directly against the target database.
        Uses a generator to stream results for memory efficiency on 1M+ row tables.
        """
        if self.db_type == "csv":
            # In CSV mode, replace the generic mock table names with the actual CSV table
            # E.g., replace 'expenses' with actual df table name.
            # Use double quotes for the table name to handle hyphens/spaces
            quoted_table = f'"{self.csv_table_name}"'
            sql_query = sql_query.replace('FROM expenses', f'FROM {quoted_table}')
            sql_query = sql_query.replace('FROM travel_bookings', f'FROM {quoted_table}')
            sql_query = sql_query.replace('FROM invoices', f'FROM {quoted_table}')
            
            logger.info(f"Executing Rule {rule_id} on CSV table {self.csv_table_name}")
        else:
            logger.info(f"Executing Rule {rule_id} on table {table_name}")
            
        try:
            with self.target_engine.connect() as conn:
                # Use execution_options to stream results if the driver supports it
                # SQLite memory might not stream well, but this is MVP structure
                result = conn.execution_options(stream_results=True).execute(text(sql_query))
                
                # Fetch only necessary identifiers in batches of 1000
                batch = []
                for row in result:
                    # Depending on column count, construct metadata
                    metadata = dict(row._mapping)
                    # Try common ID columns
                    record_id = "unknown"
                    for id_col in ['id', 'vendor_id', 'bank_id', 'account_number', 'entity_id', 'record_id']:
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
            # Instead of crashing, just yield an empty list for this rule
            # to let other rules process if we are demonstrating with mock SQL
            yield []

    def save_violations(self, rule_id: int, table_name: str, violations_generator):
        """
        Saves violations in chunks from the generator to prevent memory bloat.
        """
        total_saved = 0
        app_db = SessionLocal()
        try:
            for batch in violations_generator:
                logger.info(f"Saving batch of {len(batch)} violations for Rule {rule_id}")
                objects_to_insert = [
                    Violation(
                        rule_id=rule_id,
                        table_name=table_name,
                        record_id=v["record_id"],
                        metadata_json=v["metadata"]
                    ) for v in batch
                ]
                
                app_db.bulk_save_objects(objects_to_insert)
                app_db.commit()
                total_saved += len(batch)
                
            return total_saved
        except Exception as e:
            app_db.rollback()
            logger.error(f"Bulk insert failed: {e}")
            raise
        finally:
            app_db.close()

    def cleanup(self):
        """Cleanup temporary resources."""
        if hasattr(self, 'temp_db_path') and os.path.exists(self.temp_db_path):
            try:
                os.remove(self.temp_db_path)
                logger.info(f"Cleaned up temporary DB: {self.temp_db_path}")
            except Exception as e:
                logger.error(f"Failed to cleanup temp DB: {e}")
