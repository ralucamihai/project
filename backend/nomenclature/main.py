from typing import Optional, List
from datetime import date
from decimal import Decimal, InvalidOperation

from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from nomenclature.models import UtilizatorPMB, GrupMuncaEntity, Piesa, ListaPiese


# ============================== SCHEME (Pydantic) ==============================

class UtilizatorPMBCreate(BaseModel):
    marca: str
    nume: str
    functie: Optional[str] = None
    grup: Optional[str] = None
    acces: bool = True
    user: str
    nivelAcces: str = "Vizualizare"
    activ: bool = True
    dataActiv: Optional[date] = None


class UtilizatorPMBUpdate(UtilizatorPMBCreate):
    id: int


class GrupMunca(BaseModel):
    grup: str
    membri: List[str]


class GrupMuncaCreate(BaseModel):
    nume: str


class PiesaCreate(BaseModel):
    denumire: str
    codSap: Optional[str] = None
    pretRon: Optional[str] = None
    um: Optional[str] = None
    magazie: Optional[str] = None
    pozitieRaft: Optional[str] = None
    stocMinim: Optional[str] = None
    stocCurent: Optional[str] = None
    frecventa: Optional[str] = None
    producator: Optional[str] = None
    partNumber: Optional[str] = None
    moq: Optional[str] = None
    utilizare: Optional[str] = None
    dublura: Optional[str] = None
    excludeDublate: bool = False
    excludeIesiteDinFabricatie: bool = False
    furnizor: Optional[str] = None
    refFurnizor: Optional[str] = None
    furnizor1: Optional[str] = None
    refFurn1: Optional[str] = None
    furnizor2: Optional[str] = None
    refFurn2: Optional[str] = None


class PiesaUpdate(PiesaCreate):
    id: int


class ListaPieseCreate(BaseModel):
    nrLista: str
    denumire: str


class ListaPieseUpdate(ListaPieseCreate):
    id: int


# ---- Serializare: rand DB (snake_case) -> dict (camelCase, ca in Angular) ----

def serialize_utilizator(u: UtilizatorPMB):
    return {
        "id": u.id,
        "marca": u.marca,
        "nume": u.nume,
        "functie": u.functie,
        "grup": u.grup,
        "acces": u.acces,
        "user": u.user,
        "nivelAcces": u.nivel_acces,
        "activ": u.activ,
        "dataActiv": u.data_activ.isoformat() if u.data_activ else None,
    }


def _to_int(val: Optional[str]) -> Optional[int]:
    if val is None or str(val).strip() == "":
        return None
    try:
        return int(str(val).strip())
    except ValueError:
        return None


def _to_decimal(val: Optional[str]) -> Optional[Decimal]:
    if val is None or str(val).strip() == "":
        return None
    try:
        return Decimal(str(val).strip().replace(",", "."))
    except InvalidOperation:
        return None


def serialize_piesa(p: Piesa):
    return {
        "id": p.id,
        "denumire": p.denumire,
        "codSap": p.cod_sap,
        "pretRon": str(p.pret_ron) if p.pret_ron is not None else "",
        "um": p.um,
        "magazie": p.magazie,
        "pozitieRaft": p.pozitie_raft,
        "stocMinim": str(p.stoc_minim) if p.stoc_minim is not None else "",
        "stocCurent": str(p.stoc_curent) if p.stoc_curent is not None else "",
        "frecventa": p.frecventa,
        "producator": p.producator,
        "partNumber": p.part_number,
        "moq": p.moq,
        "utilizare": p.utilizare,
        "dublura": p.dublura,
        "excludeDublate": p.exclude_dublate,
        "excludeIesiteDinFabricatie": p.exclude_iesite_din_fabricatie,
        "furnizor": p.furnizor,
        "refFurnizor": p.ref_furnizor,
        "furnizor1": p.furnizor1,
        "refFurn1": p.ref_furn1,
        "furnizor2": p.furnizor2,
        "refFurn2": p.ref_furn2,
    }


def serialize_lista_piese(l: ListaPiese):
    return {
        "id": l.id,
        "nrLista": l.nr_lista,
        "denumire": l.denumire,
        "pieseIds": [p.id for p in l.piese],
    }


# ============================== UTILIZATORI PMB ==============================

