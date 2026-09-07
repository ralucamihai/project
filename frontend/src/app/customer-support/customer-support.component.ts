import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  CustomerSupportService,
  Ticket,
  Order,
  Sugestie,
  Reclamatie
} from '../services/customer-support.service';
import { AuthService } from '../services/auth.service';
import { ApiCallerService } from '../services/api-caller.service';
import { NomenclatureService, GrupMunca } from '../services/nomenclature.service';

type Perioada = 'Total' | 'Anual' | 'Lunar' | 'Saptaminal' | 'Zilnic' | 'La_data';
type Limita = '100' | '500' | '1000' | 'ALL';

@Component({
  selector: 'app-customer-support',
  templateUrl: './customer-support.component.html',
  styleUrl: './customer-support.component.css',
  standalone: false
})
export class CustomerSupportComponent implements OnInit, OnDestroy {

  activeTab: string = 'tickets';

  tabs = [
    { key: 'tickets', label: 'Tickets' },
    { key: 'orders', label: 'Orders' },
    { key: 'feedback', label: 'Sugestii & Reclamații' }
  ];

  ticketStatusOptions = ['Deschis', 'In lucru', 'Rezolvat', 'Închis'];
  ticketPrioritateOptions = ['Scăzută', 'Medie', 'Ridicată'];

  ticketTipInterventieOptions = [
    'Accidentala', 'AEM', 'Ajustare parametrii', 'Backup', 'Cladiri',
    'Curatare_echip', 'Electric', 'Electrosecuritate', 'ESD', 'Imbunatatire',
    'Instalare Echipament', 'Masuratoare', 'Pneumatic', 'Pornire_fabricatie',
    'Predictiva', 'Prelucrare mecanica repere', 'Preventiva', 'Produs_nou',
    'Reglaj echipament', 'Reglaj stanta', 'Schimb_echip', 'Schimb_produs',
    'Schimb_recipient', 'Schimb_stanta'
  ];

  grupuriMunca: GrupMunca[] = [];
  isLoadingGrupuri: boolean = false;

  clockInterval: any;

  get grupOptions(): string[] {
    return this.grupuriMunca.map(g => g.grup);
  }

  get responsabiliCurenti(): string[] {
    const grupSelectat = (this.formModel?.grup || '').trim().toLowerCase();
    if (!grupSelectat) return [];
    const gasit = this.grupuriMunca.find(g => g.grup.trim().toLowerCase() === grupSelectat);
    return gasit ? gasit.membri : [];
  }

  loadGrupuriMunca() {
    this.isLoadingGrupuri = true;
    this.nomenclatureService.getGrupuriMunca().subscribe({
      next: data => { this.grupuriMunca = data; this.isLoadingGrupuri = false; },
      error: err => { console.error(err); this.isLoadingGrupuri = false; }
    });
  }

  tipuriEchipamentNomenclator: string[] = ['Cabina', 'Dispozitiv', 'Echipament', 'Electro securitate', 'ESD punct de măsurare'];

  echipamenteFizice = [
    { inventar: 'INV-001', nume: 'Cabina 1', tip: 'Cabina', sectie: 'Testare Finală', linie: 'Linia 1', codAfectat: 'CAB-01' },
    { inventar: 'INV-002', nume: 'Cabina 2', tip: 'Cabina', sectie: 'Testare Finală', linie: 'Linia 2', codAfectat: 'CAB-02' },
    { inventar: 'INV-003', nume: 'Dispozitiv Lipire A', tip: 'Dispozitiv', sectie: 'Asamblare', linie: 'Linia 2', codAfectat: 'DISP-A' },
    { inventar: 'INV-004', nume: 'Tester ESD Principal', tip: 'ESD punct de măsurare', sectie: 'Control Calitate', linie: 'Linia 1', codAfectat: 'ESD-01' },
    { inventar: 'INV-005', nume: 'Robot Echipare 1', tip: 'Echipament', sectie: 'SMD', linie: 'Linia 3', codAfectat: 'ROB-01' }
  ];
  echipamenteDb = this.echipamenteFizice;

