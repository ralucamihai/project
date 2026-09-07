import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Ticket {
  id: number;
  initiator: string;
  tipEchipament: string;
  echipa: string;
  tipInterventie: string;
  grup: string; // Am adăugat câmpul grup aici
  responsabil: string;
  descriereSimptom: string;
  sectie: string;
  linie: string;
  codAfectat: string;
  denumireProdus: string;
  prioritate: string;
  termenInitiat: string;
  termenCerut: string;
  status: string;
}

export interface Order {
  id: number;
  numarComanda: string;
  client: string;
  produs: string;
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
  // ---- Câmpuri noi, formular extins "Comenzi autoutilare" (coloanele 2 și 3 din formular) ----
  centruCost?: string;
  nrInventar?: string;
  descriere?: string;
  desenDoc?: string;
  termenSolicitat?: string;
  prioritateNumar?: number;
  receptie?: string;
  dataRec?: string;
  user?: string;
  aprobatDeviz?: string;
  documentatie?: string;
  materiale?: string;
  disponibilitate?: string;
  deviz?: string;
  executant?: string;
  timpExecutie?: string;
  termenConfirmat?: string;
}

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
  linie: string;
  locatie: string;
  responsabil: string;
  kpi: string;
  explicatie: string;
  dataTrimitere: string;
  termenData: string;
}

export interface Reclamatie {
  id: number;
  titlu: string;
  descriere: string;
  client: string;
  severitate: string;
  status: string;
  initiator: string;
  sectie: string;
  linie: string;
  locatie: string;
  responsabil: string;
  cauzaInterventie: string;
  explicatie: string;
  operatiiSuplimentare: string;
  kpi: string;
  dataTrimitere: string;
  termenData: string;
}

@Injectable({ providedIn: 'root' })
export class CustomerSupportService {

  private baseUrl = `${environment.apiUrlIP}/customer_support`;

  constructor(private http: HttpClient) {}

  // ---------- TICKETS ----------
  getTickets(): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.baseUrl}/tickets`);
  }
  createTicket(t: Partial<Ticket>): Observable<Ticket> {
    return this.http.post<Ticket>(`${this.baseUrl}/tickets`, t);
  }
  updateTicket(t: Ticket): Observable<Ticket> {
    return this.http.put<Ticket>(`${this.baseUrl}/tickets`, t);
  }
  deleteTicket(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/tickets/${id}`);
  }

  // ---------- ORDERS ----------
  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.baseUrl}/orders`);
  }
  createOrder(o: Partial<Order>): Observable<Order> {
    return this.http.post<Order>(`${this.baseUrl}/orders`, o);
  }
  updateOrder(o: Order): Observable<Order> {
    return this.http.put<Order>(`${this.baseUrl}/orders`, o);
  }
  deleteOrder(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/orders/${id}`);
  }

  // ---------- SUGGESTIONS ----------
  getSuggestions(): Observable<Sugestie[]> {
    return this.http.get<Sugestie[]>(`${this.baseUrl}/suggestions`);
  }
  createSuggestion(s: Partial<Sugestie>): Observable<Sugestie> {
    return this.http.post<Sugestie>(`${this.baseUrl}/suggestions`, s);
  }
  updateSuggestion(s: Sugestie): Observable<Sugestie> {
    return this.http.put<Sugestie>(`${this.baseUrl}/suggestions`, s);
  }
  deleteSuggestion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/suggestions/${id}`);
  }

  // ---------- COMPLAINTS ----------
  getComplaints(): Observable<Reclamatie[]> {
    return this.http.get<Reclamatie[]>(`${this.baseUrl}/complaints`);
  }
  createComplaint(r: Partial<Reclamatie>): Observable<Reclamatie> {
    return this.http.post<Reclamatie>(`${this.baseUrl}/complaints`, r);
  }
  updateComplaint(r: Reclamatie): Observable<Reclamatie> {
    return this.http.put<Reclamatie>(`${this.baseUrl}/complaints`, r);
  }
  deleteComplaint(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/complaints/${id}`);
  }
}