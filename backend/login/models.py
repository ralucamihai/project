import string
from typing import Optional
from pydantic import BaseModel
from sqlalchemy.orm import declarative_base
from sqlalchemy import create_engine, Column, Integer, String

# Create the bases for the tables
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    firstName = Column(String(128), nullable=False)
    lastName = Column(String(128), nullable=False)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(128), nullable=False)
    email = Column(String(50), nullable=False)
    employeeNo = Column(String(50), nullable=False)
    role = Column(String(25), nullable=False)
    status = Column(String(25), nullable=False)

# Pydantic models
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserCreate(BaseModel):
    firstName: str
    lastName: str
    username: str
    password: str
    email: str
    employeeNo: str
    role: str

class UserApprove(BaseModel):
    username: str
    role: str
    status: str

class UserOut(BaseModel):
    id: int
    username: str

    class Config:
        orm_mode = True

class UserResetPassword(BaseModel):
    username: str
    currentPassword: str
    newPassword: str

class UserForgotPassword(BaseModel):
    email: str

class UserUpdateInfo(BaseModel):
    username: str
    firstName: str
    lastName: str
    email: str
    employeeNo: str