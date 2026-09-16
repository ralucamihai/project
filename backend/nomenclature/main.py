from typing import Optional, List
from datetime import date
from decimal import Decimal, InvalidOperation

from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from nomenclature.models import UtilizatorPMB, GrupMuncaEntity, Piesa, ListaPiese, Sectie, TipEchipament, CategorieDefect, OperatieLogistica, TipInterventie, OperatieMentenanta, ListaOperatii

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
    departament: Optional[str] = None
    membri: List[str]

class GrupMuncaCreate(BaseModel):
    nume: str
    departament: Optional[str] = None

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

class SectieCreate(BaseModel):
    sectie: str
    sectieMiniBde: Optional[str] = None
    linia: Optional[str] = None
    liniaMiniBde: Optional[str] = None
    sefSectie: Optional[str] = None
    sefLinie1: Optional[str] = None
    sefLinie2: Optional[str] = None
    electrosecuritateLuna: Optional[str] = "na"
    electrosecuritateResponsabil: Optional[str] = None
    esdLuna: Optional[str] = "na"
    esdResponsabil: Optional[str] = None

class SectieUpdate(SectieCreate):
    id: int

class TipEchipamentCreate(BaseModel):
    cod_line: Optional[str] = None
    denumire: str
    mentenanta_ac: Optional[str] = "NA"
    mentenanta_prev: Optional[str] = "na"
    calibrare: Optional[str] = "na"
    esd: Optional[str] = "NA"
    electrosecuritate: Optional[str] = "NA"
    backup: Optional[str] = "na"
    ssm: Optional[str] = "NA"
    isqw: Optional[str] = "NA"
    lista_piese: Optional[str] = None
    lista_operatii: Optional[str] = None
    responsabil: Optional[str] = None

class TipEchipamentUpdate(TipEchipamentCreate):
    id: int

class CategorieDefectCreate(BaseModel):
    idCategorie: str
    denumire: str

class CategorieDefectUpdate(CategorieDefectCreate):
    id: int

class OperatieCreate(BaseModel):
    cod: str
    denumireRO: str
    denumireDE: Optional[str] = None

class OperatieUpdate(OperatieCreate):
    id: int

class TipInterventieCreate(BaseModel):
    denumire: str

class TipInterventieUpdate(TipInterventieCreate):
    id: int

# ---- SCHEME NOI: OPERAȚII MENTENANȚĂ ----
class OperatieMentenantaCreate(BaseModel):
    denumire: str
    ord: Optional[str] = None
    luni: Optional[str] = None
    dataOra: Optional[str] = None
    timp: Optional[str] = None
    instructiune: Optional[str] = None
    sculeSpeciale: Optional[str] = None
    prioritate: Optional[str] = "Medie"
    autonoma: bool = False
    preventiva: bool = False

class OperatieMentenantaUpdate(OperatieMentenantaCreate):
    id: int

class ListaOperatiiCreate(BaseModel):
    denumire: str
    timp: Optional[str] = None

class ListaOperatiiUpdate(ListaOperatiiCreate):
    id: int


# ============================== FUNCȚII SERIALIZARE & CRUD ==============================

def serialize_utilizator(u: UtilizatorPMB):
    return {
        "id": u.id, "marca": u.marca, "nume": u.nume, "functie": u.functie,
        "grup": u.grup, "acces": u.acces, "user": u.user, "nivelAcces": u.nivel_acces,
        "activ": u.activ, "dataActiv": u.data_activ.isoformat() if u.data_activ else None,
    }

def _to_int(val: Optional[str]) -> Optional[int]:
    if val is None or str(val).strip() == "": return None
    try: return int(str(val).strip())
    except ValueError: return None

def _to_decimal(val: Optional[str]) -> Optional[Decimal]:
    if val is None or str(val).strip() == "": return None
    try: return Decimal(str(val).strip().replace(",", "."))
    except InvalidOperation: return None

