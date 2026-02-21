# ComplianceOS - Backend Service

This directory contains the FastAPI-based backend for the ComplianceOS system, responsible for policy management, rule execution, and violation tracking.

## Architecture Highlights
* **Web Framework:** FastAPI for high-performance async API endpoints.
* **Database:** PostgreSQL accessed via SQLAlchemy ORM. Rules contain precompiled SQL.
* **Task Queue:** Celery with Redis broker for asynchronous background scanning.
* **Horizontal Scalability:** The `engine/scanner.py` executes dynamically constructed SQL directly against target DB instances—eliminating the need to load million-row datasets into application memory. 

## Getting Started

### 1. Start Dependencies (Database & Redis)
You need Docker installed to spin up the local PostgreSQL and Redis instances.
```bash
docker-compose up -d
```

### 2. Environment Setup
Create a `.env` file or use the defaults in `core/config.py`. Next, setup our python venv and install requirements:
```bash
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Initialize Database Tables
For the MVP, you can rely on SQLAlchemy's `create_all`, or run Alembic migrations:
```bash
alembic upgrade head
```
*(Currently relying on `create_all` disabled in `main.py`, uncomment for auto creation)*

### 4. Run the API Server
Start the Uvicorn server:
```bash
python run.py
```
Or directly:
```bash
uvicorn main:app --reload
```
View the Swagger API docs at `http://127.0.0.1:8000/docs`

### 5. Run the Celery Worker
In a separate terminal, to process asynchronous scans:
```bash
.\venv\Scripts\activate
celery -A workers.celery_app worker --loglevel=info -P solo
```
*(Use `-P solo` on Windows if standard multiprocessing fails)*
