from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# Am schimbat importul pentru baza de date conform structurii tale
from login.models import Base

# =====================================================================
# MODELE BAZĂ DE DATE (SQLAlchemy)
# =====================================================================
class EchipamentPMBModel(Base):
    __tablename__ = "maintenance_echipamente"
    id = Column(Integer, primary_key=True, index=True)
    numar = Column(String, default="")
    denumire = Column(String, default="")
    tipEchipament = Column(String, default="")
    sectie = Column(String, default="")
    linie = Column(String, default="")
    listaOper = Column(String, default="")
    listaPiese = Column(String, default="")
    dataReceptie = Column(String, default="")
    ipAddr = Column(String, default="")
    autonoma = Column(String, default="NA")
    preventiva = Column(String, default="na")
    calibrare = Column(String, default="na")
    controlESD = Column(String, default="")
    electrosecuritate = Column(String, default="")
    backup = Column(String, default="na")
    executant = Column(String, default="")
    responsabil = Column(String, default="")
    respCalibr = Column(String, default="")
    respESD = Column(String, default="")
    respELS = Column(String, default="")
    respBCK = Column(String, default="")
    activ = Column(Boolean, default=True)

class ActivitatePMBModel(Base):
    __tablename__ = "maintenance_activitati"
    id = Column(Integer, primary_key=True, index=True)
    ticket = Column(String, nullable=True)
    initiator = Column(String, nullable=True)
    tipEchipament = Column(String, nullable=True)
    echipa = Column(String, nullable=True)
    denumire = Column(String, default="")
    tipInterventie = Column(String, default="")
    grup = Column(String, nullable=True)
    responsabil = Column(String, nullable=True)
    executant = Column(String, default="")
    descriereSimptom = Column(String, nullable=True)
    defEnuntat = Column(String, default="")
    sectie = Column(String, nullable=True)
    linie = Column(String, nullable=True)
    codAfectat = Column(String, nullable=True)
    pmbNr = Column(String, nullable=True)
    denumireProdus = Column(String, nullable=True)
    prioritate = Column(String, nullable=True)
    termenInitiat = Column(String, nullable=True)
    termenCerut = Column(String, nullable=True)
    piese = Column(String, nullable=True)
    loc = Column(String, nullable=True)
    deLaOra = Column(String, nullable=True)
    panaLaOra = Column(String, nullable=True)
    cauzaInterventie = Column(String, nullable=True)
    explicatie = Column(String, nullable=True)
    operSupl = Column(String, nullable=True)
    validatDe = Column(String, nullable=True)
    validatCa = Column(String, nullable=True)
    explValid = Column(String, nullable=True)
    status = Column(String, default="Deschis")
    activ = Column(Boolean, default=True)
    dataCreareCont = Column(String, nullable=True)
    dataDezactivareCont = Column(String, nullable=True)
    dataOra = Column(String, default="")

# =====================================================================
# SCHEME VALIDARE (Pydantic)
# =====================================================================

class EchipamentSchema(BaseModel):
    numar: Optional[str] = ""
    denumire: Optional[str] = ""
    tipEchipament: Optional[str] = ""
    sectie: Optional[str] = ""
    linie: Optional[str] = ""
    listaOper: Optional[str] = ""
    listaPiese: Optional[str] = ""
    dataReceptie: Optional[str] = ""
    ipAddr: Optional[str] = ""
    autonoma: Optional[str] = "NA"
    preventiva: Optional[str] = "na"
    calibrare: Optional[str] = "na"
    controlESD: Optional[str] = ""
    electrosecuritate: Optional[str] = ""
    backup: Optional[str] = "na"
    executant: Optional[str] = ""
    responsabil: Optional[str] = ""
    respCalibr: Optional[str] = ""
    respESD: Optional[str] = ""
    respELS: Optional[str] = ""
    respBCK: Optional[str] = ""
    activ: Optional[bool] = True

class EchipamentResponse(EchipamentSchema):
    id: int
    class Config:
        from_attributes = True

