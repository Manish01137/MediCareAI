from sqlalchemy import create_engine, Column, String, Integer, Boolean, DateTime, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime
import uuid, enum
from app.config import settings

engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def gen_id(): return str(uuid.uuid4())

class UserRole(str, enum.Enum):
    patient = "patient"
    doctor  = "doctor"

class ReportStatus(str, enum.Enum):
    pending  = "pending"
    reviewed = "reviewed"
    flagged  = "flagged"

class User(Base):
    __tablename__ = "users"
    id              = Column(String, primary_key=True, default=gen_id)
    email           = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name       = Column(String, nullable=False)
    role            = Column(SAEnum(UserRole), default=UserRole.patient)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    date_of_birth   = Column(String, nullable=True)
    blood_type      = Column(String, nullable=True)
    phone           = Column(String, nullable=True)
    specialty       = Column(String, nullable=True)
    hospital        = Column(String, nullable=True)
    license_number  = Column(String, nullable=True)
    reports_as_patient = relationship("Report", foreign_keys="Report.patient_id", back_populates="patient")
    reviews            = relationship("Report", foreign_keys="Report.reviewed_by_id", back_populates="reviewing_doctor")
    messages_sent      = relationship("Message", foreign_keys="Message.sender_id",   back_populates="sender")
    messages_received  = relationship("Message", foreign_keys="Message.receiver_id", back_populates="receiver")

class Report(Base):
    __tablename__ = "reports"
    id             = Column(String, primary_key=True, default=gen_id)
    patient_id     = Column(String, ForeignKey("users.id"), nullable=False)
    reviewed_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    report_type    = Column(String, nullable=False)
    file_name      = Column(String, nullable=False)
    file_path      = Column(String, nullable=True)
    file_size      = Column(Integer, nullable=True)
    status         = Column(SAEnum(ReportStatus), default=ReportStatus.pending)
    uploaded_at    = Column(DateTime, default=datetime.utcnow)
    reviewed_at    = Column(DateTime, nullable=True)
    raw_text       = Column(Text, nullable=True)
    ai_summary     = Column(Text, nullable=True)
    ai_explanation = Column(Text, nullable=True)
    ai_tips        = Column(Text, nullable=True)
    lab_values     = Column(Text, nullable=True)
    doctor_note    = Column(Text, nullable=True)
    is_flagged     = Column(Boolean, default=False)
    flag_reason    = Column(Text, nullable=True)
    patient          = relationship("User", foreign_keys=[patient_id],     back_populates="reports_as_patient")
    reviewing_doctor = relationship("User", foreign_keys=[reviewed_by_id], back_populates="reviews")

class Message(Base):
    __tablename__ = "messages"
    id          = Column(String, primary_key=True, default=gen_id)
    sender_id   = Column(String, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(String, ForeignKey("users.id"), nullable=False)
    report_id   = Column(String, ForeignKey("reports.id"), nullable=True)
    content     = Column(Text, nullable=False)
    is_read     = Column(Boolean, default=False)
    created_at  = Column(DateTime, default=datetime.utcnow)
    sender   = relationship("User", foreign_keys=[sender_id],   back_populates="messages_sent")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="messages_received")

def create_tables():
    Base.metadata.create_all(bind=engine)
