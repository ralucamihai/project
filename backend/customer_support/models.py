from sqlalchemy import Column, Integer, String, Text, DateTime, Date, Time
from login.models import Base  

class Ticket(Base):
    __tablename__ = "cs_tickets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=False)
    initiator = Column(String, nullable=False)
    echipa = Column(String, nullable=True)
    tip_interventie = Column(String, nullable=True)
    descriere_simptom = Column(String, nullable=True)
    sectie = Column(String, nullable=True)
    linie = Column(String, nullable=True)
    cod_afectat = Column(String, nullable=True)
    denumire_produs = Column(String, nullable=True)
    prioritate = Column(String, nullable=True)
    termen_initiat = Column(DateTime, nullable=False)
    
    # AICI ERA PROBLEMA - TREBUIE SĂ FIE DateTime PENTRU A ACCEPTA ȘI DATA, NU DOAR ORA
    termen_cerut = Column(DateTime, nullable=True) 
    
    status = Column(String, nullable=False, default="Deschis")


class Order(Base):
    __tablename__ = "cs_orders"

    id = Column(Integer, primary_key=True, index=True)
    numar_comanda = Column(String(100), unique=True, nullable=False)
    client = Column(String(255), nullable=False)
    produs = Column(String(255), nullable=False)
    cantitate = Column(Integer, nullable=False, default=1)
    status = Column(String(50), nullable=False, default="In procesare")
    data_comanda = Column(Date, nullable=False)

    categorie_produs = Column(String(100), nullable=True)
    furnizor = Column(String(255), nullable=True)
    prioritate = Column(String(50), nullable=True)

    numar_intern = Column(String(100), nullable=True)
    initiator = Column(String(255), nullable=True)
    sectie = Column(String(255), nullable=True)
    linie = Column(String(255), nullable=True)
    locatie = Column(String(255), nullable=True)
    responsabil = Column(String(255), nullable=True)
    cauza_interventie = Column(Text, nullable=True)
    explicatie = Column(Text, nullable=True)
    operatii_suplimentare = Column(Text, nullable=True)
    termen_data = Column(Date, nullable=True)
    termen_ora = Column(Time, nullable=True)
    kpi = Column(String(255), nullable=True)
    de_la_ora = Column(Time, nullable=True)
    pana_la_ora = Column(Time, nullable=True)


class Suggestion(Base):
    __tablename__ = "cs_suggestions"

    id = Column(Integer, primary_key=True, index=True)
    titlu = Column(String(255), nullable=False)
    descriere = Column(Text, nullable=True)
    autor = Column(String(255), nullable=False)
    categorie = Column(String(100), nullable=False, default="Funcționalitate")
    status = Column(String(50), nullable=False, default="Nou")
    data_trimitere = Column(Date, nullable=False)

    prioritate = Column(String(50), nullable=True)

    numar_intern = Column(String(100), nullable=True)
    initiator = Column(String(255), nullable=True)
    sectie = Column(String(255), nullable=True)
    linie = Column(String(255), nullable=True)
    locatie = Column(String(255), nullable=True)
    responsabil = Column(String(255), nullable=True)
    cauza_interventie = Column(Text, nullable=True)
    explicatie = Column(Text, nullable=True)
    operatii_suplimentare = Column(Text, nullable=True)
    termen_data = Column(Date, nullable=True)
    termen_ora = Column(Time, nullable=True)
    kpi = Column(String(255), nullable=True)
    de_la_ora = Column(Time, nullable=True)
    pana_la_ora = Column(Time, nullable=True)


class Complaint(Base):
    __tablename__ = "cs_complaints"

    id = Column(Integer, primary_key=True, index=True)
    titlu = Column(String(255), nullable=False)
    descriere = Column(Text, nullable=True)
    client = Column(String(255), nullable=False)
    severitate = Column(String(50), nullable=False, default="Medie")
    status = Column(String(50), nullable=False, default="Deschis")
    data_trimitere = Column(Date, nullable=False)

    numar_intern = Column(String(100), nullable=True)
    initiator = Column(String(255), nullable=True)
    sectie = Column(String(255), nullable=True)
    linie = Column(String(255), nullable=True)
    locatie = Column(String(255), nullable=True)
    responsabil = Column(String(255), nullable=True)
    cauza_interventie = Column(Text, nullable=True)
    explicatie = Column(Text, nullable=True)
    operatii_suplimentare = Column(Text, nullable=True)
    termen_data = Column(Date, nullable=True)
    termen_ora = Column(Time, nullable=True)
    kpi = Column(String(255), nullable=True)
    de_la_ora = Column(Time, nullable=True)
    pana_la_ora = Column(Time, nullable=True)