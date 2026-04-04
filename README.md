# MediClear AI — Medical Report Intelligence Platform

AI-powered medical lab report analysis with patient and doctor dashboards.

## Features

- **Patient Dashboard** — Upload lab reports (PDF/image), get AI analysis in plain English, visual lab value bars, health tips, analytics charts
- **Doctor Dashboard** — Review all patient reports, add clinical notes, flag urgent cases, message patients
- **AI Analysis** — GPT-4o reads the report and returns structured lab values, a professional summary, a patient-friendly explanation, and actionable health tips
- **Secure Messaging** — Encrypted patient-doctor chat linked to reports
- **Auth** — JWT access + refresh tokens, role-based routing (patient / doctor)
- **OCR** — Extracts text from scanned PDF and image reports (requires Tesseract)

---

## Quick Start

```bash
git clone <repo>
cd mediclear
./start.sh        # Mac / Linux
```

Windows:
```cmd
cd backend
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env    # then edit .env
uvicorn main:app --reload --port 8000

# new terminal
cd frontend
npm install --legacy-peer-deps
npm run dev
```

---

## Manual Setup

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env → set OPENAI_API_KEY
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

---

## Environment Variables (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes (for real AI) | Your OpenAI API key — get one at platform.openai.com |
| `SECRET_KEY` | Yes in production | Random 64-char string for JWT signing |
| `DATABASE_URL` | No | Defaults to SQLite. Use PostgreSQL URL for production |
| `UPLOAD_DIR` | No | Where uploaded files are stored (default: `uploads/`) |
| `MAX_FILE_SIZE_MB` | No | Max upload size (default: 10MB) |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |

**Without OPENAI_API_KEY:** The app still works fully — it uses a built-in demo analysis engine that returns realistic results based on the filename (e.g. a file named `lipid_panel.pdf` returns a lipid panel analysis).

---

## URLs

| URL | Description |
|---|---|
| http://localhost:3000 | React frontend app |
| http://localhost:8000/api/docs | Interactive API docs (Swagger UI) |
| http://localhost:8000/api/redoc | ReDoc API docs |
| http://localhost:8000/api/health | Health check endpoint |

---

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Patient | rahul@example.com | patient123 |
| Doctor | doctor@example.com | doctor123 |

---

## Project Structure

```
mediclear/
├── start.sh                      ← one-command startup
├── README.md
│
├── backend/
│   ├── main.py                   ← FastAPI app entry point
│   ├── requirements.txt
│   ├── .env.example              ← copy to .env
│   └── app/
│       ├── config.py             ← all settings via pydantic-settings
│       ├── models/
│       │   ├── database.py       ← SQLAlchemy models (User, Report, Message)
│       │   └── schemas.py        ← Pydantic request/response schemas
│       ├── services/
│       │   ├── auth.py           ← JWT creation, hashing, dependencies
│       │   └── ai_analysis.py    ← GPT-4o + OCR + demo fallback
│       └── routers/
│           ├── auth.py           ← /api/auth/* endpoints
│           ├── reports.py        ← /api/reports/* endpoints
│           ├── messages.py       ← /api/messages/* endpoints
│           └── users.py          ← /api/users/* endpoints
│
└── frontend/
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── App.jsx               ← routes
        ├── main.jsx              ← entry point
        ├── index.css             ← global CSS variables + animations
        ├── api/index.js          ← all API calls + axios interceptors
        ├── hooks/useAuth.jsx     ← auth context + login/logout/register
        ├── components/
        │   ├── UI.jsx            ← Card, Button, Badge, LabBar, StatCard…
        │   ├── Navbar.jsx        ← top nav with role badge
        │   └── ReportCard.jsx    ← expandable report with AI analysis
        └── pages/
            ├── Login.jsx
            ├── Register.jsx
            ├── patient/
            │   ├── Layout.jsx    ← auth guard + nav
            │   ├── Overview.jsx  ← stats + latest report
            │   ├── Upload.jsx    ← drag-drop upload + polling
            │   ├── MyReports.jsx ← filterable report list
            │   ├── Analytics.jsx ← recharts (bar, pie, horizontal bar)
            │   └── Messages.jsx  ← patient-doctor chat
            └── doctor/
                ├── Layout.jsx
                ├── Overview.jsx  ← stats + pending queue
                ├── Reports.jsx   ← review panel with lab bars
                ├── Patients.jsx  ← patient cards
                └── Messages.jsx  ← doctor-patient chat
```

---

## API Endpoints

### Auth
- `POST /api/auth/register` — create account
- `POST /api/auth/login` — get JWT tokens
- `POST /api/auth/refresh` — refresh access token
- `GET  /api/auth/me` — current user info

### Reports
- `POST /api/reports/upload` — upload lab report (patient only)
- `GET  /api/reports/my` — my reports (patient)
- `GET  /api/reports/all` — all reports (doctor)
- `GET  /api/reports/{id}` — single report
- `POST /api/reports/{id}/review` — add note + status (doctor)
- `GET  /api/reports/stats/patient` — patient stats
- `GET  /api/reports/stats/doctor` — doctor stats

### Messages
- `POST /api/messages/send` — send message
- `GET  /api/messages/inbox` — received messages
- `GET  /api/messages/thread/{user_id}` — conversation thread
- `POST /api/messages/{id}/read` — mark as read
- `GET  /api/messages/doctors` — list all doctors (for patients)

### Users
- `GET   /api/users/me` — profile
- `PATCH /api/users/me` — update profile
- `GET   /api/users/patients` — all patients (doctor)
- `GET   /api/users/{id}` — user by ID

---

## Tech Stack

**Backend:** FastAPI · SQLAlchemy · SQLite/PostgreSQL · JWT · Passlib/bcrypt · OpenAI GPT-4o · PyMuPDF · Tesseract OCR

**Frontend:** React 18 · Vite · React Router v6 · Axios · Recharts · React Hot Toast · Lucide React
