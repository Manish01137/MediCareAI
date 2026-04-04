from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path

from app.config import settings
from app.models.database import create_tables, SessionLocal, User
from app.services.auth import hash_password
from app.routers import auth, reports, messages, users

app = FastAPI(
    title="MediClear AI API",
    description="Medical Report Intelligence Platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,     prefix="/api")
app.include_router(reports.router,  prefix="/api")
app.include_router(messages.router, prefix="/api")
app.include_router(users.router,    prefix="/api")

Path(settings.UPLOAD_DIR).mkdir(exist_ok=True)

@app.on_event("startup")
def startup():
    create_tables()
    _seed()
    print("\n✅ MediClear AI backend running")
    print("📖 API docs → http://localhost:8000/api/docs\n")

def _seed():
    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == "rahul@example.com").first():
            return
        db.add_all([
            User(email="rahul@example.com",  hashed_password=hash_password("patient123"), full_name="Rahul Sharma",    role="patient", date_of_birth="1991-03-15", blood_type="O+",  phone="+91 98765 43210"),
            User(email="doctor@example.com", hashed_password=hash_password("doctor123"),  full_name="Dr. Priya Menon", role="doctor",  specialty="Internal Medicine", hospital="Apollo Hospital, Bangalore", license_number="KA-MED-2015-04821"),
        ])
        db.commit()
        print("✅ Demo users seeded")
    except Exception as e:
        print(f"Seed error: {e}")
    finally:
        db.close()

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "MediClear AI"}

@app.get("/")
def root():
    return {"message": "MediClear AI — visit /api/docs"}
