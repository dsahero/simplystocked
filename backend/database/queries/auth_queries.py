from sqlalchemy.orm import Session
from sqlalchemy import text


def get_user_by_username(db: Session, username: str):
    result = db.execute(
        text("SELECT UserId, Username, password_hash, Role FROM Users WHERE Username = :username"),
        {"username": username}
    )
    return result.mappings().first()


def get_user_by_id(db: Session, user_id: int):
    result = db.execute(
        text("SELECT UserId, Username, Role FROM Users WHERE UserId = :user_id"),
        {"user_id": user_id}
    )
    return result.mappings().first()


def get_all_users(db: Session):
    result = db.execute(
        text("SELECT UserId, Username, Role FROM Users ORDER BY Role, Username")
    )
    return result.mappings().all()


def create_user(db: Session, username: str, password_hash: str, email: str, role: str) -> int:
    result = db.execute(
        text("INSERT INTO Users (Username, password_hash, Email, Role) "
             "VALUES (:username, :password_hash, :email, :role)"),
        {"username": username, "password_hash": password_hash, "email": email, "role": role}
    )
    db.commit()
    return result.lastrowid


def update_user_role(db: Session, user_id: int, role: str):
    db.execute(
        text("UPDATE Users SET Role = :role WHERE UserId = :user_id"),
        {"role": role, "user_id": user_id}
    )
    db.commit()


def update_password(db: Session, user_id: int, password_hash: str):
    db.execute(
        text("UPDATE Users SET password_hash = :password_hash WHERE UserId = :user_id"),
        {"password_hash": password_hash, "user_id": user_id}
    )
    db.commit()


def get_user_by_google_sub(db: Session, google_sub: str):
    result = db.execute(
        text("SELECT UserId, Username, Role FROM Users WHERE google_sub = :sub"),
        {"sub": google_sub},
    )
    return result.mappings().first()


def get_user_by_email(db: Session, email: str):
    result = db.execute(
        text("SELECT UserId, Username, Role FROM Users WHERE Email = :email"),
        {"email": email},
    )
    return result.mappings().first()


def link_google_sub(db: Session, user_id: int, google_sub: str):
    db.execute(
        text("UPDATE Users SET google_sub = :sub WHERE UserId = :user_id"),
        {"sub": google_sub, "user_id": user_id},
    )
    db.commit()


def delete_user(db: Session, user_id: int):
    db.execute(
        text("DELETE FROM Users WHERE UserId = :user_id"),
        {"user_id": user_id}
    )
    db.commit()
