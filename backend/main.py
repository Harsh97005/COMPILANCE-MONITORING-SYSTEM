from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routers import policies, scans, violations, databases
from core.database import engine, Base
import models.domain

# Create tables if not using migrations directly for MVP speed
print("Creating database tables...")
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ComplianceOS Backend",
    description="Scalable Policy Compliance Backend System API",
    version="1.0.0"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(policies.router, prefix="/api/v1", tags=["Policies"])
app.include_router(scans.router, prefix="/api/v1", tags=["Scans"])
app.include_router(violations.router, prefix="/api/v1", tags=["Violations"])
app.include_router(databases.router, prefix="/api/v1", tags=["Databases"])

from core.scheduler import start_scheduler

@app.on_event("startup")
async def startup_event():
    start_scheduler()

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
