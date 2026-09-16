import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TipEchipament {
  id?: number;
  cod_line: string;
  denumire: string;
  mentenanta_ac: string;
  mentenanta_prev: string;
  calibrare: string;
  esd: string;
  electrosecuritate: string;
  backup: string;
  ssm: string;
  isqw: string;
  lista_piese: string;
  lista_operatii: string;
  responsabil: string;
}

export interface UtilizatorPMB {
  id?: number;
  marca: string;
  nume: string;
  functie: string;
  grup: string;
  user: string;
}

export interface GrupMunca {
  id?: number;
  grup: string;
  departament?: string; 
  membri: string[]; 
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

export interface OperatieMentenanta {
  id?: number;
  denumire: string;
  ord?: string;
  luni?: string;
  dataOra?: string;
  timp?: string;
  instructiune?: string;
  sculeSpeciale?: string;
  prioritate?: string;
  autonoma?: boolean;
  preventiva?: boolean;
}

export interface ListaOperatii {
  id?: number;
  denumire: string;
  timp?: string;
  operatiiIds: number[];
}

export interface TipInterventie {
  id?: number;
  denumire: string;
}

export interface CategorieDefect {
  id?: number;
  idCategorie: string;
  denumire: string;
}

export interface Sectie {
  id?: number | string;
  sectie: string;
  sectieMiniBde?: string; 
  linia: string;
  liniaMiniBde: string;
  sefSectie: string;
  sefLinie1: string;
  sefLinie2: string;
  electrosecuritateLuna: string;
  electrosecuritateResponsabil: string;
  esdLuna: string;
  esdResponsabil: string;
}

@Injectable({ providedIn: 'root' })
export class NomenclatureService {

  private baseUrl = `${environment.apiUrlIP}/nomenclature`;

  constructor(private http: HttpClient) {}

  // ==========================================
  // ---------- TIP ECHIPAMENT ----------
  // ==========================================
  getTipuriEchipament(): Observable<TipEchipament[]> { 
    return this.http.get<TipEchipament[]>(`${this.baseUrl}/tip_echipament`); 
  }
  createTipEchipament(t: Partial<TipEchipament>): Observable<TipEchipament> { 
    return this.http.post<TipEchipament>(`${this.baseUrl}/tip_echipament`, t); 
  }
  updateTipEchipament(t: TipEchipament): Observable<TipEchipament> { 
    return this.http.put<TipEchipament>(`${this.baseUrl}/tip_echipament/${t.id}`, t); 
  }
  deleteTipEchipament(id: number): Observable<void> { 
    return this.http.delete<void>(`${this.baseUrl}/tip_echipament/${id}`); 
  }

  // ==========================================
  // ---------- TIP INTERVENȚIE ----------
  // ==========================================
  getTipuriInterventie(): Observable<TipInterventie[]> {
    return this.http.get<TipInterventie[]>(`${this.baseUrl}/tipuri_interventie`);
  }
  createTipInterventie(t: Partial<TipInterventie>): Observable<TipInterventie> {
    return this.http.post<TipInterventie>(`${this.baseUrl}/tipuri_interventie`, t);
  }
  updateTipInterventie(t: TipInterventie): Observable<TipInterventie> {
    return this.http.put<TipInterventie>(`${this.baseUrl}/tipuri_interventie`, t);
  }
  deleteTipInterventie(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/tipuri_interventie/${id}`);
  }

  // ==========================================
  // ---------- CATEGORIE DEFECT ----------
  // ==========================================
  getCategoriiDefect(): Observable<CategorieDefect[]> {
    return this.http.get<CategorieDefect[]>(`${this.baseUrl}/categorii_defect`);
  }
  createCategorieDefect(c: Partial<CategorieDefect>): Observable<CategorieDefect> {
    return this.http.post<CategorieDefect>(`${this.baseUrl}/categorii_defect`, c);
  }
  updateCategorieDefect(c: CategorieDefect): Observable<CategorieDefect> {
    return this.http.put<CategorieDefect>(`${this.baseUrl}/categorii_defect`, c);
  }
  deleteCategorieDefect(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/categorii_defect/${id}`);
  }

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

  // ==========================================
  // ---------- GRUPURI MUNCA ----------
  // ==========================================
  getGrupuriMunca(): Observable<GrupMunca[]> {
    return this.http.get<GrupMunca[]>(`${this.baseUrl}/grupuri_munca`);
  }
  createGrupMunca(data: { nume: string, departament?: string }): Observable<GrupMunca> {
    return this.http.post<GrupMunca>(`${this.baseUrl}/grupuri_munca`, data);
  }

