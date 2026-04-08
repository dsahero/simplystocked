from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from database.queries import auth_queries

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def login(db: Session, username: str, password: str) -> dict:
    user = auth_queries.get_user_by_username(db, username)
    if not user or not pwd_context.verify(password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return {"UserId": user["UserId"], "Username": user["Username"], "Role": user["Role"]}


def get_all_users(db: Session) -> list:
    return [dict(u) for u in auth_queries.get_all_users(db)]


def create_user(db: Session, username: str, password: str, role: str) -> dict:
    existing = auth_queries.get_user_by_username(db, username)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")
    if role not in ("admin", "manager", "user"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")
    password_hash = pwd_context.hash(password)
    user_id = auth_queries.create_user(db, username, password_hash, role)
    return {"UserId": user_id, "Username": username, "Role": role}


def update_user_role(db: Session, user_id: int, role: str) -> dict:
    if role not in ("admin", "manager", "user"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")
    user = auth_queries.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    auth_queries.update_user_role(db, user_id, role)
    return {"UserId": user_id, "Username": user["Username"], "Role": role}


def update_password(db: Session, user_id: int, current_password: str, new_password: str) -> dict:
    user = auth_queries.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    full_user = auth_queries.get_user_by_username(db, user["Username"])
    if not pwd_context.verify(current_password, full_user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password incorrect")
    new_hash = pwd_context.hash(new_password)
    auth_queries.update_password(db, user_id, new_hash)
    return {"message": "Password updated"}


def delete_user(db: Session, user_id: int) -> dict:
    user = auth_queries.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    auth_queries.delete_user(db, user_id)
    return {"message": f"User {user_id} deleted"}
