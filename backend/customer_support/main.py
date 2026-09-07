from datetime import datetime, date
from datetime import time as dtime
from typing import Optional, Union

from pydantic import BaseModel
from sqlalchemy.orm import Session
import threading

_ticket_id_lock = threading.Lock()

from customer_support.models import Ticket, Order, Suggestion, Complaint


# ============================== SCHEME (Pydantic) ==============================

class TicketCreate(BaseModel):
    echipa: Optional[str] = None
    tipInterventie: Optional[str] = None
    grup: Optional[str] = None
    responsabil: Optional[str] = None
    descriereSimptom: Optional[str] = None
    sectie: Optional[str] = None
    linie: Optional[str] = None
    codAfectat: Optional[str] = None
    denumireProdus: Optional[str] = None
    prioritate: Optional[str] = None
    termenCerut: Optional[datetime] = None  
    status: Optional[str] = "Deschis"


class TicketUpdate(TicketCreate):
    id: int


class OrderCreate(BaseModel):
    numarComanda: Optional[str] = None
    dataComanda: Optional[Union[date, str]] = None
    sectie: Optional[str] = None
    centruCost: Optional[str] = None
    nrInventar: Optional[str] = None
    descriere: Optional[str] = None
    cantitate: Optional[int] = 1
    desenDoc: Optional[str] = None
    termenSolicitat: Optional[Union[date, str]] = None
    prioritateNumar: Optional[int] = 1
    receptie: Optional[str] = None
    dataRec: Optional[Union[date, str]] = None
    user: Optional[str] = None
    aprobatDeviz: Optional[str] = None
    documentatie: Optional[str] = None
    materiale: Optional[str] = None
    disponibilitate: Optional[str] = None
    deviz: Optional[str] = None
    executant: Optional[str] = None
    timpExecutie: Optional[str] = None
    status: Optional[str] = "In procesare"
    termenConfirmat: Optional[str] = None


class OrderUpdate(OrderCreate):
    id: int


# ---- Helpers de (de)serializare pentru date / ore ----

def _iso_date(d):
    return d.isoformat() if d else None


def _iso_time(t):
    return t.strftime("%H:%M") if t else None


def _parse_date(val):
    if not val or val == "":
        return None
    if isinstance(val, date):
        return val
    try:
        return datetime.strptime(str(val)[:10], "%Y-%m-%d").date()
    except Exception:
        return None


# ---- Serializare: rând DB (snake_case) -> dict (camelCase, conform Angular) ----

def serialize_ticket(t: Ticket):
    return {
        "id": t.id,
        "initiator": t.initiator,
        "echipa": t.echipa,
        "tipInterventie": t.tip_interventie,
        "grup": t.grup,
        "responsabil": t.responsabil,
        "descriereSimptom": t.descriere_simptom,
        "sectie": t.sectie,
        "linie": t.linie,
        "codAfectat": t.cod_afectat,
        "denumireProdus": t.denumire_produs,
        "prioritate": t.prioritate,
        "termenInitiat": t.termen_initiat.isoformat() if t.termen_initiat else None,
        "termenCerut": t.termen_cerut.isoformat() if t.termen_cerut else None, 
        "status": t.status,
    }


def serialize_order(o: Order):
    return {
        "id": o.id,
        "numarComanda": o.numar_comanda or "",
        "dataComanda": _iso_date(o.data_comanda),
        "sectie": o.sectie or "",
        "centruCost": o.centru_cost or "",
        "nrInventar": o.nr_inventar or "",
        "descriere": o.descriere or "",
        "cantitate": o.cantitate or 1,
        "desenDoc": o.desen_doc or "",
        "termenSolicitat": _iso_date(o.termen_solicitat),
        "prioritateNumar": o.prioritate_numar or 1,
        "receptie": o.receptie or "",
        "dataRec": _iso_date(o.data_rec),
        "user": o.user or "",
        "aprobatDeviz": o.aprobat_deviz or "",
        "documentatie": o.documentatie or "",
        "materiale": o.materiale or "",
        "disponibilitate": o.disponibilitate or "",
        "deviz": o.deviz or "",
        "executant": o.executant or "",
        "timpExecutie": o.timp_executie or "",
        "status": o.status or "In procesare",
        "termenConfirmat": o.termen_confirmat or "",
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
            grup=payload.grup,
            responsabil=payload.responsabil,
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

    obj.echipa = payload.echipa
    obj.tip_interventie = payload.tipInterventie
    obj.grup = payload.grup
    obj.responsabil = payload.responsabil
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


def create_order(db: Session, payload: OrderCreate, current_username: str = None):
    numar_comanda = payload.numarComanda
    if not numar_comanda or numar_comanda.strip() == "":
        count_orders = db.query(Order).count() + 1
        numar_comanda = f"CMD-{datetime.now().year}-{count_orders:03d}"

    data_cmd = _parse_date(payload.dataComanda) or date.today()

    obj = Order(
        numar_comanda=numar_comanda,
        data_comanda=data_cmd,
        sectie=payload.sectie,
        centru_cost=payload.centruCost,
        nr_inventar=payload.nrInventar,
        descriere=payload.descriere,
        cantitate=payload.cantitate or 1,
        desen_doc=payload.desenDoc,
        termen_solicitat=_parse_date(payload.termenSolicitat),
        prioritate_numar=payload.prioritateNumar or 1,
        receptie=payload.receptie,
        data_rec=_parse_date(payload.dataRec),
        user=payload.user or current_username,
        aprobat_deviz=payload.aprobatDeviz,
        documentatie=payload.documentatie,
        materiale=payload.materiale,
        disponibilitate=payload.disponibilitate,
        deviz=payload.deviz,
        executant=payload.executant,
        timp_executie=payload.timpExecutie,
        status=payload.status or "In procesare",
        termen_confirmat=payload.termenConfirmat,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return serialize_order(obj)


def update_order(db: Session, payload: OrderUpdate):
    obj = db.query(Order).filter(Order.id == payload.id).first()
    if not obj:
        return None

    if payload.numarComanda:
        obj.numar_comanda = payload.numarComanda
    if payload.dataComanda:
        obj.data_comanda = _parse_date(payload.dataComanda)

    obj.sectie = payload.sectie
    obj.centru_cost = payload.centruCost
    obj.nr_inventar = payload.nrInventar
    obj.descriere = payload.descriere
    obj.cantitate = payload.cantitate or 1
    obj.desen_doc = payload.desenDoc
    obj.termen_solicitat = _parse_date(payload.termenSolicitat)
    obj.prioritate_numar = payload.prioritateNumar or 1
    obj.receptie = payload.receptie
    obj.data_rec = _parse_date(payload.dataRec)
    obj.aprobat_deviz = payload.aprobatDeviz
    obj.documentatie = payload.documentatie
    obj.materiale = payload.materiale
    obj.disponibilitate = payload.disponibilitate
    obj.deviz = payload.deviz
    obj.executant = payload.executant
    obj.timp_executie = payload.timpExecutie
    obj.status = payload.status or "In procesare"
    obj.termen_confirmat = payload.termenConfirmat

    if payload.user:
        obj.user = payload.user

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