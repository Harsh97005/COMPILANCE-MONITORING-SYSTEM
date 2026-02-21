# AI‑Powered Compliance Monitoring System

Automated policy compliance monitoring system with AI-driven rule extraction and scalable database scanning.

## Overview

This project is an AI‑powered, software‑only Compliance Monitoring System designed to automatically analyze compliance policies and monitor structured databases to detect policy violations in an accurate, explainable, and scalable manner.

In many organizations, compliance requirements and business rules are stored as unstructured PDF documents, while operational data exists in structured databases. Manually interpreting policies and validating data is slow, error‑prone, and does not scale as data volumes grow. This project addresses that gap by bridging unstructured policy documents and structured enterprise data through automated rule extraction and continuous monitoring.

The system ingests free‑text PDF policy documents such as AML, GDPR, or internal business policies. Using AI-based techniques, it extracts actionable compliance rules and converts them into structured, machine‑readable formats. These rules are applied to transactional data where a rule engine scans the data efficiently, detects violations, and generates explainable reports.

## Key Features

- **PDF Policy Ingestion**: Automated rule extraction from unstructured documents.
- **Rule Generation**: Machine-readable compliance rule generation.
- **Database Scanning**: Efficient detection of compliance violations.
- **Transparent Reporting**: Explainable reports showing which rule was violated and why.
- **Integrated Dashboard**: Clear visualization of compliance health and insights.
- **Scalable Architecture**: Modular backend designed for millions of records.

## Tech Stack

- **Frontend**: React (Vite)
- **Backend**: FastAPI
- **Worker/Tasks**: Celery & Redis
- **Database**: PostgreSQL
- **Orchestration**: Docker Compose

---

## Quick Start (Docker)

The easiest way to run the entire system is using Docker Compose.

1.  **Clone the repository** (if you haven't already).
2.  **Run Docker Compose**:
    ```bash
    docker-compose up --build
    ```
3.  **Access the System**:
    - **Frontend**: [http://localhost:5173](http://localhost:5173)
    - **API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

## Services Included

- **Frontend**: React dashboard for policy analysis and monitoring.
- **API**: FastAPI backend for rule management and scan orchestration.
- **Worker**: Celery background worker for high-performance scanning.
- **Redis**: Message broker for the scanner.
- **App Database**: PostgreSQL for system metadata.
- **Target Database**: PostgreSQL instance representing the company data to be monitored.

## Manual Setup (Development)

If you prefer to run services manually, follow the instructions in the `backend/` and `frontend/` directories.
