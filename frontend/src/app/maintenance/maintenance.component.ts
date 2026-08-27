import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import {
  MaintenanceService,
  ActivitatePMB,
  EchipamentPMB
} from '../services/maintenance.service';
import {
  CustomerSupportService,
  Ticket
} from '../services/customer-support.service';
import { NomenclatureService, GrupMunca } from '../services/nomenclature.service';

type SortKeyEch = 'denumire' | 'tipEchipament' | 'dataReceptie';

// ---- Forma unica de rand afisat in grila "Activitati PMB/CBT" aliniata la Tickete ----
export interface RandActivitate {
  rowId: string;
  data: string;
  ticket: number | string;
  initiator: string;
  tipEchipament: string; // Nr. Inventar
  echipa: string; // Denumire Echipament
  tipInterventie: string;
  grup: string;
  responsabil: string; // Executant
  descriereSimptom: string; // Defect enuntat
  sectie: string;
  linie: string;
  codAfectat: string; // PMB-Nr
  denumireProdus: string;
  prioritate: string;
  termenInitiat: string;
  termenCerut: string;
  status: string;
  
  // --- Detalii suplimentare Mentenanta ---
  piese: string;
  deLaOra: string;
  panaLaOra: string;
  cauzaInterventie: string;
  explicatie: string;
  operSupl: string;
  validatDe: string;
  validatCa: string;
  explValid: string;
  sursaTicket: boolean;
}

// ---- POPUP 1: Toate coloanele Ticket ----
export interface RandEditModel {
  data: string;
  ticket: number | string;
  initiator: string;
  tipEchipament: string;
  echipa: string;
  tipInterventie: string;
  grup: string;
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

// ---- POPUP 2: Detalii suplimentare ----
export interface DetaliiActivitateEditModel {
  piese: string;
  deLaOra: string;
  panaLaOra: string;
  cauzaInterventie: string;
  explicatie: string;
  operSupl: string;
  validatDe: string;
  validatCa: string;
  explValid: string;
}

@Component({
  selector: 'app-maintenance',
  templateUrl: './maintenance.component.html',
  styleUrl: './maintenance.component.css',
  standalone: false
})
export class MaintenanceComponent implements OnInit {

  activeTab: string = 'echipamente';

  // =========================================================
  // ---- DATE COMUNE & INITIALIZARE ----
  // =========================================================
  grupuriMunca: GrupMunca[] = [];
  isLoadingGrupuri: boolean = false;
  isLoadingOptions: boolean = false;

  get grupOptions(): string[] {
    return this.grupuriMunca.map(g => g.grup);
  }

  get responsabiliCurenti(): string[] {
    const grupSelectat = (this.randEdit?.grup || '').trim().toLowerCase();
    if (!grupSelectat) return [];
    const gasit = this.grupuriMunca.find(g => g.grup.trim().toLowerCase() === grupSelectat);
    return gasit ? gasit.membri : [];
  }

