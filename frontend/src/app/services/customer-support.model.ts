// ===================== Ticket =====================
// Reordonat + curatat conform noii logici a tabului Tickets.
export interface Ticket {
  id: number;               // atribuit de backend (SERIAL/IDENTITY in Postgres), niciodata de frontend
  initiator: string;        // needitabil in UI — luat din GET /api/user
  echipa: string;           // fost "PMB Nr."
  tipInterventie: string;
  descriereSimptom: string;
  sectie: string;
  linie: string;
  codAfectat: string;
  denumireProdus: string;
  prioritate: string;
  termenInitiat: string;    // ISO datetime, needitabil — ora curenta la deschidere ticket
  termenCerut: string;      // "HH:MM:SS", setat de initiator
  status: string;
}

// ===================== Order =====================
export interface Order {
  id: number;
  numarComanda: string;
  client: string;
  produs: string;
  descriere: string;        // <-- Adăugat aici pentru a elimina eroarea de compilare
  cantitate: number;
  furnizor: string;
  categorieProdus: string;
  status: string;
  prioritate: string;
  initiator: string;
  sectie: string;
  linie: string;
  locatie: string;
  responsabil: string;
  kpi: string;
  explicatie: string;
  dataComanda: string;
  termenData: string;
  termenOra: string;
}

// ===================== Sugestie =====================
export interface Sugestie {
  id: number;
  titlu: string;
  descriere: string;
  autor: string;
  categorie: string;
  status: string;
  prioritate: string;
  initiator: string;
  sectie: string;
  locatie: string;
  responsabil: string;
  kpi: string;
  explicatie: string;
  dataTrimitere: string;
  termenData: string;
}

// ===================== Reclamatie =====================
export interface Reclamatie {
  id: number;
  titlu: string;
  descriere: string;
  client: string;
  severitate: string;
  status: string;
  initiator: string;
  sectie: string;
  locatie: string;
  responsabil: string;
  cauzaInterventie: string;
  explicatie: string;
  operatiiSuplimentare: string;
  kpi: string;
  dataTrimitere: string;
  termenData: string;
}