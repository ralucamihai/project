import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type NivelAcces = 'Admin' | 'Editare' | 'Vizualizare';

export interface UtilizatorPMB {
  id?: number;
  marca: string;
  nume: string;
  functie: string;
  grup: string;
  acces: boolean;
  user: string;
  nivelAcces: NivelAcces;
  activ: boolean;
  dataActiv: string;
}

export interface GrupMunca {
  grup: string;
  membri: string[]; // doar username-uri, nu nume complete
}

export interface Piesa {
  id: number;
  denumire: string;
  codSap: string;
  pretRon: string;
  um: string;
  magazie: string;
  pozitieRaft: string;
  stocMinim: string;
  stocCurent: string;
  frecventa: string;
  producator: string;
  partNumber: string;
  moq: string;
  utilizare: string;
  dublura: string;
  excludeDublate: boolean;
  excludeIesiteDinFabricatie: boolean;
  furnizor: string;
  refFurnizor: string;
  furnizor1: string;
  refFurn1: string;
  furnizor2: string;
  refFurn2: string;
}

export interface ListaPiese {
  id?: number;
  nrLista: string;
  denumire: string;
  pieseIds: number[];
}

@Injectable({ providedIn: 'root' })
export class NomenclatureService {

  private baseUrl = `${environment.apiUrlIP}/nomenclature`;

  constructor(private http: HttpClient) {}

  // ==========================================
  // ---------- UTILIZATORI PMB ----------
  // ==========================================
  
  getUtilizatoriPMB(): Observable<UtilizatorPMB[]> {
    return this.http.get<UtilizatorPMB[]>(`${this.baseUrl}/utilizatori_pmb`);
  }
  
  createUtilizatorPMB(u: Partial<UtilizatorPMB>): Observable<UtilizatorPMB> {
    return this.http.post<UtilizatorPMB>(`${this.baseUrl}/utilizatori_pmb`, u);
  }
  
  updateUtilizatorPMB(u: UtilizatorPMB): Observable<UtilizatorPMB> {
    return this.http.put<UtilizatorPMB>(`${this.baseUrl}/utilizatori_pmb`, u);
  }
  
  deleteUtilizatorPMB(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/utilizatori_pmb/${id}`);
  }
  
  toggleActivUtilizatorPMB(id: number): Observable<UtilizatorPMB> {
    return this.http.post<UtilizatorPMB>(`${this.baseUrl}/utilizatori_pmb/${id}/toggle_activ`, {});
  }

  // ==========================================
  // ---------- GRUPURI MUNCA ----------
  // ==========================================
  
  getGrupuriMunca(): Observable<GrupMunca[]> {
    return this.http.get<GrupMunca[]>(`${this.baseUrl}/grupuri_munca`);
  }
  
  createGrupMunca(nume: string): Observable<GrupMunca> {
    return this.http.post<GrupMunca>(`${this.baseUrl}/grupuri_munca`, { nume });
  }

  // ==========================================
  // ---------- PIESE ----------
  // ==========================================
  
  getPiese(): Observable<Piesa[]> {
    return this.http.get<Piesa[]>(`${this.baseUrl}/piese`);
  }
  
  createPiesa(p: Partial<Piesa>): Observable<Piesa> {
    return this.http.post<Piesa>(`${this.baseUrl}/piese`, p);
  }
  
  updatePiesa(p: Piesa): Observable<Piesa> {
    return this.http.put<Piesa>(`${this.baseUrl}/piese`, p);
  }
  
  deletePiesa(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/piese/${id}`);
  }

  // ==========================================
  // ---------- LISTE DE PIESE ----------
  // ==========================================
  
  getListePiese(): Observable<ListaPiese[]> {
    return this.http.get<ListaPiese[]>(`${this.baseUrl}/liste_piese`);
  }
  
  createListaPiese(l: Partial<ListaPiese>): Observable<ListaPiese> {
    return this.http.post<ListaPiese>(`${this.baseUrl}/liste_piese`, l);
  }
  
  updateListaPiese(l: ListaPiese): Observable<ListaPiese> {
    return this.http.put<ListaPiese>(`${this.baseUrl}/liste_piese`, l);
  }
  
  deleteListaPiese(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/liste_piese/${id}`);
  }
  
  adaugaPiesaInLista(listaId: number, piesaId: number): Observable<ListaPiese> {
    return this.http.post<ListaPiese>(`${this.baseUrl}/liste_piese/${listaId}/adauga_piesa/${piesaId}`, {});
  }
  
  scoatePiesaDinLista(listaId: number, piesaId: number): Observable<ListaPiese> {
    return this.http.post<ListaPiese>(`${this.baseUrl}/liste_piese/${listaId}/scoate_piesa/${piesaId}`, {});
  }
}