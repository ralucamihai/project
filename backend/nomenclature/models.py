from sqlalchemy import Column, Integer, String, Boolean, Date, Numeric, ForeignKey, Table
from sqlalchemy.orm import relationship

# Presupun ca Base e definit in login/models.py, la fel ca User (conform
# conventiei tale). Daca Base e in alta parte, schimba doar linia de import.
from database import Base


class UtilizatorPMB(Base):
    """
    Sursa unica pentru utilizatorii PMB. Grupul (`grup`) e text liber,
    scris de admin la mana - se coreleaza cu GrupMuncaEntity.nume doar
    prin continut (nu e foreign key), ca sa nu stricam datele vechi.
    """
    __tablename__ = "nom_utilizatori_pmb"

    id = Column(Integer, primary_key=True, index=True)
    marca = Column(String(50), nullable=False)
    nume = Column(String(150), nullable=False)
    functie = Column(String(150), nullable=True)
    grup = Column(String(100), nullable=True, index=True)
    acces = Column(Boolean, default=True)
    user = Column(String(50), unique=True, nullable=False, index=True)
    nivel_acces = Column(String(25), nullable=False, default="Vizualizare")  # Admin | Editare | Vizualizare
    activ = Column(Boolean, default=True)
    data_activ = Column(Date, nullable=True)


class GrupMuncaEntity(Base):
    """
    Grupurile de lucru definite explicit din pagina Nomenclator > Grupuri.
    Spre deosebire de UtilizatorPMB.grup (text liber), aici un grup poate
    exista chiar daca nu are inca niciun utilizator alocat - membrii se
    calculeaza separat, la citire, din UtilizatorPMB.grup.
    """
    __tablename__ = "nom_grupuri_munca"

    id = Column(Integer, primary_key=True, index=True)
    nume = Column(String(100), unique=True, nullable=False, index=True)
    departament = Column(String(50), nullable=True)


# ============================== PIESE ==============================

nom_lista_piesa = Table(
    "nom_lista_piesa",
    Base.metadata,
    Column("lista_id", Integer, ForeignKey("nom_liste_piese.id", ondelete="CASCADE"), primary_key=True),
    Column("piesa_id", Integer, ForeignKey("nom_piese.id", ondelete="CASCADE"), primary_key=True),
)


class Piesa(Base):
    """
    Sursa unica pentru piesele de schimb.
    """
    __tablename__ = "nom_piese"

    id = Column(Integer, primary_key=True, index=True)
    denumire = Column(String(150), nullable=False, index=True)
    cod_sap = Column(String(50), nullable=True, index=True)
    pret_ron = Column(Numeric(10, 2), nullable=True)
    um = Column(String(20), nullable=True)
    magazie = Column(String(50), nullable=True)
    pozitie_raft = Column(String(50), nullable=True)
    stoc_minim = Column(Integer, nullable=True, default=0)
    stoc_curent = Column(Integer, nullable=True, default=0)
    frecventa = Column(String(30), nullable=True)
    producator = Column(String(100), nullable=True)
    part_number = Column(String(100), nullable=True, index=True)
    moq = Column(String(20), nullable=True)
    utilizare = Column(String(255), nullable=True)
    dublura = Column(String(150), nullable=True)
    exclude_dublate = Column(Boolean, default=False)
    exclude_iesite_din_fabricatie = Column(Boolean, default=False)
    furnizor = Column(String(150), nullable=True)
    ref_furnizor = Column(String(100), nullable=True)
    furnizor1 = Column(String(150), nullable=True)
    ref_furn1 = Column(String(100), nullable=True)
    furnizor2 = Column(String(150), nullable=True)
    ref_furn2 = Column(String(100), nullable=True)

    liste = relationship("ListaPiese", secondary=nom_lista_piesa, back_populates="piese")


class ListaPiese(Base):
    """
    Liste de piese (ex: "Listă schimb bandă transport").
    """
    __tablename__ = "nom_liste_piese"

    id = Column(Integer, primary_key=True, index=True)
    nr_lista = Column(String(30), nullable=False, index=True)
    denumire = Column(String(150), nullable=False)

    piese = relationship("Piesa", secondary=nom_lista_piesa, back_populates="liste")


