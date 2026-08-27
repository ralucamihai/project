import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

// =========================================================
// ---- MOD MOCK (temporar, cat timp backend-ul nu exista) ----
// Cand backend-ul e gata: pune USE_MOCK_DATA pe false si atat —
// toate metodele revin automat la apelurile HttpClient reale de mai jos.
// =========================================================
const USE_MOCK_DATA = true;

// Interfata a fost extinsa pentru a sustine noul tabel unificat
export interface ActivitatePMB {
  id: number;
  ticket?: number | string;
  initiator?: string;
  tipEchipament?: string;
  echipa?: string;
  denumire: string;
  tipInterventie: string;
  grup?: string;
  responsabil?: string;
  executant: string;
  descriereSimptom?: string;
  defEnuntat: string;
  sectie?: string;
  linie?: string;
  codAfectat?: string;
  pmbNr?: string;
  denumireProdus?: string;
  prioritate?: string;
  termenInitiat?: string;
  termenCerut?: string;
  piese: string;
  loc: string;
  deLaOra?: string;
  panaLaOra?: string;
  cauzaInterventie?: string;
  explicatie?: string;
  operSupl?: string;
  validatDe?: string;
  validatCa?: string;
  explValid?: string;
  status: string;
  activ: boolean;
  dataCreareCont?: string;
  dataDezactivareCont?: string | null;
  dataOra: string;
}

export interface EchipamentPMB {
  id: number;
  numar: string;
  denumire: string;
  tipEchipament: string;
  sectie: string;
  linie: string;
  listaOper: string;
  listaPiese: string;
  dataReceptie: string;
  ipAddr: string;
  autonoma: string;
  preventiva: string;
  calibrare: string;
  controlESD: string;
  electrosecuritate: string;
  backup: string;
  executant: string;
  responsabil: string;
  respCalibr: string;
  respESD: string;
  respELS: string;
  respBCK: string;
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

  // ---- Date mock (folosite doar cat USE_MOCK_DATA = true) ----
  private mockEchipamente: EchipamentPMB[] = [
    { id: 1, numar: 'INV-001', denumire: 'Presa hidraulica 1', tipEchipament: 'Presa', sectie: 'Asamblare', linie: 'Linia 1', listaOper: '', listaPiese: '', dataReceptie: '2026-01-14', ipAddr: '', autonoma: 'NA', preventiva: 'lunar', calibrare: 'na', controlESD: '', electrosecuritate: '', backup: 'na', executant: '', responsabil: '', respCalibr: '', respESD: '', respELS: '', respBCK: '', activ: true },
    { id: 2, numar: 'INV-002', denumire: 'Robot sudura 2', tipEchipament: 'Robot', sectie: 'Testare Finală', linie: 'Linia 2', listaOper: '', listaPiese: '', dataReceptie: '2026-03-02', ipAddr: '', autonoma: 'NA', preventiva: 'la_3_luni', calibrare: 'na', controlESD: '', electrosecuritate: '', backup: 'na', executant: '', responsabil: '', respCalibr: '', respESD: '', respELS: '', respBCK: '', activ: true },
    { id: 3, numar: 'INV-003', denumire: 'Masina CNC 5', tipEchipament: 'Masina CNC', sectie: 'Prelucrare', linie: 'Linia 1', listaOper: '', listaPiese: '', dataReceptie: '2025-11-20', ipAddr: '', autonoma: 'NA', preventiva: 'na', calibrare: 'na', controlESD: '', electrosecuritate: '', backup: 'na', executant: '', responsabil: '', respCalibr: '', respESD: '', respELS: '', respBCK: '', activ: false }
  ];
  private mockNextIdEchipament = 4;

