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
import { NomenclatureService, GrupMunca, TipEchipament } from '../services/nomenclature.service';
import { AuthService } from '../services/auth.service';
import { ApiCallerService } from '../services/api-caller.service';

type SortKeyEch = 'denumire' | 'tipEchipament' | 'dataReceptie';

export interface RandActivitate {
  rowId: string;
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

  grupuriMunca: GrupMunca[] = [];
  sabloaneNomenclator: TipEchipament[] = [];
  isLoadingGrupuri: boolean = false;
  isLoadingOptions: boolean = false;
  currentUsername: string = '';

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
    private nomenclatureService: NomenclatureService,
    private authService: AuthService,
    private apiCallerService: ApiCallerService
  ) {}

  ngOnInit(): void {
    this.currentUsername =
      this.authService.getUserInfo().username ||
      this.apiCallerService.getUsername() ||
      '';

    this.route.queryParams.subscribe(params => {
      this.activeTab = params['tab'] || 'echipamente';
      this.loadDataForActiveTab();
    });
    this.loadGrupuriMunca();
    this.loadFilterOptions();

    this.nomenclatureService.getTipuriEchipament().subscribe((data: TipEchipament[]) => {
      this.sabloaneNomenclator = data;
      this.tipEchipamentOptions = data.map(t => t.denumire);
    });
  }

  setTab(tab: string) {
    this.activeTab = tab;
    this.loadDataForActiveTab();
  }

  private loadDataForActiveTab() {
    if (this.activeTab === 'activitati') {
      if (this.activitati.length === 0) this.loadActivitati();
      if (this.tickets.length === 0) this.loadTickets();
      if (this.echipamente.length === 0) this.loadEchipamente();
    }
    if (this.activeTab === 'echipamente' && this.echipamente.length === 0) {
      this.loadEchipamente();
    }
  }

  loadGrupuriMunca() {
    this.isLoadingGrupuri = true;
    this.nomenclatureService.getGrupuriMunca().subscribe({
      next: (data: GrupMunca[]) => { this.grupuriMunca = data; this.isLoadingGrupuri = false; },
      error: (err: any) => { console.error(err); this.isLoadingGrupuri = false; }
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

  echipamente: EchipamentPMB[] = [];
  isLoadingEchipamente: boolean = false;
  errorEchipamente: string | null = null;

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

  private periodDefs: { value: string; label: string; interval: number | null }[] = [
    { value: 'na', label: 'NA', interval: null },
    { value: 'lunar', label: 'Lunar', interval: 1 },
    { value: 'la_2_luni', label: 'La 2 luni', interval: 2 },
    { value: 'la_3_luni', label: 'La 3 luni', interval: 3 },
    { value: 'la_6_luni', label: 'La 6 luni', interval: 6 },
    { value: 'anual', label: 'Anual', interval: 12 }
  ];

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

  aplicaSablonNomenclator() {
    const tipSelectat = this.formModelEch.tipEchipament;
    const sablon = this.sabloaneNomenclator.find(s => s.denumire === tipSelectat);

    if (sablon) {
      this.formModelEch.autonoma = sablon.mentenanta_ac;
      this.formModelEch.preventiva = sablon.mentenanta_prev;
      this.formModelEch.calibrare = sablon.calibrare;
      this.formModelEch.controlESD = sablon.esd;
      this.formModelEch.electrosecuritate = sablon.electrosecuritate;
      this.formModelEch.backup = sablon.backup;
      this.formModelEch.listaPiese = sablon.lista_piese;
      this.formModelEch.listaOper = sablon.lista_operatii;
      this.formModelEch.responsabil = sablon.responsabil;

      this.updateExecutantForAutonoma();
    }
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

  activitatiSortColumn: string = 'ticket';
  activitatiSortDirection: 'asc' | 'desc' = 'asc';

  sortActivitatiBy(column: string) {
    if (this.activitatiSortColumn === column) {
      this.activitatiSortDirection = this.activitatiSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.activitatiSortColumn = column;
      this.activitatiSortDirection = 'asc';
    }
    this.aplicaSortareActivitati();
  }

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
    this.activitatiSortColumn = 'ticket';
    this.activitatiSortDirection = 'asc';
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
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(iso)) return iso;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  private getNextTicketNumber(): number {
    return this.randuriActivitati.length + 1;
  }

  onTipEchipamentChange() {
    if (!this.randEdit) return;
    const inventarTastat = this.randEdit.tipEchipament?.trim();
    
    const echipamentGasit = this.echipamente.find((e) => e.numar?.toLowerCase() === inventarTastat?.toLowerCase());

    if (echipamentGasit) {
      this.randEdit.echipa = echipamentGasit.denumire;
      this.randEdit.sectie = echipamentGasit.sectie;
      this.randEdit.linie = echipamentGasit.linie;
      this.randEdit.codAfectat = '';
    } else if (!inventarTastat) {
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

  private extractRowNum(rowId: string): number {
    return parseInt(rowId.split('-')[1], 10) || 0;
  }

  private construiesteRanduri() {
    const dinActivitati = this.activitati.map((a, i) => this.mapActivitateToRand(a, i));
    const ticketeValide = this.tickets.filter((t: any) => t.id !== 1024 && t.id !== 1025);
    const dinTickete = ticketeValide.map((t, i) => this.mapTicketToRand(t, i));

    const toateRandurile = [...dinActivitati, ...dinTickete];

    const cronologic = [...toateRandurile].sort((a, b) => {
      const dateA = a.data || '';
      const dateB = b.data || '';
      const dateComparison = dateA.localeCompare(dateB);
      if (dateComparison !== 0) return dateComparison;
      return this.extractRowNum(a.rowId) - this.extractRowNum(b.rowId);
    });

    cronologic.forEach((r, index) => {
      r.ticket = index + 1;
    });

    this.randuriActivitati = cronologic;
    this.aplicaSortareActivitati();
  }

  private aplicaSortareActivitati() {
    const col = this.activitatiSortColumn as keyof RandActivitate;
    const dir = this.activitatiSortDirection === 'asc' ? 1 : -1;

    this.randuriActivitati.sort((a: any, b: any) => {
      const av = a[col];
      const bv = b[col];

      if (av == null && bv == null) return 0;
      if (av == null) return -1 * dir;
      if (bv == null) return 1 * dir;

      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * dir;
      }
      
      return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' }) * dir;
    });
  }

  trackByRowId(index: number, item: RandActivitate): string {
    return item.rowId;
  }

  onRowClick(r: RandActivitate) {
    this.rowSelectat = r;
  }

  onRowDblClick(r: RandActivitate | null) {
    if (!r) {
      const dataCurentaIso = new Date().toISOString();
      r = {
        rowId: 'new-' + Date.now(),
        data: dataCurentaIso,
        ticket: this.getNextTicketNumber(),
        initiator: this.currentUsername,
        tipEchipament: '',
        echipa: '',
        tipInterventie: '',
        grup: '',
        responsabil: '',
        descriereSimptom: '',
        sectie: '',
        linie: '',
        codAfectat: '',
        denumireProdus: '',
        prioritate: 'Medie',
        termenInitiat: dataCurentaIso,
        termenCerut: '',
        status: 'Deschis',
        piese: '',
        deLaOra: '',
        panaLaOra: '',
        cauzaInterventie: '',
        explicatie: '',
        operSupl: '',
        validatDe: '',
        validatCa: '',
        explValid: '',
        sursaTicket: false
      };
    }

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

  openAddActivitateForm() {
    this.onRowDblClick(null);
  }

  deleteSelectedActivitate() {
    if (!this.rowSelectat) {
      alert('Te rog selectează o activitate din tabel pe care dorești să o elimini.');
      return;
    }

    if (!confirm(`Sigur dorești să ștergi activitatea / ticketul #${this.rowSelectat.ticket}?`)) {
      return;
    }

    const isTicket = this.rowSelectat.sursaTicket;
    const idPart = this.rowSelectat.rowId.split('-')[1];

    if (this.rowSelectat.rowId.startsWith('new-')) {
      this.randuriActivitati = this.randuriActivitati.filter(x => x.rowId !== this.rowSelectat?.rowId);
      this.rowSelectat = null;
      return;
    }

    let request$;
    if (isTicket) {
      request$ = this.supportService.deleteTicket(Number(idPart));
    } else {
      request$ = this.maintenanceService.deleteActivitate(Number(idPart));
    }

    request$.subscribe({
      next: () => {
        this.rowSelectat = null;
        this.loadActivitati();
        this.loadTickets();
      },
      error: (err: any) => {
        console.error('Eroare la ștergerea înregistrării:', err);
        alert('A apărut o eroare la ștergerea înregistrării din baza de date.');
      }
    });
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

  private buildSafePayload(): any {
    const payload: any = {
      ...this.randEdit,
      ...(this.detaliiEdit || {})
    };

    payload.denumire = payload.denumire || (payload.echipa ? `Intervenție ${payload.echipa}` : 'Intervenție mentenanță');
    payload.executant = payload.responsabil || '';
    payload.defEnuntat = payload.descriereSimptom || '';
    payload.pmbNr = payload.codAfectat || '';
    payload.dataOra = payload.data || new Date().toISOString();
    payload.activ = true;

    if (payload.ticket !== undefined && payload.ticket !== null) {
      payload.ticket = String(payload.ticket);
    }

    if (!payload.termenCerut) {
      payload.termenCerut = null;
    } else if (!payload.termenCerut.includes('T')) {
      const azi = new Date().toISOString().split('T')[0];
      payload.termenCerut = `${azi}T${payload.termenCerut}`;
    }

    if (!payload.termenInitiat) {
      payload.termenInitiat = null;
    }

    if (!payload.deLaOra) {
      payload.deLaOra = null;
    } else if (payload.deLaOra.length === 5) {
      payload.deLaOra += ':00';
    }

    if (!payload.panaLaOra) {
      payload.panaLaOra = null;
    } else if (payload.panaLaOra.length === 5) {
      payload.panaLaOra += ':00';
    }

    return payload;
  }

  saveTicket() {
    if (!this.randEdit || !this.rowSelectat) return;
    
    if (!this.randEdit.tipEchipament || this.randEdit.tipEchipament.trim() === '') {
      alert('Te rog completează "Nr. Inventar Echipament"!');
      return; 
    }

    this.isSavingTicket = true;

    const isTicket = this.rowSelectat.sursaTicket;
    const idPart = this.rowSelectat.rowId.split('-')[1];
    const payload = this.buildSafePayload();

    const onError = (err: any) => {
      this.isSavingTicket = false;
      console.error(err);
      const detalii = err.error?.detail ? JSON.stringify(err.error.detail, null, 2) : err.message;
      alert(`Backend-ul a respins datele (422):\n\n${detalii}`);
    };

    const onSuccess = () => {
      this.isSavingTicket = false;
      this.loadActivitati();
      this.loadTickets();
      this.closeAllPopups();
    };

    if (isTicket) {
      const original = this.tickets.find(t => String((t as any).id) === String(idPart)) || {};
      const finalPayload = { ...original, ...payload, id: Number(idPart) };
      (this.supportService as any).updateTicket?.(finalPayload).subscribe({
        next: onSuccess, error: onError
      });
    } else {
      if (this.rowSelectat.rowId.startsWith('new-')) {
        this.maintenanceService.createActivitate(payload).subscribe({
          next: onSuccess, error: onError
        });
      } else {
        this.maintenanceService.updateActivitate(Number(idPart), payload).subscribe({
          next: onSuccess, error: onError
        });
      }
    }
  }

  saveDetalii() {
    if (!this.detaliiEdit || !this.rowSelectat || !this.randEdit) return;
    this.isSavingDetalii = true;

    const isTicket = this.rowSelectat.sursaTicket;
    const idPart = this.rowSelectat.rowId.split('-')[1];
    const payload = this.buildSafePayload();

    const onError = (err: any) => {
      this.isSavingDetalii = false;
      console.error(err);
      const detalii = err.error?.detail ? JSON.stringify(err.error.detail, null, 2) : err.message;
      alert(`Backend-ul a respins datele detaliate (422):\n\n${detalii}`);
    };

    const onSuccess = () => {
      this.isSavingDetalii = false;
      this.loadActivitati();
      this.loadTickets();
      this.closeAllPopups();
    };

    if (isTicket) {
      const original = this.tickets.find(t => String((t as any).id) === String(idPart)) || {};
      const finalPayload = { ...original, ...payload, status: this.randEdit.status, id: Number(idPart) };
      (this.supportService as any).updateTicket?.(finalPayload).subscribe({
        next: onSuccess, error: onError
      });
    } else {
      if (this.rowSelectat.rowId.startsWith('new-')) {
        this.maintenanceService.createActivitate(payload).subscribe({
          next: onSuccess, error: onError
        });
      } else {
        this.maintenanceService.updateDetaliiActivitate(Number(idPart), payload).subscribe({
          next: onSuccess, error: onError
        });
      }
    }
  }

  closeAllPopups() {
    this.showTicketPopup = false;
    this.showDetaliiPopup = false;
    this.randEdit = null;
    this.detaliiEdit = null;
    this.rowSelectat = null;
  }
}