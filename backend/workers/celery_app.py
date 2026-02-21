import os
from celery import Celery
from core.config import settings

# Initialize Celery using Redis as the message broker
# Adjust broker_url to Redis URL
celery_app = Celery(
    "compliance_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

# Load task modules from all registered Django app configs or explicit imports
celery_app.autodiscover_tasks(['workers'])

@celery_app.task
def verify_worker():
    return "Celery worker is running!"
