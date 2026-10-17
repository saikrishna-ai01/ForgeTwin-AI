
# ForgeTwin AI

## Intelligent Manufacturing Operations & Digital Twin Platform

ForgeTwin AI is an AI-powered manufacturing operations platform that combines machine telemetry, interactive digital-twin visualization, machine-health assessment, anomaly detection, predictive maintenance, energy intelligence, incident management, and an evidence-grounded AI Operations Copilot.

The platform follows a human-in-the-loop operating principle:

**Sensors generate evidence → Analytics detect patterns → AI explains and assists → Operators make decisions.**

ForgeTwin AI is an operational decision-support platform. It does not autonomously control factory equipment.

---

## Table of Contents

- [Overview](#overview)
- [Core Capabilities](#core-capabilities)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Telemetry Simulation](#telemetry-simulation)
- [API Documentation](#api-documentation)
- [Configuration](#configuration)
- [Testing and Build](#testing-and-build)
- [Troubleshooting](#troubleshooting)
- [Safety and Limitations](#safety-and-limitations)
- [Future Enhancements](#future-enhancements)

---

## Overview

Manufacturing equipment generates operational telemetry such as:

- Temperature
- Vibration
- Power consumption
- Rotational speed (RPM)
- Machine operating status

ForgeTwin AI processes this information to help operators identify abnormal operating conditions, understand machine health, prioritize maintenance, monitor energy consumption, and investigate incidents.

The platform combines rule-based assessments, anomaly-detection services, historical telemetry, and AI-assisted explanations.

## Core Capabilities

### 1. Real-Time Plant Monitoring

The dashboard presents an operational overview of the manufacturing environment, including machine status, health, active incidents, and power consumption.

Telemetry is supplied through the backend API and can be generated locally using the included simulator.

### 2. Interactive Digital Twin

The Digital Twin provides a visual representation of manufacturing equipment.

Operators can select machines and inspect operational information, health assessments, telemetry, and maintenance-related indicators.

### 3. Machine Health Assessment

The machine-health service evaluates telemetry using configured operational thresholds.

The assessment considers:

- Temperature
- Vibration
- Power consumption
- RPM

The resulting health score and status support operational triage. Exact thresholds and scoring rules are defined by the backend implementation.

### 4. Machine-Learning Anomaly Detection

The anomaly service analyzes telemetry for potentially abnormal operating patterns.

Anomaly assessments can contribute to maintenance prioritization and incident investigation. Detection results should be interpreted alongside the underlying telemetry and configured model behaviour.

### 5. Predictive Maintenance Support

The maintenance service combines available machine-health and anomaly evidence to recommend inspection or maintenance actions.

Recommendations support operator decisions; they are not guarantees of future equipment failure.

### 6. Energy Intelligence

The Energy Intelligence interface presents available power-consumption data and energy analytics for selected machines.

Depending on the data returned by the backend, operators can review current or last-known readings, average and peak power, estimated energy consumption, and consumption indicators.

A last-known reading must not be interpreted as proof that a machine is currently operating.

### 7. Incident Management

The Incident Center provides visibility into operational incidents, including severity, status, and associated machine evidence.

The backend incident service manages incident lifecycle operations. Incident history is retained according to the configured database and application logic.

### 8. AI Operations Copilot

The Copilot answers operational questions using machine-specific evidence supplied by the backend.

It is designed to help operators investigate machine health, sensor abnormalities, anomaly assessments, active incidents, and maintenance recommendations.

AI-generated explanations should be checked against the displayed evidence. The Copilot does not replace engineering judgment or safety procedures.

---

## Technology Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Lucide React
- Three.js
- React Three Fiber / Drei

### Backend

- Python
- FastAPI
- Uvicorn
- SQLAlchemy
- Pydantic

### Data and Analytics

- PostgreSQL
- Machine-health assessment services
- Anomaly-detection service
- Maintenance-priority service
- Incident lifecycle service
- Energy analytics endpoints

### AI and Visualization

- Evidence-grounded AI Operations Copilot
- Interactive 3D Digital Twin
- Telemetry charts and operational indicators

The exact installed versions are defined by the project dependency files.

---

## Architecture

```text
                         ForgeTwin AI
                              |
              +---------------+---------------+
              |                               |
        React Frontend                  FastAPI Backend
              |                               |
     +--------+---------+          +----------+----------+
     |        |         |          |          |          |
 Dashboard  Digital   Copilot   Machine    Telemetry   Incident
            Twin                 APIs       APIs       APIs
     |        |         |          |          |          |
     +--------+---------+----------+----------+----------+
                              |
                    Analytics and Services
                              |
              +---------------+----------------+
              |               |                |
         Health Engine   Anomaly Detection  Maintenance
              |               |                |
              +---------------+----------------+
                              |
                         PostgreSQL
                              ^
                              |
                     Telemetry Simulator
```

The simulator generates sample telemetry and submits it through the backend. The backend validates and processes requests, evaluates operational evidence, and persists applicable records.

---

## Project Structure

```text
ForgeTwin-AI/
├── backend/
│   ├── app/
│   │   ├── ai/
│   │   │   └── copilot_service.py
│   │   ├── api/
│   │   │   ├── copilot.py
│   │   │   ├── energy.py
│   │   │   ├── incidents.py
│   │   │   ├── machines.py
│   │   │   ├── operations.py
│   │   │   └── telemetry.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── database.py
│   │   ├── models/
│   │   │   ├── incident.py
│   │   │   ├── machine.py
│   │   │   └── telemetry.py
│   │   ├── schemas/
│   │   │   ├── dashboard.py
│   │   │   ├── health.py
│   │   │   └── machine.py
│   │   ├── services/
│   │   │   ├── anomaly_service.py
│   │   │   ├── incident_service.py
│   │   │   ├── machine_health.py
│   │   │   └── maintenance_service.py
│   │   └── main.py
│   ├── tests/
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── copilot/
│   │   │   ├── digital-twin/
│   │   │   ├── energy/
│   │   │   └── incidents/
│   │   ├── services/
│   │   ├── App.tsx
│   │   ├── App.css
│   │   └── index.css
│   ├── package.json
│   └── vite.config.ts
├── simulator/
│   └── telemetry_simulator.py
├── docs/
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## Prerequisites

Install the following tools before starting the application:

- Python compatible with the packages in `backend/requirements.txt`
- Node.js and npm
- Docker Desktop with Docker Compose
- PostgreSQL, provided through Docker Compose if configured that way

Verify the installations:

```powershell
python --version
node --version
npm --version
docker --version
docker compose version
```

---

## Installation

Run commands from the project root unless otherwise specified.

### 1. Start PostgreSQL

From `E:\ForgeTwin-AI`:

```powershell
docker compose up -d
docker compose ps
```

Confirm the database container is running before starting the backend.

The Compose configuration determines the database name, credentials, and port. Keep these values consistent with the backend environment configuration.

### 2. Configure the Backend

Navigate to the backend directory:

```powershell
cd E:\ForgeTwin-AI\backend
```

Create a virtual environment if one does not already exist:

```powershell
python -m venv venv
```

Activate it in PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Configure `backend/.env` with the database connection settings and any other environment variables required by `app/core/config.py` and `app/ai/copilot_service.py`.

Do not commit credentials, API keys, or production secrets.

### 3. Install Frontend Dependencies

Open another PowerShell terminal:

```powershell
cd E:\ForgeTwin-AI\frontend
npm install
```

The frontend currently uses the backend address:

```text
http://127.0.0.1:8001
```

Keep the frontend API configuration and backend port consistent.

---

## Running the Application

Start each component in a separate terminal.

### Terminal 1 — Database

```powershell
cd E:\ForgeTwin-AI
docker compose up -d
docker compose ps
```

### Terminal 2 — Backend

```powershell
cd E:\ForgeTwin-AI\backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

Once the server starts, open:

- API documentation: http://127.0.0.1:8001/docs
- ReDoc: http://127.0.0.1:8001/redoc

These documentation routes are available when enabled by the FastAPI application configuration.

### Terminal 3 — Frontend

```powershell
cd E:\ForgeTwin-AI\frontend
npm run dev
```

Open the local URL printed by Vite, commonly:

http://localhost:5173

Do not close the backend or database terminals while testing the application.

---

## Telemetry Simulation

The simulator generates telemetry for testing the operational pipeline.

Run it from the project root using the backend virtual environment's Python interpreter.

### Normal Operation

```powershell
cd E:\ForgeTwin-AI
.\backend\venv\Scripts\python.exe simulator\telemetry_simulator.py --mode normal
```

### Warning Condition

Open another terminal and run:

```powershell
cd E:\ForgeTwin-AI
.\backend\venv\Scripts\python.exe simulator\telemetry_simulator.py --mode warning
```

### Critical Condition

```powershell
cd E:\ForgeTwin-AI
.\backend\venv\Scripts\python.exe simulator\telemetry_simulator.py --mode critical
```

Use only one simulator process for the same machine at a time unless the simulator implementation explicitly supports concurrent producers.

Stop a running simulator with `Ctrl+C`.

The simulator supports the modes shown above. Its actual telemetry values, target machine, reporting interval, and API route are defined in `simulator/telemetry_simulator.py`.

---

## API Documentation

FastAPI provides an interactive API interface when the application is running:

http://127.0.0.1:8001/docs

The current API modules include:

| Module | Responsibility |
|---|---|
| `machines.py` | Machine-related operations |
| `telemetry.py` | Telemetry ingestion and retrieval |
| `operations.py` | Operational data and live machine information |
| `incidents.py` | Incident management |
| `energy.py` | Energy analytics |
| `copilot.py` | AI Operations Copilot |

Use the interactive API documentation to inspect the exact paths, request schemas, response formats, and available operations. Do not assume an endpoint exists unless it appears in the running API documentation or its source code.

---

## Configuration

Important configuration locations:

| File | Purpose |
|---|---|
| `backend/.env` | Local environment variables and secrets |
| `backend/app/core/config.py` | Backend settings |
| `backend/app/core/database.py` | Database connection and setup |
| `frontend/src/services/api.ts` | Frontend API utilities |
| `frontend/src/components/copilot/OperationsCopilot.tsx` | Copilot UI and request handling |
| `docker-compose.yml` | Container and database configuration |

Never publish `.env` files containing real credentials.

For deployment, configure the frontend and backend to use the appropriate environment-specific API URL. Do not expose private API keys in browser-side code.

---

## Testing and Build

### Frontend Production Build

From the frontend directory:

```powershell
cd E:\ForgeTwin-AI\frontend
npm run build
```

The build runs TypeScript project compilation followed by the Vite production build.

A successful build should finish without TypeScript or bundling errors. Vite may still report non-blocking bundle-size warnings.

### Backend Tests

From the backend directory:

```powershell
cd E:\ForgeTwin-AI\backend
.\venv\Scripts\Activate.ps1
python -m pytest
```

This command requires pytest and any project-specific test dependencies to be installed. A successful frontend build does not establish that backend tests pass.

### Manual Verification Checklist

- [ ] PostgreSQL starts successfully.
- [ ] The backend starts on port 8001.
- [ ] The frontend loads.
- [ ] Machine records appear in the dashboard.
- [ ] Telemetry updates when the simulator is running.
- [ ] Normal, warning, and critical simulator modes produce the expected operational changes.
- [ ] Incident creation, lifecycle transitions, and history behave as expected.
- [ ] Energy readings distinguish current data from last-known data.
- [ ] Copilot suggestions reflect the selected machine's status.
- [ ] Copilot responses display the evidence returned by the backend.

---

## Troubleshooting

### Backend Port Is Already in Use

Start the backend on port 8001 if port 8000 is occupied:

```powershell
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

Ensure the frontend calls the same port.

### Database Connection Failure

Check the container status:

```powershell
cd E:\ForgeTwin-AI
docker compose ps
docker compose logs
```

Verify the database settings in `backend/.env` and `backend/app/core/config.py`.

Do not delete Docker volumes or reset the database as a troubleshooting shortcut; doing so may remove persisted records.

### Frontend Cannot Reach the Backend

1. Confirm the backend is running.
2. Open `http://127.0.0.1:8001/docs`.
3. Check the API base URL in the frontend.
4. Inspect the browser developer console and network requests.
5. Check backend logs for errors.

If accessing the frontend from another computer, `127.0.0.1` refers to that computer, not the backend host.

### Copilot Request Fails

Check the backend logs, the Copilot API route, and the configuration used by `copilot_service.py`. If the service depends on an external AI provider, verify the required environment variables and provider quota.

Never put secret keys in frontend code or share them in screenshots.

### Telemetry Appears Stale

Confirm that the simulator is running, the ingestion requests succeed, and the machine's latest telemetry timestamp advances.

A stored reading is not necessarily a live reading. Check the timestamp and machine connectivity before interpreting sensor values as current.

### Frontend Build Reports a Large Chunk

Three.js and 3D visualization dependencies can produce large JavaScript chunks. Use the build report to identify the affected bundle and consider lazy loading or targeted code splitting. A chunk-size warning alone does not mean the build failed.

---

## Safety and Limitations

- ForgeTwin AI is a monitoring and decision-support application.
- Machine-health scores depend on configured thresholds and available telemetry.
- Anomaly detection may produce false positives or miss some abnormal conditions.
- Maintenance recommendations require validation by qualified personnel.
- Stale or missing telemetry must be treated as a data-availability issue, not proof of normal operation.
- The application is not a replacement for industrial safety controls, certified protection systems, or manufacturer maintenance procedures.
- The Digital Twin is a software representation and should not be assumed to be a physically calibrated simulation unless explicitly validated.

---

## Future Enhancements

Potential development directions include:

- Role-based authentication and access control
- Historical trend analysis and forecasting
- More robust model evaluation and anomaly explanations
- Maintenance scheduling and work-order integration
- Plant-level energy benchmarking
- Audit trails and operational reporting
- Automated testing and continuous integration
- Production deployment, monitoring, and security hardening

These are potential enhancements, not claims that the functionality is already implemented.

---

## Contributing

1. Create a feature branch.
2. Keep backend changes within the existing API, service, model, and schema structure.
3. Keep frontend changes consistent with the existing React and TypeScript architecture.
4. Run the relevant tests and frontend production build.
5. Document configuration changes and new API behaviour.

Do not commit secrets, local virtual environments, generated build artifacts, or database credentials.

---

## License

Add the applicable license and ownership information before distributing or publishing the project.

---

**ForgeTwin AI — Intelligent Manufacturing Operations & Digital Twin Platform**

AI-assisted insight. Evidence-based maintenance. Human-controlled operations.