class ActivitateSchema(BaseModel):
    ticket: Optional[str] = None
    initiator: Optional[str] = None
    tipEchipament: Optional[str] = None
    echipa: Optional[str] = None
    denumire: Optional[str] = ""
    tipInterventie: Optional[str] = ""
    grup: Optional[str] = None
    responsabil: Optional[str] = None
    executant: Optional[str] = ""
    descriereSimptom: Optional[str] = None
    defEnuntat: Optional[str] = ""
    sectie: Optional[str] = None
    linie: Optional[str] = None
    codAfectat: Optional[str] = None
    pmbNr: Optional[str] = None
    denumireProdus: Optional[str] = None
    prioritate: Optional[str] = None
    termenInitiat: Optional[str] = None
    termenCerut: Optional[str] = None
    piese: Optional[str] = None
    loc: Optional[str] = None
    deLaOra: Optional[str] = None
    panaLaOra: Optional[str] = None
    cauzaInterventie: Optional[str] = None
    explicatie: Optional[str] = None
    operSupl: Optional[str] = None
    validatDe: Optional[str] = None
    validatCa: Optional[str] = None
    explValid: Optional[str] = None
    status: Optional[str] = "Deschis"
    activ: Optional[bool] = True
    dataCreareCont: Optional[str] = None
    dataDezactivareCont: Optional[str] = None
    dataOra: Optional[str] = ""

class ActivitateResponse(ActivitateSchema):
    id: int
    class Config:
        from_attributes = True

# =====================================================================
# OPERAȚIUNI CRUD
# =====================================================================

def get_all_echipamente(db: Session):
    return db.query(EchipamentPMBModel).all()

def create_echipament(db: Session, ech: EchipamentSchema):
    db_ech = EchipamentPMBModel(**ech.model_dump())
    db.add(db_ech)
    db.commit()
    db.refresh(db_ech)
    return db_ech

def update_echipament(db: Session, ech_id: int, ech: EchipamentSchema):
    db_ech = db.query(EchipamentPMBModel).filter(EchipamentPMBModel.id == ech_id).first()
    if not db_ech:
        return None
    for key, value in ech.model_dump(exclude_unset=True).items():
        setattr(db_ech, key, value)
    db.commit()
    db.refresh(db_ech)
    return db_ech

def delete_echipament(db: Session, ech_id: int):
    db_ech = db.query(EchipamentPMBModel).filter(EchipamentPMBModel.id == ech_id).first()
    if db_ech:
        db.delete(db_ech)
        db.commit()
        return True
    return False

def get_all_activitati(db: Session, tipInterventie: str = None, status: str = None, activ: bool = None):
    query = db.query(ActivitatePMBModel)
    if tipInterventie:
        query = query.filter(ActivitatePMBModel.tipInterventie == tipInterventie)
    if status:
        query = query.filter(ActivitatePMBModel.status == status)
    if activ is not None:
        query = query.filter(ActivitatePMBModel.activ == activ)
    return query.order_by(ActivitatePMBModel.id.desc()).all()

def create_activitate(db: Session, act: ActivitateSchema):
    db_act = ActivitatePMBModel(**act.model_dump())
    if not db_act.dataOra:
        db_act.dataOra = datetime.now().strftime("%Y-%m-%d %H:%M")
    if not db_act.dataCreareCont:
        db_act.dataCreareCont = datetime.now().strftime("%Y-%m-%d")
        
    db.add(db_act)
    db.commit()
    db.refresh(db_act)
    return db_act

def update_activitate(db: Session, act_id: int, act: ActivitateSchema):
    db_act = db.query(ActivitatePMBModel).filter(ActivitatePMBModel.id == act_id).first()
    if not db_act:
        return None
    for key, value in act.model_dump(exclude_unset=True).items():
        setattr(db_act, key, value)
    db.commit()
    db.refresh(db_act)
    return db_act

def update_detalii_activitate(db: Session, act_id: int, detalii: dict):
    db_act = db.query(ActivitatePMBModel).filter(ActivitatePMBModel.id == act_id).first()
    if not db_act:
        return None
    for key, value in detalii.items():
        if hasattr(db_act, key):
            setattr(db_act, key, value)
    db.commit()
    db.refresh(db_act)
    return db_act

def delete_activitate(db: Session, act_id: int):
    db_act = db.query(ActivitatePMBModel).filter(ActivitatePMBModel.id == act_id).first()
    if db_act:
        db.delete(db_act)
        db.commit()
        return True
    return False