from datetime import datetime
from datetime import time as dtime
from typing import Optional

from pydantic import BaseModel
from sqlalchemy.orm import Session
import threading

_ticket_id_lock = threading.Lock()

from customer_support.models import Ticket, Order, Suggestion, Complaint


# ============================== SCHEME (Pydantic) ==============================

class TicketCreate(BaseModel):
    echipa: Optional[str] = None
    tipInterventie: Optional[str] = None
    descriereSimptom: Optional[str] = None
    sectie: Optional[str] = None
    linie: Optional[str] = None
    codAfectat: Optional[str] = None
    denumireProdus: Optional[str] = None
    prioritate: Optional[str] = None
    # AICI ERA PROBLEMA: Python astepta 'dtime' (doar ora). Acum accepta 'datetime' (data+ora)
    termenCerut: Optional[datetime] = None  
    status: Optional[str] = "Deschis"


class TicketUpdate(TicketCreate):
    id: int


# ---- Helpers de (de)serializare pentru date / ore ----

def _iso_date(d):
    return d.isoformat() if d else None


def _iso_time(t):
    return t.strftime("%H:%M") if t else None


def _iso_time_full(t):
    return t.strftime("%H:%M:%S") if t else None


# ---- Serializare: rând DB (snake_case) -> dict (camelCase, exact ca in Angular) ----

def serialize_ticket(t: Ticket):
    return {
        "id": t.id,
        "initiator": t.initiator,
        "echipa": t.echipa,
        "tipInterventie": t.tip_interventie,
        "descriereSimptom": t.descriere_simptom,
        "sectie": t.sectie,
        "linie": t.linie,
        "codAfectat": t.cod_afectat,
        "denumireProdus": t.denumire_produs,
        "prioritate": t.prioritate,
        "termenInitiat": t.termen_initiat.isoformat() if t.termen_initiat else None,
        # Acum trimitem data intreaga inapoi la frontend, nu doar ora
        "termenCerut": t.termen_cerut.isoformat() if t.termen_cerut else None, 
        "status": t.status,
    }


def serialize_order(o: Order):
    return {
        "id": o.id,
        "numarComanda": o.numar_comanda,
        "client": o.client,
        "produs": o.produs,
        "cantitate": o.cantitate,
        "status": o.status,
        "dataComanda": _iso_date(o.data_comanda),

        "categorieProdus": o.categorie_produs,
        "furnizor": o.furnizor,
        "prioritate": o.prioritate,

        "numarIntern": o.numar_intern,
        "initiator": o.initiator,
        "sectie": o.sectie,
        "linie": o.linie,
        "locatie": o.locatie,
        "responsabil": o.responsabil,
        "cauzaInterventie": o.cauza_interventie,
        "explicatie": o.explicatie,
        "operatiiSuplimentare": o.operatii_suplimentare,
        "termenData": _iso_date(o.termen_data),
        "termenOra": _iso_time(o.termen_ora),
        "kpi": o.kpi,
        "deLaOra": _iso_time(o.de_la_ora),
        "panaLaOra": _iso_time(o.pana_la_ora),
    }


def serialize_suggestion(s: Suggestion):
    return {
        "id": s.id,
        "titlu": s.titlu,
        "descriere": s.descriere,
        "autor": s.autor,
        "categorie": s.categorie,
        "status": s.status,
        "dataTrimitere": _iso_date(s.data_trimitere),

        "prioritate": s.prioritate,

        "numarIntern": s.numar_intern,
        "initiator": s.initiator,
        "sectie": s.sectie,
        "linie": s.linie,
        "locatie": s.locatie,
        "responsabil": s.responsabil,
        "cauzaInterventie": s.cauza_interventie,
        "explicatie": s.explicatie,
        "operatiiSuplimentare": s.operatii_suplimentare,
        "termenData": _iso_date(s.termen_data),
        "termenOra": _iso_time(s.termen_ora),
        "kpi": s.kpi,
        "deLaOra": _iso_time(s.de_la_ora),
        "panaLaOra": _iso_time(s.pana_la_ora),
    }


def serialize_complaint(c: Complaint):
    return {
        "id": c.id,
        "titlu": c.titlu,
        "descriere": c.descriere,
        "client": c.client,
        "severitate": c.severitate,
        "status": c.status,
        "dataTrimitere": _iso_date(c.data_trimitere),

        "numarIntern": c.numar_intern,
        "initiator": c.initiator,
        "sectie": c.sectie,
        "linie": c.linie,
        "locatie": c.locatie,
        "responsabil": c.responsabil,
        "cauzaInterventie": c.cauza_interventie,
        "explicatie": c.explicatie,
        "operatiiSuplimentare": c.operatii_suplimentare,
        "termenData": _iso_date(c.termen_data),
        "termenOra": _iso_time(c.termen_ora),
        "kpi": c.kpi,
        "deLaOra": _iso_time(c.de_la_ora),
        "panaLaOra": _iso_time(c.pana_la_ora),
    }