  // ==========================================
  // ---------- PIESE ----------
  // ==========================================
  getPiese(): Observable<Piesa[]> { return this.http.get<Piesa[]>(`${this.baseUrl}/piese`); }
  createPiesa(p: Partial<Piesa>): Observable<Piesa> { return this.http.post<Piesa>(`${this.baseUrl}/piese`, p); }
  updatePiesa(p: Piesa): Observable<Piesa> { return this.http.put<Piesa>(`${this.baseUrl}/piese`, p); }
  deletePiesa(id: number): Observable<void> { return this.http.delete<void>(`${this.baseUrl}/piese/${id}`); }

  getListePiese(): Observable<ListaPiese[]> { return this.http.get<ListaPiese[]>(`${this.baseUrl}/liste_piese`); }
  createListaPiese(l: Partial<ListaPiese>): Observable<ListaPiese> { return this.http.post<ListaPiese>(`${this.baseUrl}/liste_piese`, l); }
  updateListaPiese(l: ListaPiese): Observable<ListaPiese> { return this.http.put<ListaPiese>(`${this.baseUrl}/liste_piese`, l); }
  deleteListaPiese(id: number): Observable<void> { return this.http.delete<void>(`${this.baseUrl}/liste_piese/${id}`); }
  adaugaPiesaInLista(listaId: number, piesaId: number): Observable<ListaPiese> { return this.http.post<ListaPiese>(`${this.baseUrl}/liste_piese/${listaId}/adauga_piesa/${piesaId}`, {}); }
  scoatePiesaDinLista(listaId: number, piesaId: number): Observable<ListaPiese> { return this.http.post<ListaPiese>(`${this.baseUrl}/liste_piese/${listaId}/scoate_piesa/${piesaId}`, {}); }

  // ==========================================
  // ---------- OPERAȚII MENTENANȚĂ ----------
  // ==========================================
  getOperatiiMentenanta(): Observable<OperatieMentenanta[]> { return this.http.get<OperatieMentenanta[]>(`${this.baseUrl}/operatii_mentenanta`); }
  createOperatieMentenanta(o: Partial<OperatieMentenanta>): Observable<OperatieMentenanta> { return this.http.post<OperatieMentenanta>(`${this.baseUrl}/operatii_mentenanta`, o); }
  updateOperatieMentenanta(o: OperatieMentenanta): Observable<OperatieMentenanta> { return this.http.put<OperatieMentenanta>(`${this.baseUrl}/operatii_mentenanta`, o); }
  deleteOperatieMentenanta(id: number): Observable<void> { return this.http.delete<void>(`${this.baseUrl}/operatii_mentenanta/${id}`); }

  getListeOperatii(): Observable<ListaOperatii[]> { return this.http.get<ListaOperatii[]>(`${this.baseUrl}/liste_operatii`); }
  createListaOperatii(l: Partial<ListaOperatii>): Observable<ListaOperatii> { return this.http.post<ListaOperatii>(`${this.baseUrl}/liste_operatii`, l); }
  updateListaOperatii(l: ListaOperatii): Observable<ListaOperatii> { return this.http.put<ListaOperatii>(`${this.baseUrl}/liste_operatii`, l); }
  deleteListaOperatii(id: number): Observable<void> { return this.http.delete<void>(`${this.baseUrl}/liste_operatii/${id}`); }
  adaugaOpInLista(listaId: number, opId: number): Observable<ListaOperatii> { return this.http.post<ListaOperatii>(`${this.baseUrl}/liste_operatii/${listaId}/adauga_op/${opId}`, {}); }
  scoateOpDinLista(listaId: number, opId: number): Observable<ListaOperatii> { return this.http.post<ListaOperatii>(`${this.baseUrl}/liste_operatii/${listaId}/scoate_op/${opId}`, {}); }

  // ==========================================
  // ---------- SECȚII ----------
  // ==========================================
  getSectii(): Observable<Sectie[]> { return this.http.get<Sectie[]>(`${this.baseUrl}/sectii`); }
  createSectie(s: Partial<Sectie>): Observable<Sectie> { return this.http.post<Sectie>(`${this.baseUrl}/sectii`, s); }
  updateSectie(s: Sectie): Observable<Sectie> { return this.http.put<Sectie>(`${this.baseUrl}/sectii/${s.id}`, s); }
  deleteSectie(id: number): Observable<void> { return this.http.delete<void>(`${this.baseUrl}/sectii/${id}`); }
}