def serialize_piesa(p: Piesa):
    return {
        "id": p.id, "denumire": p.denumire, "codSap": p.cod_sap, "pretRon": str(p.pret_ron) if p.pret_ron is not None else "",
        "um": p.um, "magazie": p.magazie, "pozitieRaft": p.pozitie_raft, "stocMinim": str(p.stoc_minim) if p.stoc_minim is not None else "",
        "stocCurent": str(p.stoc_curent) if p.stoc_curent is not None else "", "frecventa": p.frecventa, "producator": p.producator,
        "partNumber": p.part_number, "moq": p.moq, "utilizare": p.utilizare, "dublura": p.dublura,
        "excludeDublate": p.exclude_dublate, "excludeIesiteDinFabricatie": p.exclude_iesite_din_fabricatie,
        "furnizor": p.furnizor, "refFurnizor": p.ref_furnizor, "furnizor1": p.furnizor1, "refFurn1": p.ref_furn1,
        "furnizor2": p.furnizor2, "refFurn2": p.ref_furn2,
    }

def serialize_lista_piese(l: ListaPiese):
    return { "id": l.id, "nrLista": l.nr_lista, "denumire": l.denumire, "pieseIds": [p.id for p in l.piese] }

def serialize_sectie(s: Sectie):
    return {
        "id": s.id, "sectie": s.sectie, "sectieMiniBde": s.sectie_mini_bde, "linia": s.linia, "liniaMiniBde": s.linia_mini_bde,
        "sefSectie": s.sef_sectie, "sefLinie1": s.sef_linie1, "sefLinie2": s.sef_linie2,
        "electrosecuritateLuna": s.electrosecuritate_luna, "electrosecuritateResponsabil": s.electrosecuritate_responsabil,
        "esdLuna": s.esd_luna, "esdResponsabil": s.esd_responsabil,
    }

def serialize_tip_echipament(t: TipEchipament):
    return {
        "id": t.id, "cod_line": t.cod_line, "denumire": t.denumire, "mentenanta_ac": t.mentenanta_ac,
        "mentenanta_prev": t.mentenanta_prev, "calibrare": t.calibrare, "esd": t.esd, "electrosecuritate": t.electrosecuritate,
        "backup": t.backup, "ssm": t.ssm, "isqw": t.isqw, "lista_piese": t.lista_piese, "lista_operatii": t.lista_operatii, "responsabil": t.responsabil,
    }

def serialize_categorie_defect(c: CategorieDefect):
    return { "id": c.id, "idCategorie": c.id_categorie, "denumire": c.denumire }

def serialize_operatie(o: OperatieLogistica):
    return { "id": o.id, "cod": o.cod, "denumireRO": o.denumire_ro, "denumireDE": o.denumire_de }

def serialize_tip_interventie(t: TipInterventie):
    return { "id": t.id, "denumire": t.denumire }

def serialize_operatie_mentenanta(o: OperatieMentenanta):
    return {
        "id": o.id, "denumire": o.denumire, "ord": o.ord, "luni": o.luni, "dataOra": o.data_ora, "timp": o.timp,
        "instructiune": o.instructiune, "sculeSpeciale": o.scule_speciale, "prioritate": o.prioritate,
        "autonoma": o.autonoma, "preventiva": o.preventiva,
    }

def serialize_lista_operatii(l: ListaOperatii):
    return { "id": l.id, "denumire": l.denumire, "timp": l.timp, "operatiiIds": [o.id for o in l.operatii] }

# ---- DB: Utilizatori ----
def get_all_utilizatori_pmb(db: Session): return [serialize_utilizator(u) for u in db.query(UtilizatorPMB).order_by(UtilizatorPMB.nume.asc()).all()]
def create_utilizator_pmb(db: Session, payload: UtilizatorPMBCreate):
    obj = UtilizatorPMB(marca=payload.marca, nume=payload.nume, functie=payload.functie, grup=payload.grup, acces=payload.acces, user=payload.user, nivel_acces=payload.nivelAcces, activ=payload.activ, data_activ=payload.dataActiv)
    db.add(obj); db.commit(); db.refresh(obj)
    return serialize_utilizator(obj)
def update_utilizator_pmb(db: Session, payload: UtilizatorPMBUpdate):
    obj = db.query(UtilizatorPMB).filter(UtilizatorPMB.id == payload.id).first()
    if not obj: return None
    obj.marca = payload.marca; obj.nume = payload.nume; obj.functie = payload.functie; obj.grup = payload.grup; obj.acces = payload.acces; obj.user = payload.user; obj.nivel_acces = payload.nivelAcces; obj.activ = payload.activ; obj.data_activ = payload.dataActiv
    db.commit(); db.refresh(obj)
    return serialize_utilizator(obj)
def delete_utilizator_pmb(db: Session, utilizator_id: int):
    obj = db.query(UtilizatorPMB).filter(UtilizatorPMB.id == utilizator_id).first()
    if not obj: return False
    db.delete(obj); db.commit()
    return True
