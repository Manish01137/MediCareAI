from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    patient = "patient"
    doctor  = "doctor"

class ReportStatus(str, Enum):
    pending  = "pending"
    reviewed = "reviewed"
    flagged  = "flagged"

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole = UserRole.patient
    date_of_birth: Optional[str] = None
    blood_type: Optional[str] = None
    phone: Optional[str] = None
    specialty: Optional[str] = None
    hospital: Optional[str] = None
    license_number: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: UserRole
    date_of_birth: Optional[str] = None
    blood_type: Optional[str] = None
    phone: Optional[str] = None
    specialty: Optional[str] = None
    hospital: Optional[str] = None
    license_number: Optional[str] = None
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut

class RefreshRequest(BaseModel):
    refresh_token: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    blood_type: Optional[str] = None
    phone: Optional[str] = None
    specialty: Optional[str] = None
    hospital: Optional[str] = None

class LabValue(BaseModel):
    val: float
    unit: str
    min: float
    max: float
    status: str

class ReportOut(BaseModel):
    id: str
    patient_id: str
    patient_name: Optional[str] = None
    report_type: str
    file_name: str
    file_size: Optional[int] = None
    status: ReportStatus
    uploaded_at: datetime
    reviewed_at: Optional[datetime] = None
    ai_summary: Optional[str] = None
    ai_explanation: Optional[str] = None
    ai_tips: Optional[List[str]] = None
    lab_values: Optional[Dict[str, Any]] = None
    doctor_note: Optional[str] = None
    is_flagged: bool = False
    flag_reason: Optional[str] = None
    reviewing_doctor_name: Optional[str] = None
    class Config:
        from_attributes = True

class ReviewRequest(BaseModel):
    doctor_note: str
    is_flagged: bool = False
    flag_reason: Optional[str] = None

class MessageCreate(BaseModel):
    receiver_id: str
    content: str
    report_id: Optional[str] = None

class MessageOut(BaseModel):
    id: str
    sender_id: str
    sender_name: Optional[str] = None
    receiver_id: str
    content: str
    report_id: Optional[str] = None
    is_read: bool
    created_at: datetime
    class Config:
        from_attributes = True

class PatientStats(BaseModel):
    total_reports: int
    pending_reports: int
    reviewed_reports: int
    flagged_reports: int
    unread_messages: int

class DoctorStats(BaseModel):
    total_patients: int
    total_reports: int
    pending_reviews: int
    reviewed_today: int
    flagged_reports: int
    unread_messages: int