# ============================== TICKETS ==============================

def get_all_tickets(db: Session):
    return [serialize_ticket(t) for t in db.query(Ticket).order_by(Ticket.id.desc()).all()]


def create_ticket(db: Session, payload: TicketCreate, initiator: str, termen_initiat: datetime = None):
    with _ticket_id_lock:
        existing_ids = {row[0] for row in db.query(Ticket.id).all()}
        next_id = 1
        while next_id in existing_ids:
            next_id += 1

        obj = Ticket(
            id=next_id,
            initiator=initiator,
            echipa=payload.echipa,
            tip_interventie=payload.tipInterventie,
            descriere_simptom=payload.descriereSimptom,
            sectie=payload.sectie,
            linie=payload.linie,
            cod_afectat=payload.codAfectat,
            denumire_produs=payload.denumireProdus,
            prioritate=payload.prioritate,
            termen_initiat=termen_initiat or datetime.now(),
            termen_cerut=payload.termenCerut,
            status=payload.status or "Deschis",
        )
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return serialize_ticket(obj)


def update_ticket(db: Session, payload: TicketUpdate):
    obj = db.query(Ticket).filter(Ticket.id == payload.id).first()
    if not obj:
        return None

    # initiator si termen_initiat NU se modifica niciodata la update.
    obj.echipa = payload.echipa
    obj.tip_interventie = payload.tipInterventie
    obj.descriere_simptom = payload.descriereSimptom
    obj.sectie = payload.sectie
    obj.linie = payload.linie
    obj.cod_afectat = payload.codAfectat
    obj.denumire_produs = payload.denumireProdus
    obj.prioritate = payload.prioritate
    obj.termen_cerut = payload.termenCerut
    obj.status = payload.status

    db.commit()
    db.refresh(obj)
    return serialize_ticket(obj)


def delete_ticket(db: Session, ticket_id: int):
    obj = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True


# ============================== ORDERS ==============================

def get_all_orders(db: Session):
    return [serialize_order(o) for o in db.query(Order).order_by(Order.id.desc()).all()]