def toggle_activ_utilizator_pmb(db: Session, utilizator_id: int):
    obj = db.query(UtilizatorPMB).filter(UtilizatorPMB.id == utilizator_id).first()
    if not obj: return None
    obj.activ = not obj.activ
    db.commit(); db.refresh(obj)
    return serialize_utilizator(obj)

# ---- DB: Grupuri ----
def get_grupuri_munca(db: Session) -> List[dict]:
    grupuri_definite = db.query(GrupMuncaEntity).order_by(GrupMuncaEntity.nume.asc()).all()
    rows = db.query(UtilizatorPMB.grup, UtilizatorPMB.user).filter(UtilizatorPMB.grup.isnot(None), UtilizatorPMB.grup != "").filter(UtilizatorPMB.activ.is_(True)).all()
    membri_pe_grup: dict = {}
    for grup_raw, user in rows:
        cheie = grup_raw.strip().lower()
        if cheie not in membri_pe_grup: membri_pe_grup[cheie] = {"label": grup_raw.strip(), "membri": []}
        if user and user not in membri_pe_grup[cheie]["membri"]: membri_pe_grup[cheie]["membri"].append(user)
    rezultat = []
    chei_definite = set()
    for g in grupuri_definite:
        cheie = g.nume.strip().lower()
        chei_definite.add(cheie)
        info = membri_pe_grup.get(cheie)
        rezultat.append({"grup": g.nume, "departament": g.departament, "membri": info["membri"] if info else []})
    for cheie, info in membri_pe_grup.items():
        if cheie not in chei_definite: rezultat.append({"grup": info["label"], "departament": None, "membri": info["membri"]})
    return sorted(rezultat, key=lambda g: g["grup"].lower())

def create_grup_munca(db: Session, payload: GrupMuncaCreate):
    nume_curatat = payload.nume.strip()
    if not nume_curatat: return None
    exista = db.query(GrupMuncaEntity).filter(GrupMuncaEntity.nume.ilike(nume_curatat)).first()
    if exista: return "DUPLICAT"
    obj = GrupMuncaEntity(nume=nume_curatat, departament=payload.departament)
    db.add(obj); db.commit(); db.refresh(obj)
    return {"grup": obj.nume, "departament": obj.departament, "membri": []}

# ---- DB: Piese ----
def _piesa_din_payload(obj: Piesa, payload: PiesaCreate):
    obj.denumire = payload.denumire; obj.cod_sap = payload.codSap; obj.pret_ron = _to_decimal(payload.pretRon); obj.um = payload.um; obj.magazie = payload.magazie; obj.pozitie_raft = payload.pozitieRaft; obj.stoc_minim = _to_int(payload.stocMinim); obj.stoc_curent = _to_int(payload.stocCurent); obj.frecventa = payload.frecventa; obj.producator = payload.producator; obj.part_number = payload.partNumber; obj.moq = payload.moq; obj.utilizare = payload.utilizare; obj.dublura = payload.dublura; obj.exclude_dublate = payload.excludeDublate; obj.exclude_iesite_din_fabricatie = payload.excludeIesiteDinFabricatie; obj.furnizor = payload.furnizor; obj.ref_furnizor = payload.refFurnizor; obj.furnizor1 = payload.furnizor1; obj.ref_furn1 = payload.refFurn1; obj.furnizor2 = payload.furnizor2; obj.ref_furn2 = payload.refFurn2
    return obj

def get_all_piese(db: Session): return [serialize_piesa(p) for p in db.query(Piesa).order_by(Piesa.denumire.asc()).all()]
def create_piesa(db: Session, payload: PiesaCreate):
    obj = _piesa_din_payload(Piesa(), payload)
    db.add(obj); db.commit(); db.refresh(obj)
    return serialize_piesa(obj)
def update_piesa(db: Session, payload: PiesaUpdate):
    obj = db.query(Piesa).filter(Piesa.id == payload.id).first()
    if not obj: return None
    _piesa_din_payload(obj, payload)
    db.commit(); db.refresh(obj)
    return serialize_piesa(obj)
def delete_piesa(db: Session, piesa_id: int):
    obj = db.query(Piesa).filter(Piesa.id == piesa_id).first()
    if not obj: return False
    db.delete(obj); db.commit()
    return True

