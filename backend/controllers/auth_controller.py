import os
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from google.oauth2 import id_token
from google.auth.transport import requests as g_requests
from database.queries import auth_queries

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")


def google_login(db: Session, credential: str) -> dict:
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google sign-in not configured")
    try:
        info = id_token.verify_oauth2_token(
            credential, g_requests.Request(), GOOGLE_CLIENT_ID
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    google_sub = info["sub"]
    email = info.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email")

    user = auth_queries.get_user_by_google_sub(db, google_sub)
    if user:
        return {"UserId": user["UserId"], "Username": user["Username"], "Role": user["Role"]}

    user = auth_queries.get_user_by_email(db, email)
    if user:
        auth_queries.link_google_sub(db, user["UserId"], google_sub)
        return {"UserId": user["UserId"], "Username": user["Username"], "Role": user["Role"]}

    raise HTTPException(status_code=403, detail="No account found for this Google email. Contact an admin.")


def login(db: Session, username: str, password: str) -> dict:
    user = auth_queries.get_user_by_username(db, username)
    if not user or not pwd_context.verify(password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return {"UserId": user["UserId"], "Username": user["Username"], "Role": user["Role"]}


def get_all_users(db: Session) -> list:
    return [dict(u) for u in auth_queries.get_all_users(db)]


def create_user(db: Session, username: str, password: str, email: str, role: str) -> dict:
    if auth_queries.get_user_by_username(db, username):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")
    if auth_queries.get_user_by_email(db, email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
    if role not in ("admin", "manager", "user"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")
    password_hash = pwd_context.hash(password)
    user_id = auth_queries.create_user(db, username, password_hash, email, role)
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