  get echipamenteCurente() {
    return this.echipamenteFizice.filter(e => e.tip === this.formModel.tipEchipament);
  }

  ticketColumnFilters: Record<string, string[]> = {};
  ticketFilterSearchText: Record<string, string> = {};
  ticketFilteredOptions: Record<string, any[]> = {};
  ticketShowDropdown: Record<string, boolean> = {};

  ticketSortColumn: string = 'id';
  ticketSortDirection: 'asc' | 'desc' = 'asc';

  ticketDisplayedColumns: string[] = [
    'id', 'initiator', 'echipa', 'tipInterventie', 'grup', 'responsabil', 
    'descriereSimptom', 'sectie', 'linie', 'codAfectat', 'denumireProdus', 
    'prioritate', 'status'
  ];

  sortTicketsBy(column: string) {
    if (this.ticketSortColumn === column) {
      this.ticketSortDirection = this.ticketSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.ticketSortColumn = column;
      this.ticketSortDirection = 'asc';
    }
  }

  getTicketUniqueValues(column: string): any[] {
    return Array.from(
      new Set(this.tickets.map((row: any) => row[column]).filter((val) => val !== null && val !== undefined))
    ).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }));
  }

  toggleTicketDropdown(col: string, event: Event): void {
    event.stopPropagation();
    Object.keys(this.ticketShowDropdown).forEach((key) => {
      if (key !== col) this.ticketShowDropdown[key] = false;
    });
    this.ticketShowDropdown[col] = !this.ticketShowDropdown[col];
    if (this.ticketShowDropdown[col]) this.updateTicketFilteredOptions(col);
  }

  onTicketSearchInput(col: string, event: Event): void {
    event.stopPropagation();
    const inputValue = (event.target as HTMLInputElement)?.value ?? '';
    this.ticketFilterSearchText[col] = inputValue;
    this.updateTicketFilteredOptions(col);
    this.ticketShowDropdown[col] = true;
  }

  updateTicketFilteredOptions(col: string): void {
    const searchText = (this.ticketFilterSearchText[col] ?? '').toLowerCase();
    const allOptions = this.getUniqueValuesColumn(col);
    this.ticketFilteredOptions[col] = !searchText
      ? allOptions
      : allOptions.filter((option) => String(option).toLowerCase().includes(searchText));
  }

  getUniqueValuesColumn(column: string): any[] {
    return Array.from(
      new Set(this.tickets.map((row: any) => row[column]).filter((val) => val !== null && val !== undefined))
    );
  }

  toggleTicketOption(col: string, option: any, event: Event): void {
    event.stopPropagation();
    if (!this.ticketColumnFilters[col]) this.ticketColumnFilters[col] = [];
    const index = this.ticketColumnFilters[col].indexOf(option);
    if (index === -1) this.ticketColumnFilters[col].push(option);
    else this.ticketColumnFilters[col].splice(index, 1);
  }

  isTicketOptionSelected(col: string, option: any): boolean {
    return (this.ticketColumnFilters[col] ?? []).includes(option);
  }

  clearTicketSelections(col: string, event: Event): void {
    event.stopPropagation();
    this.ticketColumnFilters[col] = [];
    this.ticketFilterSearchText[col] = '';
    this.updateTicketFilteredOptions(col);
  }

  getTicketFilterDisplayText(col: string): string {
    const selections = this.ticketColumnFilters[col] ?? [];
    if (!selections.length) return `All ${col}`;
    if (selections.length === 1) return String(selections[0]);
    return `${selections.length} selected`;
  }

  onTipEchipamentChange() {
    if (!this.formModel) return;
    const inventarTastat = this.formModel.tipEchipament?.trim();
    const echipamentGasit = this.echipamenteFizice.find((e: any) => e.inventar.toLowerCase() === inventarTastat?.toLowerCase());

    if (echipamentGasit) {
      this.formModel.echipa = echipamentGasit.nume;
      this.formModel.sectie = echipamentGasit.sectie;
      this.formModel.linie = echipamentGasit.linie;
      this.formModel.codAfectat = echipamentGasit.codAfectat;
    } else if (!inventarTastat) {
      this.formModel.echipa = '';
      this.formModel.sectie = '';
      this.formModel.linie = '';
      this.formModel.codAfectat = '';
    }
  }

  onEchipamentChange() {
    const echipamentSelectat = this.echipamenteFizice.find(e => e.nume === this.formModel.echipa);
    if (echipamentSelectat) {
      this.formModel.sectie = echipamentSelectat.sectie;
      this.formModel.linie = echipamentSelectat.linie;
    } else {
      this.formModel.sectie = '';
      this.formModel.linie = '';
    }
  }

  onGrupChange() {
    this.formModel.responsabil = '';
  }

  orderStatusOptions = ['In procesare', 'Expediat', 'Livrat', 'Anulat'];
  orderCategorieProdusOptions = ['Componente', 'Consumabile', 'Echipamente', 'Altele'];
  orderReceptieOptions: string[] = ['Aprobat', 'Refuzat', 'În așteptare'];
  orderSectieOptions: string[] = [
    'Activitate productie', 'Senzori si lampi', 'Sectia 1 - direct productie', 'Sectia 1 - indirect productie', 
    'Sectia 1 - CQW', 'Sectia 1 - personal auxiliar', 'Sectia 1 - personal TESA', 'LP - electronica', 
    'Sectia LP SEHO 1 - direct productie', 'Sectia LP SEHO 2 - direct productie', 'Sectia 2 - indirect productie', 
    'Sectia 2 - CQW', 'Sectia 2 - personal auxiliar', 'Sectia 2 - personal TESA', 'Tools', 'Sectia HL', 
    'Sectia 3 - direct productie', 'Sectia 3 - indirect productie', 'Sectia 3 - CQW', 'Sectia 3 - personal auxiliar', 
    'Sectia 3 - personal TESA', 'Solutions', 'Sectia 5 - direct productie', 'Sectia 5 - indirect productie', 
    'Sectia 5 - CQW', 'Sectia 5 - personal auxiliar', 'Sectia 5 - personal TESA', 'Tampo', 'Tampo - direct productie', 
    'Atelier - SMT', 'SMT - direct productie', 'Atelier lite', 'Lite - direct productie', 'Atelier lacuire', 
    'Lacuire - direct productie', 'Etichete', 'Alte activitati productive', 'Auxiliare', 'Alte categorii'
  ];

  orderSortColumn: string = '';
  orderSortDirection: 'asc' | 'desc' = 'asc';

  sortOrdersBy(column: string) {
    if (this.orderSortColumn === column) {
      this.orderSortDirection = this.orderSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.orderSortColumn = column;
      this.orderSortDirection = 'asc';
    }
  }

  sugestieStatusOptions = ['Nou', 'In analiză', 'Acceptat', 'Respins'];
  sugestieCategorieOptions = ['Funcționalitate', 'UI/UX', 'Performanță', 'Altele'];

  reclamatieStatusOptions = ['Deschis', 'In investigare', 'Rezolvat', 'Respins'];
  reclamatieSeveritateOptions = ['Scăzută', 'Medie', 'Ridicată', 'Critică'];

  perioadaOptions: { value: Perioada; label: string }[] = [
    { value: 'Total', label: 'Total' },
    { value: 'Anual', label: 'Anual' },
    { value: 'Lunar', label: 'Lunar' },
    { value: 'Saptaminal', label: 'Saptaminal' },
    { value: 'Zilnic', label: 'Zilnic' },
    { value: 'La_data', label: 'La_data' }
  ];
  limitaOptions: Limita[] = ['100', '500', '1000', 'ALL'];

  tickets: Ticket[] = [];
  orders: Order[] = [];
  sugestii: Sugestie[] = [];
  reclamatii: Reclamatie[] = [];

  currentUsername: string = '';

  ticketFiltre = {
    search: '',
    limita: 'ALL' as Limita,
    doarDeschise: false
  };

  orderFiltre = {
    descriere: '', sectie: '', centruCost: '', nrInventar: '',
    perioada: 'Total' as Perioada, laData: '', limita: 'ALL' as Limita
  };

  sugestieFiltre = {
    search: '', categorie: '', sectie: '', linie: '', locatie: '', responsabil: '',
    initiator: '', kpi: '', perioada: 'Total' as Perioada, laData: '', limita: '100' as Limita,
    stare: { Nou: true, 'In analiză': true, Acceptat: true, Respins: false } as Record<string, boolean>
  };

  reclamatieFiltre = {
    search: '', severitate: '', sectie: '', linie: '', locatie: '', responsabil: '',
    initiator: '', kpi: '', perioada: 'Total' as Perioada, laData: '', limita: '100' as Limita,
    stare: { Deschis: true, 'In investigare': true, Rezolvat: true, Respins: false } as Record<string, boolean>
  };

  showForm: boolean = false;
  isEditMode: boolean = false;
  formEntity: 'tickets' | 'orders' | 'suggestions' | 'complaints' = 'tickets';
  formModel: any = {};
  showAdvanced: Record<string, boolean> = { orders: true, suggestions: true, complaints: true };

  isLoading: boolean = false;
  errorMessage: string | null = null;

  selectedTicketIndex: number | null = null;
  selectedOrderIndex: number | null = null;
  selectedSuggestionIndex: number | null = null;
  selectedComplaintIndex: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private supportService: CustomerSupportService,
    private authService: AuthService,
    private apiCallerService: ApiCallerService,
    private nomenclatureService: NomenclatureService
  ) {}

  ngOnInit(): void {
    this.currentUsername =
      this.authService.getUserInfo().username ||
      this.apiCallerService.getUsername() ||
      '';

    this.route.queryParams.subscribe(params => {
      const tab = params['tab'] || 'tickets';
      this.activeTab = (tab === 'suggestions' || tab === 'complaints') ? 'feedback' : tab;
    });
    this.loadAll();
    this.loadGrupuriMunca();
  }

  ngOnDestroy(): void {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  loadAll() {
    this.isLoading = true;
    this.errorMessage = null;

    this.supportService.getTickets().subscribe({
      next: data => this.tickets = data,
      error: err => { console.error(err); this.errorMessage = 'Eroare la încărcarea ticketelor.'; }
    });
    this.supportService.getOrders().subscribe({
      next: data => this.orders = data,
      error: err => { console.error(err); this.errorMessage = 'Eroare la încărcarea comenzilor.'; }
    });
    this.supportService.getSuggestions().subscribe({
      next: data => this.sugestii = data,
      error: err => { console.error(err); this.errorMessage = 'Eroare la încărcarea sugestiilor.'; }
    });
    this.supportService.getComplaints().subscribe({
      next: data => this.reclamatii = data,
      error: err => { console.error(err); this.errorMessage = 'Eroare la încărcarea reclamațiilor.'; },
      complete: () => this.isLoading = false
    });
  }

  setTab(tab: string) {
    this.activeTab = tab;
    this.selectedTicketIndex = null;
    this.selectedOrderIndex = null;
    this.selectedSuggestionIndex = null;
    this.selectedComplaintIndex = null;
  }

  toggleAdvanced(tab: string) {
    this.showAdvanced[tab] = !this.showAdvanced[tab];
  }

  private inPerioada(dataStr: string | undefined, perioada: Perioada, laData: string): boolean {
    if (perioada === 'Total') return true;
    if (!dataStr) return false;
    const d = new Date(dataStr);
    if (isNaN(d.getTime())) return false;
    const now = new Date();

    switch (perioada) {
      case 'Anual': return d.getFullYear() === now.getFullYear();
      case 'Lunar': return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      case 'Saptaminal': {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 7);
        return d >= start && d < end;
      }
      case 'Zilnic': return d.toDateString() === now.toDateString();
      case 'La_data':
        if (!laData) return true;
        return d.toDateString() === new Date(laData).toDateString();
      default: return true;
    }
  }

  private applyLimita<T>(arr: T[], limita: Limita): T[] {
    if (limita === 'ALL') return arr;
    return arr.slice(0, parseInt(limita, 10));
  }

  private matchField(item: any, f: any, key: string, itemKey?: string): boolean {
    const ik = itemKey || key;
    if (f.activ && f.activ[key] === false) return true;
    const val = (f[key] || '').toString().trim();
    if (!val) return true;
    return (item[ik] || '').toString().toLowerCase().includes(val.toLowerCase());
  }

  private matchCommon(item: any, f: any): boolean {
    return this.matchField(item, f, 'sectie') &&
      this.matchField(item, f, 'linie') &&
      this.matchField(item, f, 'locatie') &&
      this.matchField(item, f, 'responsabil') &&
      this.matchField(item, f, 'initiator') &&
      this.matchField(item, f, 'kpi');
  }

  formatDataOra(iso: string | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const data = d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const ora = d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `${data} ${ora}`;
  }

  get nextTicketId(): number {
    const numere = this.tickets
      .map(t => parseInt(String((t as any).id), 10))
      .filter(n => !isNaN(n));
    return numere.length > 0 ? Math.max(...numere) + 1 : 1;
  }

  get ticketsFiltrate(): Ticket[] {
    const term = this.ticketFiltre.search.trim().toLowerCase();
    const doarDeschise = this.ticketFiltre.doarDeschise;
    
    let rezultat = this.tickets.filter(t => {
      const tAny = t as any;
      
      if (doarDeschise && tAny.status !== 'Deschis') {
        return false;
      }
      
      if (term) {
        const matchesGlobal = (
          tAny.id?.toString().includes(term) ||
          (tAny.initiator || '').toLowerCase().includes(term) ||
          (tAny.echipa || '').toLowerCase().includes(term) ||
          (tAny.tipInterventie || '').toLowerCase().includes(term) ||
          (tAny.grup || '').toLowerCase().includes(term) ||
          (tAny.descriereSimptom || '').toLowerCase().includes(term) ||
          (tAny.sectie || '').toLowerCase().includes(term) ||
          (tAny.linie || '').toLowerCase().includes(term) ||
          (tAny.codAfectat || '').toLowerCase().includes(term) ||
          (tAny.denumireProdus || '').toLowerCase().includes(term) ||
          (tAny.prioritate || '').toLowerCase().includes(term) ||
          (tAny.status || '').toLowerCase().includes(term)
        );
        if (!matchesGlobal) return false;
      }

      for (let col of this.ticketDisplayedColumns) {
        const selectedFilters = this.ticketColumnFilters[col];
        if (selectedFilters && selectedFilters.length > 0) {
          const cellVal = tAny[col];
          const matchesCol = selectedFilters.some(
            (filter) => String(cellVal).toLowerCase() === String(filter).toLowerCase()
          );
          if (!matchesCol) return false;
        }
      }

      return true;
    });

    if (this.ticketSortColumn) {
      const col = this.ticketSortColumn;
      const dir = this.ticketSortDirection === 'asc' ? 1 : -1;
      rezultat = [...rezultat].sort((a: any, b: any) => {
        const av = a[col];
        const bv = b[col];
        if (av == null && bv == null) return 0;
        if (av == null) return -1 * dir;
        if (bv == null) return 1 * dir;
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
        return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' }) * dir;
      });
    }

    return rezultat;
  }
  
  get ordersFiltrate(): Order[] {
    const f = this.orderFiltre;
    const termDesc = f.descriere.trim().toLowerCase();
    let rezultat = this.orders.filter(o => {
      const oAny = o as any;
      return (!termDesc || (oAny.descriere || '').toLowerCase().includes(termDesc)) &&
        (!f.sectie || oAny.sectie === f.sectie) &&
        (!f.centruCost || (oAny.centruCost || '').toLowerCase().includes(f.centruCost.trim().toLowerCase())) &&
        (!f.nrInventar || (oAny.nrInventar || '').toLowerCase().includes(f.nrInventar.trim().toLowerCase())) &&
        this.inPerioada(o.dataComanda, f.perioada, f.laData);
    });

    if (this.orderSortColumn) {
      const col = this.orderSortColumn;
      const dir = this.orderSortDirection === 'asc' ? 1 : -1;
      rezultat = [...rezultat].sort((a: any, b: any) => {
        const av = a[col];
        const bv = b[col];
        if (av == null && bv == null) return 0;
        if (av == null) return -1 * dir;
        if (bv == null) return 1 * dir;
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
        return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' }) * dir;
      });
    }

    return this.applyLimita(rezultat, f.limita);
  }

  get sugestiiFiltrate(): Sugestie[] {
    const f = this.sugestieFiltre;
    const term = f.search.trim().toLowerCase();
    const rezultat = this.sugestii.filter(s =>
      (!term || s.titlu.toLowerCase().includes(term) || s.autor.toLowerCase().includes(term)) &&
      (!f.categorie || s.categorie === f.categorie) &&
      (f.stare[s.status] !== false) &&
      this.inPerioada(s.dataTrimitere, f.perioada, f.laData) &&
      this.matchCommon(s, f)
    );
    return this.applyLimita(rezultat, f.limita);
  }

  get reclamatiiFiltrate(): Reclamatie[] {
    const f = this.reclamatieFiltre;
    const term = f.search.trim().toLowerCase();
    const rezultat = this.reclamatii.filter(r =>
      (!term || r.titlu.toLowerCase().includes(term) || r.client.toLowerCase().includes(term)) &&
      (!f.severitate || r.severitate === f.severitate) &&
      (f.stare[r.status] !== false) &&
      this.inPerioada(r.dataTrimitere, f.perioada, f.laData) &&
      this.matchCommon(r, f)
    );
    return this.applyLimita(rezultat, f.limita);
  }

  resetFiltre() {
    this.ticketFiltre = { search: '', limita: 'ALL', doarDeschise: false };
    this.ticketSortColumn = 'id';
    this.ticketSortDirection = 'asc';

    this.orderFiltre = {
      descriere: '', sectie: '', centruCost: '', nrInventar: '',
      perioada: 'Total', laData: '', limita: 'ALL'
    };
    this.orderSortColumn = '';
    this.orderSortDirection = 'asc';
    
    this.sugestieFiltre = {
      search: '', categorie: '', sectie: '', linie: '', locatie: '', responsabil: '',
      initiator: '', kpi: '', perioada: 'Total', laData: '', limita: '100',
      stare: { Nou: true, 'In analiză': true, Acceptat: true, Respins: false }
    };
    this.reclamatieFiltre = {
      search: '', severitate: '', sectie: '', linie: '', locatie: '', responsabil: '',
      initiator: '', kpi: '', perioada: 'Total', laData: '', limita: '100',
      stare: { Deschis: true, 'In investigare': true, Rezolvat: true, Respins: false }
    };
  }

  selectRow(entity: 'tickets' | 'orders' | 'suggestions' | 'complaints', index: number) {
    if (entity === 'tickets') {
      this.selectedTicketIndex = this.selectedTicketIndex === index ? null : index;
    } else if (entity === 'orders') {
      this.selectedOrderIndex = this.selectedOrderIndex === index ? null : index;
    } else if (entity === 'suggestions') {
      this.selectedSuggestionIndex = this.selectedSuggestionIndex === index ? null : index;
    } else if (entity === 'complaints') {
      this.selectedComplaintIndex = this.selectedComplaintIndex === index ? null : index;
    }
  }

  openAddForm(entity: 'tickets' | 'orders' | 'suggestions' | 'complaints') {
    this.formEntity = entity;
    this.isEditMode = false;
    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toTimeString().slice(0, 5);

    if (entity === 'tickets') {
      const setTime = () => {
        let tzOffset = (new Date()).getTimezoneOffset() * 60000;
        this.formModel.termenInitiat = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 19);
      };

      this.formModel = {
        id: null,
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
        termenInitiat: '', 
        termenCerut: null,
        status: 'Deschis'
      };

      setTime();
      this.clockInterval = setInterval(() => {
        setTime();
      }, 1000);

    } else if (entity === 'orders') {
      this.formModel = {
        numarComanda: '',
        dataComanda: today,
        sectie: '',
        centruCost: '',
        nrInventar: '',
        descriere: '',
        cantitate: 1,
        desenDoc: '',
        termenSolicitat: today,
        prioritateNumar: 1,
        receptie: '',
        dataRec: '',
        user: this.currentUsername,
        aprobatDeviz: '',
        documentatie: '',
        materiale: '',
        disponibilitate: '',
        deviz: '',
        executant: '',
        timpExecutie: '',
        status: this.orderStatusOptions[0],
        termenConfirmat: ''
      };
    } else if (entity === 'suggestions') {
      this.formModel = {
        titlu: '', descriere: '', autor: '', categorie: 'Funcționalitate', status: 'Nou', dataTrimitere: today,
        prioritate: 'Medie', numarIntern: '', initiator: '', sectie: '', linie: '', locatie: '',
        responsabil: '', cauzaInterventie: '', explicatie: '', operatiiSuplimentare: '',
        termenData: today, termenOra: nowTime, kpi: '', deLaOra: nowTime, panaLaOra: nowTime
      };
    } else if (entity === 'complaints') {
      this.formModel = {
        titlu: '', descriere: '', client: '', severitate: 'Medie', status: 'Deschis', dataTrimitere: today,
        numarIntern: '', initiator: '', sectie: '', linie: '', locatie: '', responsabil: '',
        cauzaInterventie: '', explicatie: '', operatiiSuplimentare: '',
        termenData: today, termenOra: nowTime, kpi: '', deLaOra: nowTime, panaLaOra: nowTime
      };
    }
    this.showForm = true;
  }

  openEditForm(entity: 'tickets' | 'orders' | 'suggestions' | 'complaints', item: any) {
    this.formEntity = entity;
    this.isEditMode = true;
    this.formModel = { ...item };
    if (entity === 'tickets') {
      this.formModel.initiator = item.initiator;
      if (this.formModel.termenCerut && this.formModel.termenCerut.includes('T')) {
          this.formModel.termenCerut = this.formModel.termenCerut.slice(0, 19);
      }
      if (this.formModel.termenInitiat && this.formModel.termenInitiat.includes('T')) {
          this.formModel.termenInitiat = this.formModel.termenInitiat.slice(0, 19);
      }
    }
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  saveForm() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }

    let payloadToSave = { ...this.formModel };

    if (this.formEntity === 'tickets') {
      if (!payloadToSave.descriereSimptom || payloadToSave.descriereSimptom.trim() === '') {
        alert('Te rog completează "Descr. Simptom"! Fără el nu poți salva.');
        return; 
      }
      
      if (!this.isEditMode) {
        let tzOffset = (new Date()).getTimezoneOffset() * 60000;
        payloadToSave.termenInitiat = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 19);
      }

      if (!payloadToSave.termenCerut || payloadToSave.termenCerut === '') {
        payloadToSave.termenCerut = null;
      } else {
        const d = new Date(payloadToSave.termenCerut);
        if (!isNaN(d.getTime())) {
          payloadToSave.termenCerut = d.toISOString();
        }
      }
    }

    const onDone = () => { 
      this.loadAll(); 
      this.closeForm(); 
    };

    const onError = (err: any) => { 
      console.error(err); 
      let msg = 'Eroare la salvare.';
      if (err.error && err.error.detail) {
        msg = 'Baza de date a respins informația deoarece un câmp este incorect:\n\n';
        msg += JSON.stringify(err.error.detail, null, 2);
      }
      alert(msg); 
    };

    if (this.formEntity === 'tickets') {
      const { id, initiator, ...payloadForCreate } = payloadToSave;

      if (this.isEditMode) {
        this.supportService.updateTicket(payloadToSave).subscribe({ next: onDone, error: onError });
      } else {
        this.supportService.createTicket(payloadForCreate).subscribe({ next: onDone, error: onError });
      }

    } else if (this.formEntity === 'orders') {
      const obs = this.isEditMode 
        ? this.supportService.updateOrder(payloadToSave) 
        : this.supportService.createOrder(payloadToSave);
      obs.subscribe({ next: onDone, error: onError });
    } else if (this.formEntity === 'suggestions') {
      const obs = this.isEditMode 
        ? this.supportService.updateSuggestion(payloadToSave) 
        : this.supportService.createSuggestion(payloadToSave);
      obs.subscribe({ next: onDone, error: onError });
    } else if (this.formEntity === 'complaints') {
      const obs = this.isEditMode 
        ? this.supportService.updateComplaint(payloadToSave) 
        : this.supportService.createComplaint(payloadToSave);
      obs.subscribe({ next: onDone, error: onError });
    }
  }

  deleteItem(entity: 'tickets' | 'orders' | 'suggestions' | 'complaints', id: number) {
    const mesaj = entity === 'tickets' 
      ? `Sigur vrei să ștergi ticketul #${id}? Toate tichetele următoare vor fi decrementate cu -1 pentru a umple golul.`
      : 'Sigur vrei să ștergi această înregistrare?';

    if (!confirm(mesaj)) return;

    const onDone = () => this.loadAll();
    const onError = (err: any) => {
      console.error('Eroare la ștergere:', err);
      const detalii = err?.error?.detail || err?.message || 'Eroare necunoscută';
      alert(`Ștergerea a eșuat:\n\n${detalii}`);
    };

    if (entity === 'tickets') {
      this.supportService.deleteTicket(id).subscribe({
        next: () => {
          const deActualizat = this.tickets.filter(t => (t as any).id > id);
          
          if (deActualizat.length === 0) {
            this.loadAll();
            return;
          }

          let procesate = 0;
          deActualizat.forEach(t => {
            const nouTicketId = (t as any).id - 1;
            const payload = { ...t, id: nouTicketId };
            
            this.supportService.updateTicket(payload).subscribe({
              next: () => {
                procesate++;
                if (procesate === deActualizat.length) this.loadAll();
              },
              error: (err) => {
                console.error(`Eroare la decrementare ticket ${(t as any).id}:`, err);
                procesate++;
                if (procesate === deActualizat.length) this.loadAll();
              }
            });
          });
        },
        error: onError
      });
    }
    else if (entity === 'orders') this.supportService.deleteOrder(id).subscribe({ next: onDone, error: onError });
    else if (entity === 'suggestions') this.supportService.deleteSuggestion(id).subscribe({ next: onDone, error: onError });
    else if (entity === 'complaints') this.supportService.deleteComplaint(id).subscribe({ next: onDone, error: onError });
  }

  statusClass(status: string): string {
    switch (status) {
      case 'Rezolvat': case 'Livrat': case 'Acceptat': return 'badge badge-success';
      case 'In lucru': case 'In procesare': case 'In analiză': case 'Expediat': case 'In investigare': return 'badge badge-warning';
      case 'Deschis': case 'Nou': return 'badge badge-info';
      case 'Închis': case 'Anulat': case 'Respins': return 'badge badge-danger';
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

  severitateClass(severitate: string): string {
    switch (severitate) {
      case 'Critică': case 'Ridicată': return 'badge badge-danger';
      case 'Medie': return 'badge badge-warning';
      case 'Scăzută': return 'badge badge-success';
      default: return 'badge';
    }
  }

  keys(obj: Record<string, boolean>): string[] {
    return Object.keys(obj);
  }

  ticketViewMode: 'table' | 'kanban' = 'table';

  setTicketViewMode(mode: 'table' | 'kanban') {
    this.ticketViewMode = mode;
  }

  schimbaStareKanban(t: Ticket, nouaStare: string) {
    if (t.status === nouaStare) return;
    const ticketActualizat = { ...t, status: nouaStare };
    this.supportService.updateTicket(ticketActualizat).subscribe({
      next: () => this.loadAll(),
      error: err => { console.error(err); alert('Eroare la actualizarea statusului tichetului.'); }
    });
  }
}