# ---- DB: Liste Piese ----
def get_all_liste_piese(db: Session): return [serialize_lista_piese(l) for l in db.query(ListaPiese).options(joinedload(ListaPiese.piese)).order_by(ListaPiese.nr_lista.asc()).all()]
def create_lista_piese(db: Session, payload: ListaPieseCreate):
    obj = ListaPiese(nr_lista=payload.nrLista, denumire=payload.denumire)
    db.add(obj); db.commit(); db.refresh(obj)
    return serialize_lista_piese(obj)
def update_lista_piese(db: Session, payload: ListaPieseUpdate):
    obj = db.query(ListaPiese).filter(ListaPiese.id == payload.id).first()
    if not obj: return None
    obj.nr_lista = payload.nrLista; obj.denumire = payload.denumire
    db.commit(); db.refresh(obj)
    return serialize_lista_piese(obj)
def delete_lista_piese(db: Session, lista_id: int):
    obj = db.query(ListaPiese).filter(ListaPiese.id == lista_id).first()
    if not obj: return False
    db.delete(obj); db.commit()
    return True
def adauga_piesa_in_lista(db: Session, lista_id: int, piesa_id: int):
    lista = db.query(ListaPiese).filter(ListaPiese.id == lista_id).first()
    piesa = db.query(Piesa).filter(Piesa.id == piesa_id).first()
    if not lista or not piesa: return None
    if piesa not in lista.piese: lista.piese.append(piesa); db.commit(); db.refresh(lista)
    return serialize_lista_piese(lista)
def scoate_piesa_din_lista(db: Session, lista_id: int, piesa_id: int):
    lista = db.query(ListaPiese).filter(ListaPiese.id == lista_id).first()
    piesa = db.query(Piesa).filter(Piesa.id == piesa_id).first()
    if not lista or not piesa: return None
    if piesa in lista.piese: lista.piese.remove(piesa); db.commit(); db.refresh(lista)
    return serialize_lista_piese(lista)

# ---- DB: Sectii ----
def _sectie_din_payload(obj: Sectie, payload: SectieCreate):
    obj.sectie = payload.sectie; obj.sectie_mini_bde = payload.sectieMiniBde; obj.linia = payload.linia; obj.linia_mini_bde = payload.liniaMiniBde; obj.sef_sectie = payload.sefSectie; obj.sef_linie1 = payload.sefLinie1; obj.sef_linie2 = payload.sefLinie2; obj.electrosecuritate_luna = payload.electrosecuritateLuna; obj.electrosecuritate_responsabil = payload.electrosecuritateResponsabil; obj.esd_luna = payload.esdLuna; obj.esd_responsabil = payload.esdResponsabil
    return obj
def get_all_sectii(db: Session): return [serialize_sectie(s) for s in db.query(Sectie).order_by(Sectie.sectie.asc()).all()]
def create_sectie(db: Session, payload: SectieCreate):
    obj = _sectie_din_payload(Sectie(), payload)
    db.add(obj); db.commit(); db.refresh(obj)
    return serialize_sectie(obj)
def update_sectie(db: Session, payload: SectieUpdate):
    obj = db.query(Sectie).filter(Sectie.id == payload.id).first()
    if not obj: return None
    _sectie_din_payload(obj, payload)
    db.commit(); db.refresh(obj)
    return serialize_sectie(obj)
def delete_sectie(db: Session, sectie_id: int):
    obj = db.query(Sectie).filter(Sectie.id == sectie_id).first()
    if not obj: return False
    db.delete(obj); db.commit()
    return True

# ---- DB: Tip Echipament ----
def _tip_echipament_din_payload(obj: TipEchipament, payload: TipEchipamentCreate):
    obj.cod_line = payload.cod_line; obj.denumire = payload.denumire; obj.mentenanta_ac = payload.mentenanta_ac; obj.mentenanta_prev = payload.mentenanta_prev; obj.calibrare = payload.calibrare; obj.esd = payload.esd; obj.electrosecuritate = payload.electrosecuritate; obj.backup = payload.backup; obj.ssm = payload.ssm; obj.isqw = payload.isqw; obj.lista_piese = payload.lista_piese; obj.lista_operatii = payload.lista_operatii; obj.responsabil = payload.responsabil
    return obj