  constructor(
    private route: ActivatedRoute,
    private maintenanceService: MaintenanceService,
    private supportService: CustomerSupportService,
    private nomenclatureService: NomenclatureService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.activeTab = params['tab'] || 'echipamente';
      this.loadDataForActiveTab();
    });
    this.loadGrupuriMunca();
    this.loadFilterOptions();
  }

  setTab(tab: string) {
    this.activeTab = tab;
    this.loadDataForActiveTab();
  }

  private loadDataForActiveTab() {
    if (this.activeTab === 'activitati') {
      if (this.activitati.length === 0) this.loadActivitati();
      if (this.tickets.length === 0) this.loadTickets();
    }
    if (this.activeTab === 'echipamente' && this.echipamente.length === 0) {
      this.loadEchipamente();
    }
  }

  loadGrupuriMunca() {
    this.isLoadingGrupuri = true;
    this.nomenclatureService.getGrupuriMunca().subscribe({
      next: data => { this.grupuriMunca = data; this.isLoadingGrupuri = false; },
      error: err => { console.error(err); this.isLoadingGrupuri = false; }
    });
  }

  loadFilterOptions() {
    this.isLoadingOptions = true;
    this.maintenanceService.getDefEnuntateOptions().subscribe({
      next: (data) => {
        this.defEnuntateOptions = data;
        this.isLoadingOptions = false;
      },
      error: (err) => {
        console.error('Eroare la încărcarea categoriilor de defect:', err);
        this.isLoadingOptions = false;
      }
    });
  }

  // =========================================================
  // ---- LOGICĂ TAB: ECHIPAMENTE (Sectiunea ta) ----
  // =========================================================
  echipamente: EchipamentPMB[] = [];
  isLoadingEchipamente: boolean = false;
  errorEchipamente: string | null = null;

  // Optiuni dropdown-uri formular Echipament
  tipEchipamentOptions: string[] = [];
  sectieOptions: string[] = [];
  linieOptions: string[] = [];
  listaPieseOptions: string[] = [];
  autonomaOptions: string[] = ['NA', 'Zilnic', 'Saptamanal', 'Start fabricatie'];
  responsabilOptions: string[] = [];
  respCalibrOptions: string[] = [];
  respESDOptions: string[] = [];
  respELSOptions: string[] = [];
  respBCKOptions: string[] = [];

  // Definitii perioade Preventiva / Calibrare / Backup
  private periodDefs: { value: string; label: string; interval: number | null }[] = [
    { value: 'na', label: 'NA', interval: null },
    { value: 'lunar', label: 'Lunar', interval: 1 },
    { value: 'la_2_luni', label: 'La 2 luni', interval: 2 },
    { value: 'la_3_luni', label: 'La 3 luni', interval: 3 },
    { value: 'la_6_luni', label: 'La 6 luni', interval: 6 },
    { value: 'anual', label: 'Anual', interval: 12 }
  ];

  // Stari UI tab Echipamente
  searchNumarEch: string = '';
  searchDenumireEch: string = '';
  searchTipEch: string = '';
  searchAutonomaEch: string = '';
  searchPreventivaLunaEch: string = '';
  searchCalibrareLunaEch: string = '';
  searchESDEch: string = '';
  searchELSEch: string = '';
  searchBackupLunaEch: string = '';
  sortKeyEch: SortKeyEch = 'denumire';
  sortAscEch: boolean = true;
  selectedIndexEch: number | null = null;

  showFormEch: boolean = false;
  isEditModeEch: boolean = false;
  formModelEch: EchipamentPMB = this.echipamentGol();
  editingIndexEch: number | null = null;

  loadEchipamente() {
    this.isLoadingEchipamente = true;
    this.errorEchipamente = null;

    this.maintenanceService.getEchipamente()
      .pipe(finalize(() => this.isLoadingEchipamente = false))
      .subscribe({
        next: (data) => this.echipamente = data,
        error: (err) => {
          console.error('Eroare la încărcarea echipamentelor:', err);
          this.errorEchipamente = 'Nu s-au putut încărca echipamentele. Verifică conexiunea la server.';
        }
      });
  }

  private todayISO(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private echipamentGol(): EchipamentPMB {
    return {
      id: 0, numar: '', denumire: '', tipEchipament: '', sectie: '',
      linie: '', listaOper: '', listaPiese: '', dataReceptie: this.todayISO(),
      ipAddr: '', autonoma: 'NA', preventiva: 'na', calibrare: 'na',
      controlESD: '', electrosecuritate: '', backup: 'na', executant: '',
      responsabil: '', respCalibr: '', respESD: '', respELS: '',
      respBCK: '', activ: true
    };
  }

  isNA(value: string): boolean {
    return (value || '').trim().toUpperCase() === 'NA';
  }

  isPeriodNA(value: string): boolean {
    return value === 'na';
  }

  private monthFromDate(dataReceptie: string): number {
    if (dataReceptie) {
      const parti = dataReceptie.split('-');
      const luna = parti.length === 3 ? parseInt(parti[1], 10) : NaN;
      if (!isNaN(luna) && luna >= 1 && luna <= 12) return luna;
    }
    return new Date().getMonth() + 1;
  }

  private getAddedMonth(): number {
    return this.monthFromDate(this.formModelEch?.dataReceptie);
  }

  private computeMonthsList(addedMonth: number, interval: number): number[] {
    const rezultat: number[] = [];
    for (let luna = 1; luna <= 12; luna++) {
      const diff = ((luna - addedMonth) % interval + interval) % interval;
      if (diff === 0) rezultat.push(luna);
    }
    return rezultat;
  }

  private getMonthsForPeriod(dataReceptie: string, periodValue: string): number[] {
    const def = this.periodDefs.find(p => p.value === periodValue);
    if (!def || def.interval === null) return [];
    return this.computeMonthsList(this.monthFromDate(dataReceptie), def.interval);
  }

  get periodOptions(): { value: string; label: string }[] {
    return this.periodDefs.map(p => ({ value: p.value, label: p.label }));
  }

  getPeriodMonths(value: string): string {
    const def = this.periodDefs.find(p => p.value === value);
    if (!def || def.interval === null) return 'NA';
    return this.computeMonthsList(this.getAddedMonth(), def.interval).join(',');
  }

  getPeriodDisplay(item: EchipamentPMB, value: string): string {
    if (value === 'na' || !value) return 'NA';
    const luni = this.getMonthsForPeriod(item.dataReceptie, value);
    return luni.length ? luni.join(',') : 'NA';
  }

  updateExecutantForAutonoma() {
    const val = (this.formModelEch.autonoma || '').trim().toUpperCase();
    this.formModelEch.executant = (val && val !== 'NA') ? 'Operator' : '';
  }

  get echipamenteFiltrate(): EchipamentPMB[] {
    const termNumar = this.searchNumarEch.trim().toLowerCase();
    const termDenumire = this.searchDenumireEch.trim().toLowerCase();
    const termTip = this.searchTipEch.trim().toLowerCase();
    const termESD = this.searchESDEch.trim().toLowerCase();
    const termELS = this.searchELSEch.trim().toLowerCase();

    const lunaPreventiva = parseInt(this.searchPreventivaLunaEch, 10);
    const lunaCalibrare = parseInt(this.searchCalibrareLunaEch, 10);
    const lunaBackup = parseInt(this.searchBackupLunaEch, 10);

    let lista = this.echipamente.filter(e => {
      if (!(e.numar || '').toLowerCase().includes(termNumar)) return false;
      if (!e.denumire.toLowerCase().includes(termDenumire)) return false;
      if (!e.tipEchipament.toLowerCase().includes(termTip)) return false;
      if (this.searchAutonomaEch && e.autonoma !== this.searchAutonomaEch) return false;
      if (!(e.controlESD || '').toLowerCase().includes(termESD)) return false;
      if (!(e.electrosecuritate || '').toLowerCase().includes(termELS)) return false;

      if (this.searchPreventivaLunaEch && !isNaN(lunaPreventiva)) {
        if (!this.getMonthsForPeriod(e.dataReceptie, e.preventiva).includes(lunaPreventiva)) return false;
      }
      if (this.searchCalibrareLunaEch && !isNaN(lunaCalibrare)) {
        if (!this.getMonthsForPeriod(e.dataReceptie, e.calibrare).includes(lunaCalibrare)) return false;
      }
      if (this.searchBackupLunaEch && !isNaN(lunaBackup)) {
        if (!this.getMonthsForPeriod(e.dataReceptie, e.backup).includes(lunaBackup)) return false;
      }
      return true;
    });

    lista.sort((a, b) => {
      const va = (a[this.sortKeyEch] || '').toLowerCase();
      const vb = (b[this.sortKeyEch] || '').toLowerCase();
      if (va < vb) return this.sortAscEch ? -1 : 1;
      if (va > vb) return this.sortAscEch ? 1 : -1;
      return 0;
    });

    return lista;
  }

  setSortEch(key: SortKeyEch) {
    if (this.sortKeyEch === key) {
      this.sortAscEch = !this.sortAscEch;
    } else {
      this.sortKeyEch = key;
      this.sortAscEch = true;
    }
  }

  selectRowEch(index: number) { this.selectedIndexEch = index; }

  openAddFormEch() {
    this.isEditModeEch = false;
    this.formModelEch = this.echipamentGol();
    this.editingIndexEch = null;
    this.showFormEch = true;
  }

  openEditFormEch(item: EchipamentPMB, index: number) {
    this.isEditModeEch = true;
    this.formModelEch = { ...item };
    this.editingIndexEch = index;
    this.updateExecutantForAutonoma();
    this.showFormEch = true;
  }

  closeFormEch() { this.showFormEch = false; }

  saveFormEch() {
    if (!this.formModelEch.denumire.trim() || !this.formModelEch.tipEchipament.trim()) {
      return;
    }

    const payload: Partial<EchipamentPMB> = { ...this.formModelEch };

    if (this.isEditModeEch && this.editingIndexEch !== null) {
      const id = this.echipamente[this.editingIndexEch].id;
      this.maintenanceService.updateEchipament(id, payload).subscribe({
        next: (updated) => {
          this.echipamente[this.editingIndexEch as number] = updated;
          this.closeFormEch();
        },
        error: (err) => {
          console.error('Eroare la actualizarea echipamentului:', err);
          alert('Eroare la salvare. Verifică datele și încearcă din nou.');
        }
      });
    } else {
      this.maintenanceService.createEchipament(payload).subscribe({
        next: (created) => {
          this.echipamente.push(created);
          this.closeFormEch();
        },
        error: (err) => {
          console.error('Eroare la crearea echipamentului:', err);
          alert('Eroare la adăugare. Verifică datele și încearcă din nou.');
        }
      });
    }
  }

  deleteItemEch(item: EchipamentPMB, index: number) {
    if (!confirm('Sigur ștergi acest echipament?')) return;

    this.maintenanceService.deleteEchipament(item.id).subscribe({
      next: () => {
        this.echipamente.splice(index, 1);
        if (this.selectedIndexEch === index) this.selectedIndexEch = null;
      },
      error: (err) => {
        console.error('Eroare la ștergerea echipamentului:', err);
        alert('Eroare la ștergere.');
      }
    });
  }

  listeazaEch() { window.print(); }
  salveazaEch() { console.log('Salvare echipamente:', this.echipamente); }


  // =========================================================
  // ---- LOGICĂ TAB: ACTIVITĂȚI (Noile tale tickete/activitati) ----
  // =========================================================

  tipuriInterventie: string[] = [
    'Accidentala', 'AEM', 'Ajustare parametrii', 'Backup', 'Cladiri',
    'Curatare_echip', 'Electric', 'Electrosecuritate', 'ESD', 'Imbunatatire',
    'Instalare Echipament', 'Masuratoare', 'Pneumatic', 'Pornire_fabricatie',
    'Predictiva', 'Prelucrare mecanica repere', 'Preventiva', 'Produs_nou',
    'Reglaj echipament', 'Reglaj stanta', 'Schimb_echip', 'Schimb_produs',
    'Schimb_recipient', 'Schimb_stanta'
  ];

  statusOptions: string[] = ['Deschis', 'In lucru', 'Rezolvat', 'Finalizat', 'Programat', 'Închis', 'Anulat'];
  ticketPrioritateOptions: string[] = ['Scăzută', 'Medie', 'Ridicată'];
  cauzaInterventieOptions: string[] = [];
  validatCaOptions: string[] = ['Corect', 'Incomplet', 'Respins'];
  defEnuntateOptions: string[] = [];
  filtruListareOptions: { value: string; label: string }[] = [
    { value: 'total', label: 'Total' },
    { value: 'anual', label: 'Anual' },
    { value: 'lunar', label: 'Lunar' },
    { value: 'zilnic', label: 'Zilnic' }
  ];

  filtre = {
    tipInterventie: '', defEnuntat: '', piese: '', loc: '',
    executant: '', status: '', activ: '', filtruListare: 'total'
  };

  private filterDebounce: any;

  activitati: ActivitatePMB[] = [];
  tickets: Ticket[] = [];
  randuriActivitati: RandActivitate[] = [];

  isLoadingActivitati: boolean = false;
  isLoadingTickets: boolean = false;
  errorActivitati: string | null = null;
  errorTickets: string | null = null;

  showTicketPopup: boolean = false;
  showDetaliiPopup: boolean = false;
  rowSelectat: RandActivitate | null = null;
  randEdit: RandEditModel | null = null;
  detaliiEdit: DetaliiActivitateEditModel | null = null;
  isSavingTicket: boolean = false;
  isSavingDetalii: boolean = false;

  echipamenteFizice = [
    { inventar: 'INV-001', nume: 'Cabina 1', tip: 'Cabina', sectie: 'Testare Finală', linie: 'Linia 1', codAfectat: 'CAB-01' },
    { inventar: 'INV-002', nume: 'Cabina 2', tip: 'Cabina', sectie: 'Testare Finală', linie: 'Linia 2', codAfectat: 'CAB-02' },
    { inventar: 'INV-003', nume: 'Dispozitiv Lipire A', tip: 'Dispozitiv', sectie: 'Asamblare', linie: 'Linia 2', codAfectat: 'DISP-A' },
    { inventar: 'INV-004', nume: 'Tester ESD Principal', tip: 'ESD punct de măsurare', sectie: 'Control Calitate', linie: 'Linia 1', codAfectat: 'ESD-01' },
    { inventar: 'INV-005', nume: 'Robot Echipare 1', tip: 'Echipament', sectie: 'SMD', linie: 'Linia 3', codAfectat: 'ROB-01' }
  ];

  loadActivitati() {
    this.isLoadingActivitati = true;
    this.errorActivitati = null;

    this.maintenanceService.getActivitati(this.filtre)
      .pipe(finalize(() => this.isLoadingActivitati = false))
      .subscribe({
        next: (data) => {
          this.activitati = data;
          this.construiesteRanduri();
        },
        error: (err) => {
          console.error('Eroare la încărcarea activităților:', err);
          this.errorActivitati = 'Nu s-au putut încărca activitățile. Verifică conexiunea la server.';
        }
      });
  }

  loadTickets() {
    this.isLoadingTickets = true;
    this.errorTickets = null;

    this.supportService.getTickets()
      .pipe(finalize(() => this.isLoadingTickets = false))
      .subscribe({
        next: (data) => {
          this.tickets = data;
          this.construiesteRanduri();
        },
        error: (err) => {
          console.error('Eroare la încărcarea ticketelor:', err);
          this.errorTickets = 'Nu s-au putut încărca ticketele. Verifică conexiunea la server.';
        }
      });
  }

  onFiltreChanged() {
    clearTimeout(this.filterDebounce);
    this.filterDebounce = setTimeout(() => {
      this.loadActivitati();
    }, 400);
  }

  resetFiltreActivitati() {
    this.filtre = {
      tipInterventie: '', defEnuntat: '', piese: '', loc: '',
      executant: '', status: '', activ: '', filtruListare: 'total'
    };
    this.loadActivitati();
  }

  statusClassActivitati(status: string): string {
    switch (status) {
      case 'Finalizat': case 'Rezolvat': case 'Închis': return 'badge badge-success';
      case 'In lucru': case 'In procesare': return 'badge badge-warning';
      case 'Programat': case 'Deschis': return 'badge badge-info';
      case 'Anulat': return 'badge badge-danger';
      default: return 'badge';
    }
  }

  prioritateClass(prioritate: string): string {
    switch (prioritate) {
      case 'Ridicată': return 'badge badge-danger';
      case 'Medie': return 'badge badge-warning';
      case 'Scăzută': return 'badge badge-success';
      default: return 'badge';
    }
  }

  formatOra(iso: string | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  // --- AUTO-COMPLETARE IN FORMULAR (Activitati/Tickete) ---
  onTipEchipamentChange() {
    if (!this.randEdit) return;
    const inventarTastat = this.randEdit.tipEchipament?.trim();
    const echipamentGasit = this.echipamenteFizice.find((e: any) => e.inventar === inventarTastat);

    if (echipamentGasit) {
      this.randEdit.echipa = echipamentGasit.nume;
      this.randEdit.sectie = echipamentGasit.sectie;
      this.randEdit.linie = echipamentGasit.linie;
      this.randEdit.codAfectat = echipamentGasit.codAfectat;
    } else {
      this.randEdit.echipa = '';
      this.randEdit.sectie = '';
      this.randEdit.linie = '';
      this.randEdit.codAfectat = '';
    }
  }

  onGrupChange() {
    if (this.randEdit) {
      this.randEdit.responsabil = ''; 
    }
  }

  private mapActivitateToRand(a: ActivitatePMB, index: number): RandActivitate {
    const anyA = a as any;
    return {
      rowId: 'a-' + (anyA.id ?? index),
      data: anyA.dataOra || anyA.data || '',
      ticket: anyA.ticket ?? 0,
      initiator: anyA.initiator || '',
      tipEchipament: anyA.tipEchipament || '',
      echipa: anyA.echipa || a.denumire || '',
      tipInterventie: a.tipInterventie || '',
      grup: anyA.grup || '',
      responsabil: anyA.responsabil || a.executant || '',
      descriereSimptom: anyA.descriereSimptom || a.defEnuntat || '',
      sectie: anyA.sectie || '',
      linie: anyA.linie || '',
      codAfectat: anyA.codAfectat || anyA.pmbNr || '',
      denumireProdus: anyA.denumireProdus || '',
      prioritate: anyA.prioritate || 'Medie',
      termenInitiat: anyA.termenInitiat || anyA.dataOra || '',
      termenCerut: anyA.termenCerut || '',
      status: a.status,
      piese: a.piese || '',
      deLaOra: anyA.deLaOra ?? '',
      panaLaOra: anyA.panaLaOra ?? '',
      cauzaInterventie: anyA.cauzaInterventie ?? '',
      explicatie: anyA.explicatie ?? '',
      operSupl: anyA.operSupl ?? '',
      validatDe: anyA.validatDe ?? '',
      validatCa: anyA.validatCa ?? '',
      explValid: anyA.explValid ?? '',
      sursaTicket: false
    };
  }

  private mapTicketToRand(t: Ticket, index: number): RandActivitate {
    const anyT = t as any;
    return {
      rowId: 't-' + (anyT.id ?? index),
      data: anyT.termenInitiat || '',
      ticket: anyT.id ?? 0,
      initiator: anyT.initiator || '',
      tipEchipament: anyT.tipEchipament || '',
      echipa: anyT.echipa || '',
      tipInterventie: anyT.tipInterventie || '',
      grup: anyT.grup || '',
      responsabil: anyT.responsabil || anyT.initiator || '',
      descriereSimptom: anyT.descriereSimptom || '',
      sectie: anyT.sectie || '',
      linie: anyT.linie || '',
      codAfectat: anyT.codAfectat || '',
      denumireProdus: anyT.denumireProdus || '',
      prioritate: anyT.prioritate || 'Medie',
      termenInitiat: anyT.termenInitiat || '',
      termenCerut: anyT.termenCerut || '',
      status: anyT.status ?? '',
      piese: anyT.piese ?? '',
      deLaOra: anyT.deLaOra ?? '',
      panaLaOra: anyT.panaLaOra ?? '',
      cauzaInterventie: anyT.cauzaInterventie ?? '',
      explicatie: anyT.explicatie ?? '',
      operSupl: anyT.operatiiSuplimentare ?? '',
      validatDe: anyT.validatDe ?? '',
      validatCa: anyT.validatCa ?? '',
      explValid: anyT.explValid ?? '',
      sursaTicket: true
    };
  }

  private construiesteRanduri() {
    const dinActivitati = this.activitati.map((a, i) => this.mapActivitateToRand(a, i));
    const dinTickete = this.tickets.map((t, i) => this.mapTicketToRand(t, i));

    this.randuriActivitati = [...dinActivitati, ...dinTickete].sort((a, b) => {
      return (b.data || '').localeCompare(a.data || '');
    });
  }

  trackByRowId(index: number, item: RandActivitate): string {
    return item.rowId;
  }

  onRowClick(r: RandActivitate) {
    this.rowSelectat = r;
  }

  onRowDblClick(r: RandActivitate) {
    this.rowSelectat = r;

    this.randEdit = {
      data: r.data ? r.data.toString().substring(0, 10) : '',
      ticket: r.ticket,
      initiator: r.initiator,
      tipEchipament: r.tipEchipament,
      echipa: r.echipa,
      tipInterventie: r.tipInterventie,
      grup: r.grup,
      responsabil: r.responsabil,
      descriereSimptom: r.descriereSimptom,
      sectie: r.sectie,
      linie: r.linie,
      codAfectat: r.codAfectat,
      denumireProdus: r.denumireProdus,
      prioritate: r.prioritate,
      termenInitiat: r.termenInitiat,
      termenCerut: r.termenCerut,
      status: r.status
    };

    this.detaliiEdit = {
      piese: r.piese,
      deLaOra: r.deLaOra,
      panaLaOra: r.panaLaOra,
      cauzaInterventie: r.cauzaInterventie,
      explicatie: r.explicatie,
      operSupl: r.operSupl,
      validatDe: r.validatDe,
      validatCa: r.validatCa,
      explValid: r.explValid
    };

    this.showTicketPopup = true;
    this.showDetaliiPopup = true;
  }

  closeTicketPopup() {
    this.showTicketPopup = false;
    this.randEdit = null;
    if (!this.showDetaliiPopup) this.rowSelectat = null;
  }

  closeDetaliiPopup() {
    this.showDetaliiPopup = false;
    this.detaliiEdit = null;
    if (!this.showTicketPopup) this.rowSelectat = null;
  }

  saveTicket() {
    if (!this.randEdit || !this.rowSelectat) return;
    this.isSavingTicket = true;

    const isTicket = this.rowSelectat.sursaTicket;
    const idPart = this.rowSelectat.rowId.split('-')[1];

    let request$;
    if (isTicket) {
      const original = this.tickets.find(t => String((t as any).id) === String(idPart)) || {};
      const payload = { ...original, ...this.randEdit, id: Number(idPart) };
      request$ = (this.supportService as any).updateTicket?.(payload);
    } else {
      request$ = (this.maintenanceService as any).updateActivitate?.(idPart, this.randEdit);
    }

    if (!request$) {
      console.warn('Metoda de update nu exista inca in service.');
      this.isSavingTicket = false;
      return;
    }

    request$
      .pipe(finalize(() => this.isSavingTicket = false))
      .subscribe({
        next: () => {
          this.loadActivitati();
          this.loadTickets();
          this.closeTicketPopup();
        },
        error: (err: any) => console.error('Eroare la salvare:', err)
      });
  }

  saveDetalii() {
    if (!this.detaliiEdit || !this.rowSelectat || !this.randEdit) return;
    this.isSavingDetalii = true;

    const isTicket = this.rowSelectat.sursaTicket;
    const idPart = this.rowSelectat.rowId.split('-')[1];

    let request$;
    if (isTicket) {
      const original = this.tickets.find(t => String((t as any).id) === String(idPart)) || {};
      const payload = { 
        ...original, 
        ...this.detaliiEdit, 
        status: this.randEdit.status, 
        id: Number(idPart) 
      };
      request$ = (this.supportService as any).updateTicket?.(payload);
    } else {
      request$ = (this.maintenanceService as any).updateDetaliiActivitate?.(idPart, { ...this.detaliiEdit, status: this.randEdit.status });
    }

    if (!request$) {
      console.warn('Metoda updateDetaliiActivitate nu exista inca in service.');
      this.isSavingDetalii = false;
      return;
    }

    request$
      .pipe(finalize(() => this.isSavingDetalii = false))
      .subscribe({
        next: () => {
          this.loadActivitati();
          this.loadTickets();
          this.closeDetaliiPopup();
        },
        error: (err: any) => console.error('Eroare la salvarea detaliilor:', err)
      });
  }

  closeAllPopups() {
    this.showTicketPopup = false;
    this.showDetaliiPopup = false;
    this.randEdit = null;
    this.detaliiEdit = null;
    this.rowSelectat = null;
  }
}