def create_order(db: Session, payload):
    obj = Order(
        numar_comanda=payload.numarComanda, client=payload.client, produs=payload.produs,
        cantitate=payload.cantitate, status=payload.status, data_comanda=payload.dataComanda,

        categorie_produs=payload.categorieProdus, furnizor=payload.furnizor,
        prioritate=payload.prioritate,

        numar_intern=payload.numarIntern, initiator=payload.initiator,
        sectie=payload.sectie, linie=payload.linie, locatie=payload.locatie,
        responsabil=payload.responsabil, cauza_interventie=payload.cauzaInterventie,
        explicatie=payload.explicatie, operatii_suplimentare=payload.operatiiSuplimentare,
        termen_data=payload.termenData, termen_ora=payload.termenOra, kpi=payload.kpi,
        de_la_ora=payload.deLaOra, pana_la_ora=payload.panaLaOra,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return serialize_order(obj)


def update_order(db: Session, payload):
    obj = db.query(Order).filter(Order.id == payload.id).first()
    if not obj:
        return None
    obj.numar_comanda = payload.numarComanda
    obj.client = payload.client
    obj.produs = payload.produs
    obj.cantitate = payload.cantitate
    obj.status = payload.status
    obj.data_comanda = payload.dataComanda

    obj.categorie_produs = payload.categorieProdus
    obj.furnizor = payload.furnizor
    obj.prioritate = payload.prioritate

    obj.numar_intern = payload.numarIntern
    obj.initiator = payload.initiator
    obj.sectie = payload.sectie
    obj.linie = payload.linie
    obj.locatie = payload.locatie
    obj.responsabil = payload.responsabil
    obj.cauza_interventie = payload.cauzaInterventie
    obj.explicatie = payload.explicatie
    obj.operatii_suplimentare = payload.operatiiSuplimentare
    obj.termen_data = payload.termenData
    obj.termen_ora = payload.termenOra
    obj.kpi = payload.kpi
    obj.de_la_ora = payload.deLaOra
    obj.pana_la_ora = payload.panaLaOra

    db.commit()
    db.refresh(obj)
    return serialize_order(obj)


def delete_order(db: Session, order_id: int):
    obj = db.query(Order).filter(Order.id == order_id).first()
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True


# ============================== SUGGESTIONS ==============================

def get_all_suggestions(db: Session):
    return [serialize_suggestion(s) for s in db.query(Suggestion).order_by(Suggestion.id.desc()).all()]


def create_suggestion(db: Session, payload):
    obj = Suggestion(
        titlu=payload.titlu, descriere=payload.descriere, autor=payload.autor,
        categorie=payload.categorie, status=payload.status, data_trimitere=payload.dataTrimitere,

        prioritate=payload.prioritate,

        numar_intern=payload.numarIntern, initiator=payload.initiator,
        sectie=payload.sectie, linie=payload.linie, locatie=payload.locatie,
        responsabil=payload.responsabil, cauza_interventie=payload.cauzaInterventie,
        explicatie=payload.explicatie, operatii_suplimentare=payload.operatiiSuplimentare,
        termen_data=payload.termenData, termen_ora=payload.termenOra, kpi=payload.kpi,
        de_la_ora=payload.deLaOra, pana_la_ora=payload.panaLaOra,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return serialize_suggestion(obj)


def update_suggestion(db: Session, payload):
    obj = db.query(Suggestion).filter(Suggestion.id == payload.id).first()
    if not obj:
        return None
    obj.titlu = payload.titlu
    obj.descriere = payload.descriere
    obj.autor = payload.autor
    obj.categorie = payload.categorie
    obj.status = payload.status
    obj.data_trimitere = payload.dataTrimitere

    obj.prioritate = payload.prioritate

    obj.numar_intern = payload.numarIntern
    obj.initiator = payload.initiator
    obj.sectie = payload.sectie
    obj.linie = payload.linie
    obj.locatie = payload.locatie
    obj.responsabil = payload.responsabil
    obj.cauza_interventie = payload.cauzaInterventie
    obj.explicatie = payload.explicatie
    obj.operatii_suplimentare = payload.operatiiSuplimentare
    obj.termen_data = payload.termenData
    obj.termen_ora = payload.termenOra
    obj.kpi = payload.kpi
    obj.de_la_ora = payload.deLaOra
    obj.pana_la_ora = payload.panaLaOra

    db.commit()
    db.refresh(obj)
    return serialize_suggestion(obj)


def delete_suggestion(db: Session, suggestion_id: int):
    obj = db.query(Suggestion).filter(Suggestion.id == suggestion_id).first()
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True


# ============================== COMPLAINTS ==============================

def get_all_complaints(db: Session):
    return [serialize_complaint(c) for c in db.query(Complaint).order_by(Complaint.id.desc()).all()]


def create_complaint(db: Session, payload):
    obj = Complaint(
        titlu=payload.titlu, descriere=payload.descriere, client=payload.client,
        severitate=payload.severitate, status=payload.status, data_trimitere=payload.dataTrimitere,

        numar_intern=payload.numarIntern, initiator=payload.initiator,
        sectie=payload.sectie, linie=payload.linie, locatie=payload.locatie,
        responsabil=payload.responsabil, cauza_interventie=payload.cauzaInterventie,
        explicatie=payload.explicatie, operatii_suplimentare=payload.operatiiSuplimentare,
        termen_data=payload.termenData, termen_ora=payload.termenOra, kpi=payload.kpi,
        de_la_ora=payload.deLaOra, pana_la_ora=payload.panaLaOra,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return serialize_complaint(obj)


def update_complaint(db: Session, payload):
    obj = db.query(Complaint).filter(Complaint.id == payload.id).first()
    if not obj:
        return None
    obj.titlu = payload.titlu
    obj.descriere = payload.descriere
    obj.client = payload.client
    obj.severitate = payload.severitate
    obj.status = payload.status
    obj.data_trimitere = payload.dataTrimitere

    obj.numar_intern = payload.numarIntern
    obj.initiator = payload.initiator
    obj.sectie = payload.sectie
    obj.linie = payload.linie
    obj.locatie = payload.locatie
    obj.responsabil = payload.responsabil
    obj.cauza_interventie = payload.cauzaInterventie
    obj.explicatie = payload.explicatie
    obj.operatii_suplimentare = payload.operatiiSuplimentare
    obj.termen_data = payload.termenData
    obj.termen_ora = payload.termenOra
    obj.kpi = payload.kpi
    obj.de_la_ora = payload.deLaOra
    obj.pana_la_ora = payload.panaLaOra

    db.commit()
    db.refresh(obj)
    return serialize_complaint(obj)


def delete_complaint(db: Session, complaint_id: int):
    obj = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True