def get_all_tipuri_echipament(db: Session): return [serialize_tip_echipament(t) for t in db.query(TipEchipament).order_by(TipEchipament.denumire.asc()).all()]
def create_tip_echipament(db: Session, payload: TipEchipamentCreate):
    obj = _tip_echipament_din_payload(TipEchipament(), payload)
    db.add(obj); db.commit(); db.refresh(obj)
    return serialize_tip_echipament(obj)
def update_tip_echipament(db: Session, payload: TipEchipamentUpdate):
    obj = db.query(TipEchipament).filter(TipEchipament.id == payload.id).first()
    if not obj: return None
    _tip_echipament_din_payload(obj, payload)
    db.commit(); db.refresh(obj)
    return serialize_tip_echipament(obj)
def delete_tip_echipament(db: Session, tip_id: int):
    obj = db.query(TipEchipament).filter(TipEchipament.id == tip_id).first()
    if not obj: return False
    db.delete(obj); db.commit()
    return True

# ---- DB: Categorie Defect ----
def get_all_categorii_defect(db: Session): return [serialize_categorie_defect(c) for c in db.query(CategorieDefect).order_by(CategorieDefect.id_categorie.asc()).all()]
def create_categorie_defect(db: Session, payload: CategorieDefectCreate):
    id_curatat = payload.idCategorie.strip()
    if db.query(CategorieDefect).filter(CategorieDefect.id_categorie.ilike(id_curatat)).first(): return "DUPLICAT"
    obj = CategorieDefect(id_categorie=id_curatat, denumire=payload.denumire)
    db.add(obj); db.commit(); db.refresh(obj)
    return serialize_categorie_defect(obj)
def update_categorie_defect(db: Session, payload: CategorieDefectUpdate):
    obj = db.query(CategorieDefect).filter(CategorieDefect.id == payload.id).first()
    if not obj: return None
    id_curatat = payload.idCategorie.strip()
    if db.query(CategorieDefect).filter(CategorieDefect.id_categorie.ilike(id_curatat)).filter(CategorieDefect.id != payload.id).first(): return "DUPLICAT"
    obj.id_categorie = id_curatat; obj.denumire = payload.denumire
    db.commit(); db.refresh(obj)
    return serialize_categorie_defect(obj)
def delete_categorie_defect(db: Session, categorie_id: int):
    obj = db.query(CategorieDefect).filter(CategorieDefect.id == categorie_id).first()
    if not obj: return False
    db.delete(obj); db.commit()
    return True

# ---- DB: Operatii Logistice ----
def get_all_operatii(db: Session): return [serialize_operatie(o) for o in db.query(OperatieLogistica).order_by(OperatieLogistica.cod.asc()).all()]
def create_operatie(db: Session, payload: OperatieCreate):
    cod_curatat = payload.cod.strip()
    if db.query(OperatieLogistica).filter(OperatieLogistica.cod.ilike(cod_curatat)).first(): return "DUPLICAT"
    obj = OperatieLogistica(cod=cod_curatat, denumire_ro=payload.denumireRO, denumire_de=payload.denumireDE)
    db.add(obj); db.commit(); db.refresh(obj)
    return serialize_operatie(obj)
def update_operatie(db: Session, payload: OperatieUpdate):
    obj = db.query(OperatieLogistica).filter(OperatieLogistica.id == payload.id).first()
    if not obj: return None
    obj.cod = payload.cod.strip(); obj.denumire_ro = payload.denumireRO; obj.denumire_de = payload.denumireDE
    db.commit(); db.refresh(obj)
    return serialize_operatie(obj)
def delete_operatie(db: Session, operatie_id: int):
    obj = db.query(OperatieLogistica).filter(OperatieLogistica.id == operatie_id).first()
    if not obj: return False
    db.delete(obj); db.commit()
    return True

# ---- DB: Tip Interventie ----
def get_all_tip_interventie(db: Session): return [serialize_tip_interventie(t) for t in db.query(TipInterventie).order_by(TipInterventie.denumire.asc()).all()]
def create_tip_interventie(db: Session, payload: TipInterventieCreate):
    denumire_curatata = payload.denumire.strip()
    if db.query(TipInterventie).filter(TipInterventie.denumire.ilike(denumire_curatata)).first(): return "DUPLICAT"
    obj = TipInterventie(denumire=denumire_curatata)
    db.add(obj); db.commit(); db.refresh(obj)
    return serialize_tip_interventie(obj)
