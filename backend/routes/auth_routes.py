from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database.db import get_db
from controllers import auth_controller

router = APIRouter(prefix="/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class CreateUserRequest(BaseModel):
    username: str
    password: str
    role: str  # admin | manager | user


class UpdateRoleRequest(BaseModel):
    role: str


class UpdatePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    return auth_controller.login(db, body.username, body.password)


@router.get("/users")
def get_all_users(db: Session = Depends(get_db)):
    return auth_controller.get_all_users(db)


@router.post("/users")
def create_user(body: CreateUserRequest, db: Session = Depends(get_db)):
    return auth_controller.create_user(db, body.username, body.password, body.role)


@router.put("/users/{user_id}/role")
def update_user_role(user_id: int, body: UpdateRoleRequest, db: Session = Depends(get_db)):
    return auth_controller.update_user_role(db, user_id, body.role)


@router.put("/users/{user_id}/password")
def update_password(user_id: int, body: UpdatePasswordRequest, db: Session = Depends(get_db)):
    return auth_controller.update_password(db, user_id, body.current_password, body.new_password)


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    return auth_controller.delete_user(db, user_id)
