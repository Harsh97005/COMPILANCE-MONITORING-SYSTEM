import uvicorn
import subprocess
import time
import threading

def start_celery():
    subprocess.run(["celery", "-A", "workers.celery_app", "worker", "--loglevel=info"], check=True)

if __name__ == "__main__":
    # In a real environment, you run these as separate services.
    # For local development without docker, we start both here if needed,
    # or you can just run this script for the API, and start celery in a separate terminal.
    print("Starting FastAPI Backend...")
    # celery_thread = threading.Thread(target=start_celery)
    # celery_thread.daemon = True
    # celery_thread.start()
    
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