def update_tip_interventie(db: Session, payload: TipInterventieUpdate):
    obj = db.query(TipInterventie).filter(TipInterventie.id == payload.id).first()
    if not obj: return None
    denumire_curatata = payload.denumire.strip()
    if db.query(TipInterventie).filter(TipInterventie.denumire.ilike(denumire_curatata)).filter(TipInterventie.id != payload.id).first(): return "DUPLICAT"
    obj.denumire = denumire_curatata
    db.commit(); db.refresh(obj)
    return serialize_tip_interventie(obj)
def delete_tip_interventie(db: Session, tip_interventie_id: int):
    obj = db.query(TipInterventie).filter(TipInterventie.id == tip_interventie_id).first()
    if not obj: return False
    db.delete(obj); db.commit()
    return True

# ---- DB: OPERAȚII MENTENANȚĂ (NOU) ----
def get_all_operatii_mentenanta(db: Session): return [serialize_operatie_mentenanta(o) for o in db.query(OperatieMentenanta).order_by(OperatieMentenanta.denumire.asc()).all()]
def create_operatie_mentenanta(db: Session, payload: OperatieMentenantaCreate):
    obj = OperatieMentenanta(
        denumire=payload.denumire, ord=payload.ord, luni=payload.luni, data_ora=payload.dataOra, timp=payload.timp,
        instructiune=payload.instructiune, scule_speciale=payload.sculeSpeciale, prioritate=payload.prioritate,
        autonoma=payload.autonoma, preventiva=payload.preventiva,
    )
    db.add(obj); db.commit(); db.refresh(obj)
    return serialize_operatie_mentenanta(obj)
def update_operatie_mentenanta(db: Session, payload: OperatieMentenantaUpdate):
    obj = db.query(OperatieMentenanta).filter(OperatieMentenanta.id == payload.id).first()
    if not obj: return None
    obj.denumire = payload.denumire; obj.ord = payload.ord; obj.luni = payload.luni; obj.data_ora = payload.dataOra; obj.timp = payload.timp
    obj.instructiune = payload.instructiune; obj.scule_speciale = payload.sculeSpeciale; obj.prioritate = payload.prioritate
    obj.autonoma = payload.autonoma; obj.preventiva = payload.preventiva
    db.commit(); db.refresh(obj)
    return serialize_operatie_mentenanta(obj)
def delete_operatie_mentenanta(db: Session, op_id: int):
    obj = db.query(OperatieMentenanta).filter(OperatieMentenanta.id == op_id).first()
    if not obj: return False
    db.delete(obj); db.commit()
    return True

# ---- DB: LISTE OPERAȚII MENTENANȚĂ (NOU) ----
def get_all_liste_operatii(db: Session): return [serialize_lista_operatii(l) for l in db.query(ListaOperatii).options(joinedload(ListaOperatii.operatii)).all()]
def create_lista_operatii(db: Session, payload: ListaOperatiiCreate):
    obj = ListaOperatii(denumire=payload.denumire, timp=payload.timp)
    db.add(obj); db.commit(); db.refresh(obj)
    return serialize_lista_operatii(obj)
def update_lista_operatii(db: Session, payload: ListaOperatiiUpdate):
    obj = db.query(ListaOperatii).filter(ListaOperatii.id == payload.id).first()
    if not obj: return None
    obj.denumire = payload.denumire; obj.timp = payload.timp
    db.commit(); db.refresh(obj)
    return serialize_lista_operatii(obj)
def delete_lista_operatii(db: Session, lista_id: int):
    obj = db.query(ListaOperatii).filter(ListaOperatii.id == lista_id).first()
    if not obj: return False
    db.delete(obj); db.commit()
    return True
def adauga_op_in_lista(db: Session, lista_id: int, op_id: int):
    lista = db.query(ListaOperatii).filter(ListaOperatii.id == lista_id).first()
    op = db.query(OperatieMentenanta).filter(OperatieMentenanta.id == op_id).first()
    if not lista or not op: return None
    if op not in lista.operatii: lista.operatii.append(op); db.commit(); db.refresh(lista)
    return serialize_lista_operatii(lista)
def scoate_op_din_lista(db: Session, lista_id: int, op_id: int):
    lista = db.query(ListaOperatii).filter(ListaOperatii.id == lista_id).first()
    op = db.query(OperatieMentenanta).filter(OperatieMentenanta.id == op_id).first()
    if not lista or not op: return None
    if op in lista.operatii: lista.operatii.remove(op); db.commit(); db.refresh(lista)
    return serialize_lista_operatii(lista)