def get_all_utilizatori_pmb(db: Session):
    return [
        serialize_utilizator(u)
        for u in db.query(UtilizatorPMB).order_by(UtilizatorPMB.nume.asc()).all()
    ]


def create_utilizator_pmb(db: Session, payload: UtilizatorPMBCreate):
    obj = UtilizatorPMB(
        marca=payload.marca,
        nume=payload.nume,
        functie=payload.functie,
        grup=payload.grup,
        acces=payload.acces,
        user=payload.user,
        nivel_acces=payload.nivelAcces,
        activ=payload.activ,
        data_activ=payload.dataActiv,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return serialize_utilizator(obj)


def update_utilizator_pmb(db: Session, payload: UtilizatorPMBUpdate):
    obj = db.query(UtilizatorPMB).filter(UtilizatorPMB.id == payload.id).first()
    if not obj:
        return None

    obj.marca = payload.marca
    obj.nume = payload.nume
    obj.functie = payload.functie
    obj.grup = payload.grup
    obj.acces = payload.acces
    obj.user = payload.user
    obj.nivel_acces = payload.nivelAcces
    obj.activ = payload.activ
    obj.data_activ = payload.dataActiv

    db.commit()
    db.refresh(obj)
    return serialize_utilizator(obj)


def delete_utilizator_pmb(db: Session, utilizator_id: int):
    obj = db.query(UtilizatorPMB).filter(UtilizatorPMB.id == utilizator_id).first()
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True


def toggle_activ_utilizator_pmb(db: Session, utilizator_id: int):
    obj = db.query(UtilizatorPMB).filter(UtilizatorPMB.id == utilizator_id).first()
    if not obj:
        return None
    obj.activ = not obj.activ
    db.commit()
    db.refresh(obj)
    return serialize_utilizator(obj)


# ============================== GRUPURI MUNCA ==============================
# Grupurile "exista" acum in doua locuri, combinate la citire:
#   1. nom_grupuri_munca  -> lista oficiala de grupuri (create manual din UI)
#   2. UtilizatorPMB.grup -> cine e alocat in fiecare grup (text liber)
#
# Un grup din (1) fara niciun utilizator din (2) apare cu membri: [].

def get_grupuri_munca(db: Session) -> List[dict]:
    grupuri_definite = (
        db.query(GrupMuncaEntity).order_by(GrupMuncaEntity.nume.asc()).all()
    )

    rows = (
        db.query(UtilizatorPMB.grup, UtilizatorPMB.user)
        .filter(UtilizatorPMB.grup.isnot(None), UtilizatorPMB.grup != "")
        .filter(UtilizatorPMB.activ.is_(True))
        .all()
    )

    # cheie normalizata (trim + lower) -> {"label": eticheta originala, "membri": [...]}
    membri_pe_grup: dict = {}
    for grup_raw, user in rows:
        cheie = grup_raw.strip().lower()
        if cheie not in membri_pe_grup:
            membri_pe_grup[cheie] = {"label": grup_raw.strip(), "membri": []}
        if user and user not in membri_pe_grup[cheie]["membri"]:
            membri_pe_grup[cheie]["membri"].append(user)

    rezultat = []
    chei_definite = set()

    for g in grupuri_definite:
        cheie = g.nume.strip().lower()
        chei_definite.add(cheie)
        info = membri_pe_grup.get(cheie)
        rezultat.append({
            "grup": g.nume,
            "membri": info["membri"] if info else [],
        })

    # Siguranta pentru date vechi: daca un utilizator are un `grup` text
    # care nu a fost (inca) definit explicit in nom_grupuri_munca, il
    # afisam oricum, ca sa nu "dispara" din pagina.
    for cheie, info in membri_pe_grup.items():
        if cheie not in chei_definite:
            rezultat.append({"grup": info["label"], "membri": info["membri"]})

    return sorted(rezultat, key=lambda g: g["grup"].lower())


def create_grup_munca(db: Session, payload: GrupMuncaCreate):
    nume_curatat = payload.nume.strip()
    if not nume_curatat:
        return None

    exista = (
        db.query(GrupMuncaEntity)
        .filter(GrupMuncaEntity.nume.ilike(nume_curatat))
        .first()
    )
    if exista:
        return "DUPLICAT"

    obj = GrupMuncaEntity(nume=nume_curatat)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return {"grup": obj.nume, "membri": []}


# ============================== PIESE ==============================

def _piesa_din_payload(obj: Piesa, payload: PiesaCreate):
    obj.denumire = payload.denumire
    obj.cod_sap = payload.codSap
    obj.pret_ron = _to_decimal(payload.pretRon)
    obj.um = payload.um
    obj.magazie = payload.magazie
    obj.pozitie_raft = payload.pozitieRaft
    obj.stoc_minim = _to_int(payload.stocMinim)
    obj.stoc_curent = _to_int(payload.stocCurent)
    obj.frecventa = payload.frecventa
    obj.producator = payload.producator
    obj.part_number = payload.partNumber
    obj.moq = payload.moq
    obj.utilizare = payload.utilizare
    obj.dublura = payload.dublura
    obj.exclude_dublate = payload.excludeDublate
    obj.exclude_iesite_din_fabricatie = payload.excludeIesiteDinFabricatie
    obj.furnizor = payload.furnizor
    obj.ref_furnizor = payload.refFurnizor
    obj.furnizor1 = payload.furnizor1
    obj.ref_furn1 = payload.refFurn1
    obj.furnizor2 = payload.furnizor2
    obj.ref_furn2 = payload.refFurn2
    return obj


def get_all_piese(db: Session):
    return [
        serialize_piesa(p)
        for p in db.query(Piesa).order_by(Piesa.denumire.asc()).all()
    ]


def create_piesa(db: Session, payload: PiesaCreate):
    obj = _piesa_din_payload(Piesa(), payload)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return serialize_piesa(obj)


def update_piesa(db: Session, payload: PiesaUpdate):
    obj = db.query(Piesa).filter(Piesa.id == payload.id).first()
    if not obj:
        return None
    _piesa_din_payload(obj, payload)
    db.commit()
    db.refresh(obj)
    return serialize_piesa(obj)


def delete_piesa(db: Session, piesa_id: int):
    obj = db.query(Piesa).filter(Piesa.id == piesa_id).first()
    if not obj:
        return False
    db.delete(obj)  # scoaterea din nom_lista_piesa se face automat (relatie many-to-many)
    db.commit()
    return True


# ============================== LISTE DE PIESE ==============================

def get_all_liste_piese(db: Session):
    liste = (
        db.query(ListaPiese)
        .options(joinedload(ListaPiese.piese))
        .order_by(ListaPiese.nr_lista.asc())
        .all()
    )
    return [serialize_lista_piese(l) for l in liste]


def create_lista_piese(db: Session, payload: ListaPieseCreate):
    obj = ListaPiese(nr_lista=payload.nrLista, denumire=payload.denumire)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return serialize_lista_piese(obj)


def update_lista_piese(db: Session, payload: ListaPieseUpdate):
    obj = db.query(ListaPiese).filter(ListaPiese.id == payload.id).first()
    if not obj:
        return None
    obj.nr_lista = payload.nrLista
    obj.denumire = payload.denumire
    db.commit()
    db.refresh(obj)
    return serialize_lista_piese(obj)


def delete_lista_piese(db: Session, lista_id: int):
    obj = db.query(ListaPiese).filter(ListaPiese.id == lista_id).first()
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True


def adauga_piesa_in_lista(db: Session, lista_id: int, piesa_id: int):
    lista = db.query(ListaPiese).filter(ListaPiese.id == lista_id).first()
    piesa = db.query(Piesa).filter(Piesa.id == piesa_id).first()
    if not lista or not piesa:
        return None
    if piesa not in lista.piese:
        lista.piese.append(piesa)
        db.commit()
        db.refresh(lista)
    return serialize_lista_piese(lista)


def scoate_piesa_din_lista(db: Session, lista_id: int, piesa_id: int):
    lista = db.query(ListaPiese).filter(ListaPiese.id == lista_id).first()
    piesa = db.query(Piesa).filter(Piesa.id == piesa_id).first()
    if not lista or not piesa:
        return None
    if piesa in lista.piese:
        lista.piese.remove(piesa)
        db.commit()
        db.refresh(lista)
    return serialize_lista_piese(lista)