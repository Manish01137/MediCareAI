from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.database import get_db, User
from app.models.schemas import UserOut, UserUpdate
from app.services.auth import get_current_user, require_doctor

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)

@router.patch("/me", response_model=UserOut)
def update_me(data: UserUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(user, k, v)
    db.commit(); db.refresh(user)
    return UserOut.model_validate(user)

@router.get("/patients", response_model=List[UserOut])
def list_patients(db: Session = Depends(get_db), dr: User = Depends(require_doctor)):
    return [UserOut.model_validate(p) for p in db.query(User).filter(User.role == "patient", User.is_active == True).all()]

@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.id != user_id and user.role.value != "doctor":
        raise HTTPException(403, "Access denied")
    u = db.query(User).filter(User.id == user_id).first()
    if not u: raise HTTPException(404, "Not found")
    return UserOut.model_validate(u)
