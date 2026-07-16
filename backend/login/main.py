import os
from sqlalchemy import create_engine
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
from typing import Optional
import random
import string

from login.models import *
from alerts.admin_notification import *

# Load .env file with variables
load_dotenv()
DB_URL = os.getenv("DB_URL")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))

# Database setup
# Create the engne to connect to the database conect_args to allow usage across threads
# engine = create_engine(DB_URL, connect_args={"check_same_thread": False})
engine = create_engine(DB_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# OAuth2 setup
# Expects a token in the Auth Header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def generate_password(length=12):
    characters = string.ascii_letters + string.digits + string.punctuation
    return ''.join(random.choice(characters) for _ in range(length))

# Misc functions
# Create the users tables if necessary
def create_tables():
    Base.metadata.create_all(bind=engine)
    print("Database and tables created!")

# Provide a database session to each request and close after
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Verify if the plain password = hashed password stored in the database
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# Hashes password before storing in database
def get_password_hash(password):
    return pwd_context.hash(password)

# Looks for a user in the database sessions
def get_user(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def get_all_users(db: Session, columns):
    if columns:
        # Build a list of column attributes from the User model
        selected_columns = []
        for col in columns:
            if hasattr(User, col):
                selected_columns.append(getattr(User, col))
            else:
                raise ValueError(f"Column '{col}' does not exist in User model")
        
        results = db.query(*selected_columns).all()
        return [dict(zip(columns, row)) for row in results]
    else:
        return db.query(User).all()
    
def approve_user(db:Session, user: UserApprove):
    # Find the user by username
    existing_user = db.query(User).filter(User.username == user.username).first()

    if not existing_user:
        return None
    
    existing_user.role = user.role
    existing_user.status = user.status
    
    # Commit the changes
    try:
        db.commit()
        db.refresh(existing_user)
        return existing_user
    except Exception as e:
        db.rollback()
        raise e

# Checks if the user credentials are correct
def authenticate_user(db: Session, username: str, password: str):
    user = get_user(db, username)
    if not user or not verify_password(password, user.password_hash):
        return False
    return user

# Creates a JWT token with exp time
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    # Token signed with secret key and alogorithm
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# Takes a token as an input and decodes it to get the user info by the username
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decodes it
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = get_user(db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

def get_all_users_with_credentials(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decodes it
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    all_users = get_all_users(db, ['firstName', 'lastName', 'username', 'email', 'employeeNo', 'role', 'status'], )
    if all_users is None:
        raise credentials_exception
    return all_users

def approve_user_with_credentials(user: UserApprove, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db), ):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decodes it
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    approve_user(db, user)
    return user

# Functions to be used by the interface as the api calls
# Register a new user in the database with the hashed password
def register_new_user(user: UserCreate, db: Session = Depends(get_db)):
    if get_user(db, user.username):
        err_message = f"Username {user.username} already used!"
        # print(err_message)
        raise HTTPException(status_code=400, detail=err_message)
    user_obj = User(
        firstName=user.firstName,
        lastName=user.lastName,
        username=user.username, 
        password_hash=get_password_hash(user.password), 
        email=user.email, 
        employeeNo=user.employeeNo, 
        role=user.role,
        status='not confirmed')
    db.add(user_obj)
    db.commit()
    db.refresh(user_obj)

    # Send email to admins about new user register
    user_dict = {
        'firstName': user.firstName,
        'lastName': user.lastName,
        'username': user.username,
        'email': user.email,
        'employeeNo': user.employeeNo,
        'role': user.role
    }

    send_admin_notification_email(user_data=user_dict)
    send_account_created_email(user_data=user_dict)

    return user_obj

# Authenticates the user if the credentials are correct and creates a token to return
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)

    print(user)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if get_user(db, form_data.username).__dict__["status"] != "activ":
        print("yes")

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account not activated by admin!",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}

def reset_password(userResetPassword: UserResetPassword, db: Session = Depends(get_db)):
    user = authenticate_user(db, userResetPassword.username, userResetPassword.currentPassword)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or current password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = get_user(db, userResetPassword.username)
    if user:
        new_password_hashed = get_password_hash(userResetPassword.newPassword)
        user.password_hash = new_password_hashed
        db.commit()
        return user
    else:
        err_message = f"Username {userResetPassword.username} does not exist in database!"
        raise HTTPException(status_code=400, detail=err_message)

def reset_password_with_credentials(userResetPassword: UserResetPassword, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decodes it
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = reset_password(userResetPassword, db)
    return user

def update_user_info_with_credentials(updateUserInfo, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decodes it
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = update_user_info(updateUserInfo, db)
    return user

def update_user_info(updateUserInfo: UserUpdateInfo, db: Session = Depends(get_db)):
    # Find the user by username
    user = get_user(db, updateUserInfo.username)

    print("OK")

    if not user:
        err_message = f"Username {updateUserInfo.username} does not exist in database!"
        raise HTTPException(status_code=400, detail=err_message)

    # Update the user information
    user.firstName = updateUserInfo.firstName
    user.lastName = updateUserInfo.lastName
    user.email = updateUserInfo.email
    user.employeeNo = updateUserInfo.employeeNo

    # Commit the changes
    try:
        db.commit()
        db.refresh(user)
        return user
    except Exception as e:
        db.rollback()
        err_message = f"Failed to update user information: {str(e)}"
        raise HTTPException(status_code=500, detail=err_message)

def forgot_password(email: UserForgotPassword, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email.email).first()
    if user:
        new_password = generate_password()
        new_password_hashed = get_password_hash(new_password)
        user.password_hash = new_password_hashed
        db.commit()
        user_dict = {
            'firstName': user.firstName,
            'lastName': user.lastName,
            'newPassword': new_password,
            'email': email.email
        }

        send_user_password_email(user_data=user_dict)
        return user
    else:
        err_message = f"Email {email.email} does not exist in database!"
        raise HTTPException(status_code=400, detail=err_message)

if __name__ == "__main__":
    create_tables()