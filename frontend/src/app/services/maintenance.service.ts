import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ActivitatePMB {
  id: number;
  denumire: string;
  tipInterventie: string;
  defEnuntat: string;
  piese: string;
  loc: string;
  executant: string;
  status: string;
  activ: boolean;
  dataCreareCont: string;
  dataDezactivareCont: string | null;
  dataOra: string;
}

export interface EchipamentPMB {
  id: number;
  denumire: string;
  tipEchipament: string;
  loc: string;
  activ: boolean;
}

export interface ActivitatiFiltre {
  tipInterventie?: string;
  defEnuntat?: string;
  piese?: string;
  loc?: string;
  executant?: string;
  status?: string;
  activ?: string;       // '', 'true', 'false'
  filtruListare?: string; // 'total' | 'anual' | 'lunar' | 'zilnic'
}

@Injectable({
  providedIn: 'root'
})
export class MaintenanceService {

  private baseUrl = 'http://127.0.0.1:8000/api';

  constructor(private http: HttpClient) {}

  // ---- Activitati ----
  getActivitati(filtre?: ActivitatiFiltre): Observable<ActivitatePMB[]> {
    let params: any = {};
    if (filtre) {
      Object.keys(filtre).forEach(key => {
        const value = (filtre as any)[key];
        if (value !== undefined && value !== null && value !== '') {
          params[key] = value;
        }
      });
    }
    return this.http.get<ActivitatePMB[]>(`${this.baseUrl}/maintenance/activitati`, { params });
  }

  getActivitateById(id: number): Observable<ActivitatePMB> {
    return this.http.get<ActivitatePMB>(`${this.baseUrl}/maintenance/activitati/${id}`);
  }

  createActivitate(activitate: Partial<ActivitatePMB>): Observable<ActivitatePMB> {
    return this.http.post<ActivitatePMB>(`${this.baseUrl}/maintenance/activitati`, activitate);
  }

  updateActivitate(id: number, activitate: Partial<ActivitatePMB>): Observable<ActivitatePMB> {
    return this.http.put<ActivitatePMB>(`${this.baseUrl}/maintenance/activitati/${id}`, activitate);
  }

  deleteActivitate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/maintenance/activitati/${id}`);
  }

  // ---- Optiuni pentru dropdown-uri (populate dinamic din backend, ex. tabele de nomenclator) ----
  getTipuriInterventie(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/nomenclature/tip_interventie`);
  }

  getDefEnuntateOptions(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/nomenclature/categorie_defect`);
  }

  // ---- Echipamente ----
  getEchipamente(): Observable<EchipamentPMB[]> {
    return this.http.get<EchipamentPMB[]>(`${this.baseUrl}/maintenance/echipamente`);
  }
}