  private mockActivitati: ActivitatePMB[] = [
    {
      id: 1,
      ticket: 1024,
      initiator: 'Admin PMB',
      tipEchipament: 'INV-001',
      echipa: 'Presa hidraulica 1',
      denumire: 'Verificare presa hidraulica 1',
      tipInterventie: 'Preventiva',
      grup: 'Mecanici',
      responsabil: 'Ion Popescu',
      executant: 'Ion Popescu',
      descriereSimptom: 'Verificare uzura garnitura conform plan',
      defEnuntat: 'Uzura garnitura',
      sectie: 'Asamblare',
      linie: 'Linia 1',
      codAfectat: 'CAB-01',
      denumireProdus: 'Componente M1',
      prioritate: 'Medie',
      termenInitiat: '2026-01-10 08:00',
      termenCerut: '10:00',
      piese: 'Garnitura hidraulica',
      loc: 'Hala 1',
      deLaOra: '08:30',
      panaLaOra: '09:15',
      cauzaInterventie: 'Mentenanta lunara',
      explicatie: 'S-a inlocuit si testat fara probleme.',
      operSupl: 'Curatat senzor adiacent',
      validatDe: 'Sef Tura',
      validatCa: 'Corect',
      explValid: 'Aprobat',
      status: 'Finalizat',
      activ: true,
      dataCreareCont: '2026-01-10',
      dataDezactivareCont: null,
      dataOra: '2026-01-10 09:15'
    },
    {
      id: 2,
      ticket: 1025,
      initiator: 'Operator Linie',
      tipEchipament: 'INV-002',
      echipa: 'Robot sudura 2',
      denumire: 'Interventie robot sudura 2',
      tipInterventie: 'Accidentala',
      grup: 'Electricieni',
      responsabil: 'Maria Ionescu',
      executant: 'Maria Ionescu',
      descriereSimptom: 'Robotul s-a blocat la pozitia 4',
      defEnuntat: 'Eroare senzor',
      sectie: 'Testare Finală',
      linie: 'Linia 2',
      codAfectat: 'CAB-02',
      denumireProdus: 'Carcasa 220V',
      prioritate: 'Ridicată',
      termenInitiat: '2026-02-05 13:00',
      termenCerut: '15:00',
      piese: 'Senzor pozitie optic',
      loc: 'Hala 2',
      deLaOra: '13:10',
      panaLaOra: '14:40',
      cauzaInterventie: 'Scurtcircuit senzor',
      explicatie: 'Senzorul vechi a ars, schimbat cu unul nou.',
      operSupl: 'Verificat tot circuitul.',
      validatDe: '',
      validatCa: '',
      explValid: '',
      status: 'In lucru',
      activ: true,
      dataCreareCont: '2026-02-05',
      dataDezactivareCont: null,
      dataOra: '2026-02-05 14:40'
    }
  ];

  private mockDefEnuntate: string[] = [
    'Uzura garnitura',
    'Eroare senzor',
    'Defect electric',
    'Defect mecanic',
    'Scurgere ulei',
    'Vibratii anormale'
  ];

  constructor(private http: HttpClient) {}

  // =========================================================
  // ---- Activitati ----
  // =========================================================
  getActivitati(filtre?: ActivitatiFiltre): Observable<ActivitatePMB[]> {
    if (USE_MOCK_DATA) {
      let lista = [...this.mockActivitati];
      if (filtre) {
        if (filtre.tipInterventie) lista = lista.filter(a => a.tipInterventie === filtre.tipInterventie);
        if (filtre.defEnuntat) lista = lista.filter(a => a.defEnuntat === filtre.defEnuntat);
        if (filtre.piese) lista = lista.filter(a => a.piese.toLowerCase().includes(filtre.piese!.toLowerCase()));
        if (filtre.loc) lista = lista.filter(a => a.loc.toLowerCase().includes(filtre.loc!.toLowerCase()));
        if (filtre.executant) lista = lista.filter(a => a.executant.toLowerCase().includes(filtre.executant!.toLowerCase()));
        if (filtre.status) lista = lista.filter(a => a.status === filtre.status);
        if (filtre.activ) lista = lista.filter(a => a.activ === (filtre.activ === 'true'));
      }
      return of(lista).pipe(delay(150));
    }

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
    if (USE_MOCK_DATA) {
      const item = this.mockActivitati.find(a => a.id === id)!;
      return of(item).pipe(delay(150));
    }
    return this.http.get<ActivitatePMB>(`${this.baseUrl}/maintenance/activitati/${id}`);
  }

  createActivitate(activitate: Partial<ActivitatePMB>): Observable<ActivitatePMB> {
    if (USE_MOCK_DATA) {
      const nou = { ...activitate, id: Math.max(0, ...this.mockActivitati.map(a => a.id)) + 1 } as ActivitatePMB;
      this.mockActivitati.push(nou);
      return of(nou).pipe(delay(150));
    }
    return this.http.post<ActivitatePMB>(`${this.baseUrl}/maintenance/activitati`, activitate);
  }

  updateActivitate(id: number, activitate: Partial<ActivitatePMB>): Observable<ActivitatePMB> {
    if (USE_MOCK_DATA) {
      const index = this.mockActivitati.findIndex(a => String(a.id) === String(id));
      if (index !== -1) {
        this.mockActivitati[index] = { ...this.mockActivitati[index], ...activitate };
        return of(this.mockActivitati[index]).pipe(delay(150));
      }
      return of({} as ActivitatePMB);
    }
    return this.http.put<ActivitatePMB>(`${this.baseUrl}/maintenance/activitati/${id}`, activitate);
  }

