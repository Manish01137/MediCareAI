import json
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from app.models.database import get_db, User, Report, ReportStatus
from app.models.schemas import ReportOut, ReviewRequest, PatientStats, DoctorStats
from app.services.auth import get_current_user, require_doctor
from app.services.ai_analysis import analyze_report
from app.config import settings

router = APIRouter(prefix="/reports", tags=["Reports"])
ALLOWED_EXTS = {".pdf", ".jpg", ".jpeg", ".png", ".bmp"}

def to_schema(r: Report, db: Session) -> ReportOut:
    tips   = json.loads(r.ai_tips)    if r.ai_tips    else []
    values = json.loads(r.lab_values) if r.lab_values else {}
    pt = db.query(User).filter(User.id == r.patient_id).first()
    dr = db.query(User).filter(User.id == r.reviewed_by_id).first() if r.reviewed_by_id else None
    return ReportOut(id=r.id, patient_id=r.patient_id, patient_name=pt.full_name if pt else None,
                     report_type=r.report_type, file_name=r.file_name, file_size=r.file_size,
                     status=r.status, uploaded_at=r.uploaded_at, reviewed_at=r.reviewed_at,
                     ai_summary=r.ai_summary, ai_explanation=r.ai_explanation, ai_tips=tips,
                     lab_values=values, doctor_note=r.doctor_note, is_flagged=r.is_flagged,
                     flag_reason=r.flag_reason, reviewing_doctor_name=dr.full_name if dr else None)

def bg_analyze(report_id: str, file_path: str, file_name: str, db_url: str):
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.models.database import Report
    engine = create_engine(db_url, connect_args={"check_same_thread": False} if "sqlite" in db_url else {})
    db = sessionmaker(bind=engine)()
    try:
        res = analyze_report(file_path, file_name)
        r = db.query(Report).filter(Report.id == report_id).first()
        if r:
            r.report_type  = res.get("reportType", file_name)
            r.ai_summary   = res.get("summary", "")
            r.ai_explanation = res.get("explanation", "")
            r.ai_tips      = json.dumps(res.get("tips", []))
            r.lab_values   = json.dumps(res.get("values", {}))
            db.commit()
    except Exception as e:
        print(f"bg_analyze error: {e}")
    finally:
        db.close()

@router.post("/upload", response_model=ReportOut, status_code=201)
async def upload(bg: BackgroundTasks, file: UploadFile = File(...),
                 db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role.value != "patient":
        raise HTTPException(403, "Only patients can upload")
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(400, "Allowed: PDF, JPG, PNG, BMP")
    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"Max {settings.MAX_FILE_SIZE_MB}MB")
    upload_dir = Path(settings.UPLOAD_DIR) / user.id
    upload_dir.mkdir(parents=True, exist_ok=True)
    fname = f"{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
    fpath = upload_dir / fname
    fpath.write_bytes(content)
    r = Report(patient_id=user.id, report_type=file.filename, file_name=file.filename,
               file_path=str(fpath), file_size=len(content), status=ReportStatus.pending)
    db.add(r); db.commit(); db.refresh(r)
    bg.add_task(bg_analyze, r.id, str(fpath), file.filename, settings.DATABASE_URL)
    return to_schema(r, db)

@router.get("/my", response_model=List[ReportOut])
def my_reports(status: Optional[str] = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.query(Report).filter(Report.patient_id == user.id)
    if status: q = q.filter(Report.status == status)
    return [to_schema(r, db) for r in q.order_by(Report.uploaded_at.desc()).all()]

@router.get("/all", response_model=List[ReportOut])
def all_reports(status: Optional[str] = None, patient_id: Optional[str] = None,
                db: Session = Depends(get_db), dr: User = Depends(require_doctor)):
    q = db.query(Report)
    if status:     q = q.filter(Report.status == status)
    if patient_id: q = q.filter(Report.patient_id == patient_id)
    return [to_schema(r, db) for r in q.order_by(Report.uploaded_at.desc()).all()]

@router.get("/stats/patient", response_model=PatientStats)
def patient_stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    from app.models.database import Message
    rs = db.query(Report).filter(Report.patient_id == user.id).all()
    unread = db.query(Message).filter(Message.receiver_id == user.id, Message.is_read == False).count()
    return PatientStats(total_reports=len(rs), pending_reports=sum(1 for r in rs if r.status.value=="pending"),
                        reviewed_reports=sum(1 for r in rs if r.status.value=="reviewed"),
                        flagged_reports=sum(1 for r in rs if r.is_flagged), unread_messages=unread)

@router.get("/stats/doctor", response_model=DoctorStats)
def doctor_stats(db: Session = Depends(get_db), dr: User = Depends(require_doctor)):
    from app.models.database import Message
    from datetime import date
    rs = db.query(Report).all()
    today = date.today()
    unread = db.query(Message).filter(Message.receiver_id == dr.id, Message.is_read == False).count()
    return DoctorStats(total_patients=len(set(r.patient_id for r in rs)), total_reports=len(rs),
                       pending_reviews=sum(1 for r in rs if r.status.value=="pending"),
                       reviewed_today=sum(1 for r in rs if r.reviewed_at and r.reviewed_at.date()==today and r.reviewed_by_id==dr.id),
                       flagged_reports=sum(1 for r in rs if r.is_flagged), unread_messages=unread)

@router.get("/{report_id}", response_model=ReportOut)
def get_report(report_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = db.query(Report).filter(Report.id == report_id).first()
    if not r: raise HTTPException(404, "Not found")
    if user.role.value == "patient" and r.patient_id != user.id: raise HTTPException(403, "Access denied")
    return to_schema(r, db)

@router.post("/{report_id}/review", response_model=ReportOut)
def review(report_id: str, data: ReviewRequest, db: Session = Depends(get_db), dr: User = Depends(require_doctor)):
    r = db.query(Report).filter(Report.id == report_id).first()
    if not r: raise HTTPException(404, "Not found")
    r.status         = ReportStatus.flagged if data.is_flagged else ReportStatus.reviewed
    r.doctor_note    = data.doctor_note
    r.is_flagged     = data.is_flagged
    r.flag_reason    = data.flag_reason
    r.reviewed_by_id = dr.id
    r.reviewed_at    = datetime.utcnow()
    db.commit(); db.refresh(r)
    return to_schema(r, db)
