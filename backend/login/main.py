import os
from sqlalchemy import create_engine
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
import bcrypt
from sqlalchemy.orm import sessionmaker, Session
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
engine = create_engine(DB_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_password_hash(password: str) -> str:
    password_bytes = password.encode("utf-8")
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"), hashed_password.encode("utf-8")
        )
    except (ValueError, TypeError):
        return False

# OAuth2 setup
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def generate_password(length=12):
    characters = string.ascii_letters + string.digits + string.punctuation
    return ''.join(random.choice(characters) for _ in range(length))

def create_tables():
    Base.metadata.create_all(bind=engine)
    print("Database and tables created!")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_user(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def get_all_users(db: Session, columns):
    if columns:
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

def approve_user(db: Session, user: UserApprove):
    existing_user = db.query(User).filter(User.username == user.username).first()

    if not existing_user:
        return None

    existing_user.role = user.role
    existing_user.status = user.status
    # Grupul e opțional: îl actualizăm doar dacă a fost trimis, ca un
    # apel vechi (fără `grup`) să nu șteargă grupul deja salvat.
    if user.grup is not None:
        existing_user.grup = user.grup

    try:
        db.commit()
        db.refresh(existing_user)
        return existing_user
    except Exception as e:
        db.rollback()
        raise e

def authenticate_user(db: Session, username: str, password: str):
    user = get_user(db, username)
    if not user or not verify_password(password, user.password_hash):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
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
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    # Aici am adăugat coloanele 'functie' si 'grup'
    all_users = get_all_users(db, ['firstName', 'lastName', 'username', 'email', 'employeeNo', 'department', 'functie', 'grup', 'role', 'status'], )
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
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    approve_user(db, user)
    return user

def register_new_user(user: UserCreate, db: Session = Depends(get_db)):
    if get_user(db, user.username):
        err_message = f"Username {user.username} already used!"
        raise HTTPException(status_code=400, detail=err_message)
    
    # Aici salvăm funcția în baza de date
    user_obj = User(
        firstName=user.firstName,
        lastName=user.lastName,
        username=user.username,
        password_hash=get_password_hash(user.password),
        email=user.email,
        employeeNo=user.employeeNo,
        department=user.department,
        functie=user.functie,
        grup=user.grup,
        role=user.role,
        status='not confirmed')
    db.add(user_obj)
    db.commit()
    db.refresh(user_obj)

    user_dict = {
        'firstName': user.firstName,
        'lastName': user.lastName,
        'username': user.username,
        'email': user.email,
        'employeeNo': user.employeeNo,
        'department': user.department,
        'functie': user.functie,
        'grup': user.grup,
        'role': user.role
    }

    send_admin_notification_email(user_data=user_dict)
    send_account_created_email(user_data=user_dict)

    return user_obj

def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.status != "activ":
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
    user = get_user(db, updateUserInfo.username)

    if not user:
        err_message = f"Username {updateUserInfo.username} does not exist in database!"
        raise HTTPException(status_code=400, detail=err_message)

    user.firstName = updateUserInfo.firstName
    user.lastName = updateUserInfo.lastName
    user.email = updateUserInfo.email
    user.employeeNo = updateUserInfo.employeeNo

    # Acestea erau trimise de FE dar nu se salvau niciodata. Sunt opționale:
    # le scriem doar cand vin efectiv in payload.
    if updateUserInfo.departament is not None:
        user.department = updateUserInfo.departament
    if updateUserInfo.functie is not None:
        user.functie = updateUserInfo.functie
    if updateUserInfo.grup is not None:
        user.grup = updateUserInfo.grup

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