  // ---- METODA NOUA PENTRU POPUP-UL DIN DREAPTA ----
  updateDetaliiActivitate(id: number, detalii: any): Observable<ActivitatePMB> {
    if (USE_MOCK_DATA) {
      const index = this.mockActivitati.findIndex(a => String(a.id) === String(id));
      if (index !== -1) {
        this.mockActivitati[index] = { ...this.mockActivitati[index], ...detalii };
        return of(this.mockActivitati[index]).pipe(delay(150));
      }
      return of({} as ActivitatePMB);
    }
    return this.http.put<ActivitatePMB>(`${this.baseUrl}/maintenance/activitati/${id}/detalii`, detalii);
  }

  deleteActivitate(id: number): Observable<void> {
    if (USE_MOCK_DATA) {
      this.mockActivitati = this.mockActivitati.filter(a => a.id !== id);
      return of(void 0).pipe(delay(150));
    }
    return this.http.delete<void>(`${this.baseUrl}/maintenance/activitati/${id}`);
  }

  // =========================================================
  // ---- Optiuni pentru dropdown-uri ----
  // =========================================================
  getTipuriInterventie(): Observable<string[]> {
    if (USE_MOCK_DATA) {
      return of([]).pipe(delay(150));
    }
    return this.http.get<string[]>(`${this.baseUrl}/nomenclature/tip_interventie`);
  }

  getDefEnuntateOptions(): Observable<string[]> {
    if (USE_MOCK_DATA) {
      return of([...this.mockDefEnuntate]).pipe(delay(150));
    }
    return this.http.get<string[]>(`${this.baseUrl}/nomenclature/categorie_defect`);
  }

  // =========================================================
  // ---- Echipamente ----
  // =========================================================
  getEchipamente(): Observable<EchipamentPMB[]> {
    if (USE_MOCK_DATA) {
      return of([...this.mockEchipamente]).pipe(delay(150));
    }
    return this.http.get<EchipamentPMB[]>(`${this.baseUrl}/maintenance/echipamente`);
  }

  createEchipament(echipament: Partial<EchipamentPMB>): Observable<EchipamentPMB> {
    if (USE_MOCK_DATA) {
      const nou: EchipamentPMB = {
        id: this.mockNextIdEchipament++,
        numar: echipament.numar || '',
        denumire: echipament.denumire || '',
        tipEchipament: echipament.tipEchipament || '',
        sectie: echipament.sectie || '',
        linie: echipament.linie || '',
        listaOper: echipament.listaOper || '',
        listaPiese: echipament.listaPiese || '',
        dataReceptie: echipament.dataReceptie || '',
        ipAddr: echipament.ipAddr || '',
        autonoma: echipament.autonoma || 'NA',
        preventiva: echipament.preventiva || 'na',
        calibrare: echipament.calibrare || 'na',
        controlESD: echipament.controlESD || '',
        electrosecuritate: echipament.electrosecuritate || '',
        backup: echipament.backup || 'na',
        executant: echipament.executant || '',
        responsabil: echipament.responsabil || '',
        respCalibr: echipament.respCalibr || '',
        respESD: echipament.respESD || '',
        respELS: echipament.respELS || '',
        respBCK: echipament.respBCK || '',
        activ: echipament.activ ?? true
      };
      this.mockEchipamente.push(nou);
      return of(nou).pipe(delay(150));
    }
    return this.http.post<EchipamentPMB>(`${this.baseUrl}/maintenance/echipamente`, echipament);
  }

  updateEchipament(id: number, echipament: Partial<EchipamentPMB>): Observable<EchipamentPMB> {
    if (USE_MOCK_DATA) {
      const index = this.mockEchipamente.findIndex(e => e.id === id);
      if (index !== -1) {
        // dataReceptie nu se modifica NICIODATA la editare
        const dataReceptieOriginala = this.mockEchipamente[index].dataReceptie;
        this.mockEchipamente[index] = { ...this.mockEchipamente[index], ...echipament, dataReceptie: dataReceptieOriginala };
      }
      return of(this.mockEchipamente[index]).pipe(delay(150));
    }
    return this.http.put<EchipamentPMB>(`${this.baseUrl}/maintenance/echipamente/${id}`, echipament);
  }

  deleteEchipament(id: number): Observable<void> {
    if (USE_MOCK_DATA) {
      this.mockEchipamente = this.mockEchipamente.filter(e => e.id !== id);
      return of(void 0).pipe(delay(150));
    }
    return this.http.delete<void>(`${this.baseUrl}/maintenance/echipamente/${id}`);
  }
}