from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.database import get_db, User, Message
from app.models.schemas import MessageCreate, MessageOut
from app.services.auth import get_current_user, require_doctor

router = APIRouter(prefix="/messages", tags=["Messages"])

def to_schema(m: Message, db: Session) -> MessageOut:
    s = db.query(User).filter(User.id == m.sender_id).first()
    return MessageOut(id=m.id, sender_id=m.sender_id, sender_name=s.full_name if s else None,
                      receiver_id=m.receiver_id, content=m.content, report_id=m.report_id,
                      is_read=m.is_read, created_at=m.created_at)

@router.post("/send", response_model=MessageOut, status_code=201)
def send(data: MessageCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rx = db.query(User).filter(User.id == data.receiver_id, User.is_active == True).first()
    if not rx: raise HTTPException(404, "Recipient not found")
    m = Message(sender_id=user.id, receiver_id=data.receiver_id, content=data.content, report_id=data.report_id)
    db.add(m); db.commit(); db.refresh(m)
    return to_schema(m, db)

@router.get("/inbox", response_model=List[MessageOut])
def inbox(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    msgs = db.query(Message).filter(Message.receiver_id == user.id).order_by(Message.created_at.desc()).all()
    return [to_schema(m, db) for m in msgs]

@router.get("/thread/{user_id}", response_model=List[MessageOut])
def thread(user_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    msgs = db.query(Message).filter(
        ((Message.sender_id == user.id) & (Message.receiver_id == user_id)) |
        ((Message.sender_id == user_id) & (Message.receiver_id == user.id))
    ).order_by(Message.created_at.asc()).all()
    return [to_schema(m, db) for m in msgs]

@router.post("/{msg_id}/read")
def mark_read(msg_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    m = db.query(Message).filter(Message.id == msg_id, Message.receiver_id == user.id).first()
    if not m: raise HTTPException(404, "Not found")
    m.is_read = True; db.commit()
    return {"ok": True}

@router.get("/doctors", response_model=List[dict])
def list_doctors(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    docs = db.query(User).filter(User.role == "doctor", User.is_active == True).all()
    return [{"id":d.id,"name":d.full_name,"specialty":d.specialty,"hospital":d.hospital} for d in docs]