# ============================== SECȚII ==============================

class Sectie(Base):
    __tablename__ = "nom_sectii"

    id = Column(Integer, primary_key=True, index=True)
    sectie = Column(String(150), nullable=False, index=True)
    sectie_mini_bde = Column(String(150), nullable=True)
    linia = Column(String(150), nullable=True)
    linia_mini_bde = Column(String(150), nullable=True)
    sef_sectie = Column(String(150), nullable=True)
    sef_linie1 = Column(String(150), nullable=True)
    sef_linie2 = Column(String(150), nullable=True)
    electrosecuritate_luna = Column(String(20), nullable=True, default="na")
    electrosecuritate_responsabil = Column(String(150), nullable=True)
    esd_luna = Column(String(20), nullable=True, default="na")
    esd_responsabil = Column(String(150), nullable=True)


# ============================== TIP ECHIPAMENT ==============================

class TipEchipament(Base):
    __tablename__ = "nom_tip_echipament"

    id = Column(Integer, primary_key=True, index=True)
    cod_line = Column(String(50), nullable=True)
    denumire = Column(String(150), nullable=False, index=True)
    mentenanta_ac = Column(String(30), nullable=True, default="NA")
    mentenanta_prev = Column(String(30), nullable=True, default="na")
    calibrare = Column(String(30), nullable=True, default="na")
    esd = Column(String(30), nullable=True, default="NA")
    electrosecuritate = Column(String(30), nullable=True, default="NA")
    backup = Column(String(30), nullable=True, default="na")
    ssm = Column(String(30), nullable=True, default="NA")
    isqw = Column(String(30), nullable=True, default="NA")
    lista_piese = Column(String(150), nullable=True)
    lista_operatii = Column(String(150), nullable=True)
    responsabil = Column(String(150), nullable=True)


class TipInterventie(Base):
    __tablename__ = "nom_tip_interventie"

    id = Column(Integer, primary_key=True, index=True)
    denumire = Column(String(100), nullable=False, unique=True, index=True)


class CategorieDefect(Base):
    __tablename__ = "nom_categorii_defect"

    id = Column(Integer, primary_key=True, index=True)
    id_categorie = Column(String(20), nullable=False, unique=True, index=True)
    denumire = Column(String(150), nullable=False)


class OperatieLogistica(Base):
    __tablename__ = "nom_operatii"

    id = Column(Integer, primary_key=True, index=True)
    cod = Column(String(30), nullable=False, unique=True, index=True)
    denumire_ro = Column(String(150), nullable=False)
    denumire_de = Column(String(150), nullable=True)


# ============================== OPERAȚII MENTENANȚĂ (TABUL NOU) ==============================

nom_lista_operatie_asoc = Table(
    "nom_lista_operatie_asoc",
    Base.metadata,
    Column("lista_id", Integer, ForeignKey("nom_liste_operatii.id", ondelete="CASCADE"), primary_key=True),
    Column("operatie_id", Integer, ForeignKey("nom_operatii_mentenanta.id", ondelete="CASCADE"), primary_key=True),
)

class OperatieMentenanta(Base):
    __tablename__ = "nom_operatii_mentenanta"

    id = Column(Integer, primary_key=True, index=True)
    denumire = Column(String(255), nullable=False, index=True)
    ord = Column(String(20), nullable=True) 
    luni = Column(String(50), nullable=True)
    data_ora = Column(String(50), nullable=True)
    timp = Column(String(50), nullable=True)
    instructiune = Column(String(500), nullable=True)
    scule_speciale = Column(String(255), nullable=True)
    prioritate = Column(String(25), nullable=True, default="Medie")
    autonoma = Column(Boolean, default=False)
    preventiva = Column(Boolean, default=False)

    liste = relationship("ListaOperatii", secondary=nom_lista_operatie_asoc, back_populates="operatii")

class ListaOperatii(Base):
    __tablename__ = "nom_liste_operatii"

    id = Column(Integer, primary_key=True, index=True)
    denumire = Column(String(150), nullable=False)
    timp = Column(String(50), nullable=True)

    operatii = relationship("OperatieMentenanta", secondary=nom_lista_operatie_asoc, back_populates="liste")