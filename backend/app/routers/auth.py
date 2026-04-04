from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.database import get_db, User
from app.models.schemas import RegisterRequest, LoginRequest, TokenResponse, UserOut, RefreshRequest
from app.services.auth import hash_password, verify_password, create_access_token, create_refresh_token, decode_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register", response_model=TokenResponse, status_code=201)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(400, "Email already registered")
    user = User(email=data.email, hashed_password=hash_password(data.password), full_name=data.full_name,
                role=data.role, date_of_birth=data.date_of_birth, blood_type=data.blood_type,
                phone=data.phone, specialty=data.specialty, hospital=data.hospital, license_number=data.license_number)
    db.add(user); db.commit(); db.refresh(user)
    td = {"sub": user.id, "role": user.role.value}
    return TokenResponse(access_token=create_access_token(td), refresh_token=create_refresh_token(td), user=UserOut.model_validate(user))

@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email, User.is_active == True).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(401, "Invalid email or password")
    td = {"sub": user.id, "role": user.role.value}
    return TokenResponse(access_token=create_access_token(td), refresh_token=create_refresh_token(td), user=UserOut.model_validate(user))

@router.post("/refresh", response_model=TokenResponse)
def refresh(data: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if payload.get("type") != "refresh": raise HTTPException(401, "Invalid refresh token")
    user = db.query(User).filter(User.id == payload.get("sub"), User.is_active == True).first()
    if not user: raise HTTPException(401, "User not found")
    td = {"sub": user.id, "role": user.role.value}
    return TokenResponse(access_token=create_access_token(td), refresh_token=create_refresh_token(td), user=UserOut.model_validate(user))

@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)
