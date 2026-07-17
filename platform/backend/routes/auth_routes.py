from fastapi import APIRouter, Request, HTTPException, status
from pydantic import BaseModel
import jwt
from datetime import datetime, timedelta

router = APIRouter()

SECRET_KEY = "super-secret-development-key" # In production, use environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days

class AuthRequest(BaseModel):
    username: str
    password: str

def get_current_user(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        return int(user_id)
    except jwt.PyJWTError:
        return None

def get_current_username(token: str):
    """Extract username from JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("username")
    except jwt.PyJWTError:
        return None

def build_session_key(username: str, session_id: str) -> str:
    """Build the OpenClaw session key for a given user and session."""
    return f"agent:main:{username}:{session_id}"

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.post("/register")
async def register(request: Request, data: AuthRequest):
    chat_db = request.app.state.chat_db
    
    # Try to add user
    user_id = chat_db.add_user(data.username, data.password)
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Generate token
    token = create_access_token(data={"sub": str(user_id), "username": data.username})
    
    return {"access_token": token, "token_type": "bearer", "user_id": user_id, "username": data.username}

@router.post("/login")
async def login(request: Request, data: AuthRequest):
    chat_db = request.app.state.chat_db
    
    # Verify user
    user = chat_db.verify_user(data.username, data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Generate token
    token = create_access_token(data={"sub": str(user["id"]), "username": user["username"]})
    
    return {"access_token": token, "token_type": "bearer", "user_id": user["id"], "username": user["username"]}
