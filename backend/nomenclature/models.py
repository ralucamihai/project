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


# ============================== PIESE ==============================
# O piesa poate aparea in mai multe liste si o lista poate contine mai
# multe piese -> relatie many-to-many, printr-un tabel de asociere
# simplu (fara coloane in plus, la fel ca pieseIds: number[] din FE).

nom_lista_piesa = Table(
    "nom_lista_piesa",
    Base.metadata,
    Column("lista_id", Integer, ForeignKey("nom_liste_piese.id", ondelete="CASCADE"), primary_key=True),
    Column("piesa_id", Integer, ForeignKey("nom_piese.id", ondelete="CASCADE"), primary_key=True),
)


class Piesa(Base):
    """
    Sursa unica pentru piesele de schimb. Campurile numerice (pret, stoc)
    sunt tinute numeric in DB desi in FE (interfata Piesa) sunt tratate ca
    string - la serializare le trimitem tot ca string, ca sa nu stricam
    contractul existent cu componenta Angular.
    """
    __tablename__ = "nom_piese"

    id = Column(Integer, primary_key=True, index=True)
    # -- coloana 1 (FE) --
    denumire = Column(String(150), nullable=False, index=True)
    cod_sap = Column(String(50), nullable=True, index=True)
    pret_ron = Column(Numeric(10, 2), nullable=True)
    um = Column(String(20), nullable=True)
    magazie = Column(String(50), nullable=True)
    pozitie_raft = Column(String(50), nullable=True)
    stoc_minim = Column(Integer, nullable=True, default=0)
    stoc_curent = Column(Integer, nullable=True, default=0)
    # -- coloana 2 (FE) --
    frecventa = Column(String(30), nullable=True)
    producator = Column(String(100), nullable=True)
    part_number = Column(String(100), nullable=True, index=True)
    moq = Column(String(20), nullable=True)
    utilizare = Column(String(255), nullable=True)
    dublura = Column(String(150), nullable=True)
    exclude_dublate = Column(Boolean, default=False)
    exclude_iesite_din_fabricatie = Column(Boolean, default=False)
    # -- coloana 3 (FE) --
    furnizor = Column(String(150), nullable=True)
    ref_furnizor = Column(String(100), nullable=True)
    furnizor1 = Column(String(150), nullable=True)
    ref_furn1 = Column(String(100), nullable=True)
    furnizor2 = Column(String(150), nullable=True)
    ref_furn2 = Column(String(100), nullable=True)

    liste = relationship("ListaPiese", secondary=nom_lista_piesa, back_populates="piese")


class ListaPiese(Base):
    """
    Liste de piese (ex: "Listă schimb bandă transport"). Continutul unei
    liste (pieseIds in FE) e dat de relatia many-to-many cu Piesa, nu de
    o coloana - se calculeaza la citire, la fel ca la GrupMuncaEntity.
    """
    __tablename__ = "nom_liste_piese"

    id = Column(Integer, primary_key=True, index=True)
    nr_lista = Column(String(30), nullable=False, index=True)
    denumire = Column(String(150), nullable=False)

    piese = relationship("Piesa", secondary=nom_lista_piesa, back_populates="liste")