import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { 
  NomenclatureService, UtilizatorPMB, GrupMunca, Piesa, ListaPiese, 
  TipEchipament, Sectie, TipInterventie, CategorieDefect,
  OperatieMentenanta, ListaOperatii 
} from '../services/nomenclature.service';
import { ApiCallerService } from '../services/api-caller.service';

type SortKeyInterv = 'nr' | 'denumire';
type SortKeyCtg = 'nr' | 'idCategorie' | 'denumire';
type SortKeyUtil = 'marca' | 'nume' | 'functie' | 'grup' | 'user';
type SortKeyGrup = 'nr' | 'grup' | 'membri' | 'departament';
type SortKeyPiese = 'id' | 'denumire' | 'codSap' | 'pozitieRaft' | 'partNumber' | 'pretRon' | 'stocCurent' | 'stocMinim' | '';

@Component({
  selector: 'app-nomenclature',
  templateUrl: './nomenclature.component.html',
  styleUrl: './nomenclature.component.css',
  standalone: false
})
export class NomenclatureComponent implements OnInit {

  activeTab: string = 'tip_echipament';

  tabs = [
    { key: 'tip_echipament', label: 'Tip Echipament' },
    { key: 'tip_interventie', label: 'Tip Intervenție' },
    { key: 'categorie_defect', label: 'Categorie Defect' },
    { key: 'piese_schimb', label: 'Piese' },
    { key: 'operatii', label: 'Operații' },
    { key: 'grupuri', label: 'Grupuri' },
    { key: 'sectii', label: 'Secții' }
  ];

  constructor(
    private route: ActivatedRoute,
    private nomenclatureService: NomenclatureService,
    private apiCaller: ApiCallerService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.activeTab = params['tab'] || 'tip_echipament';
    });
    this.loadTipuriEchipamente();
    this.loadUtilizatoriPMB();
    this.loadGrupuriMunca();
    this.loadPiese();
    this.loadListePiese();
    this.loadSectii();
    this.loadSefiDeLinie();
    this.loadTipuriInterventie();
    this.loadCategoriiDefect();
    
    // Incarcam datele pentru noile Operatii Mentenanta
    this.loadOperatiiMentenanta();
    this.loadListeOperatii();
  }

  // =========================================================
  // ---- ȘEFI DE LINIE ----
  // =========================================================
  sefiDeLinieOptions: string[] = [];
  loadSefiDeLinie() {
    this.apiCaller.getAllUsers().subscribe({
      next: (response: any[]) => {
        this.sefiDeLinieOptions = (response || [])
          .filter(u => (u.department || '').trim() === 'Producție' && (u.functie || '').trim() === 'Șef de linie')
          .map(u => `${u.firstName || ''} ${u.lastName || ''}`.trim())
          .filter(nume => !!nume)
          .sort((a, b) => a.localeCompare(b));
      },
      error: (err: any) => console.error('Eroare la încărcarea șefilor de linie:', err)
    });
  }

  setTab(tab: string) { this.activeTab = tab; }

  // =========================================================
  // ---- TIP ECHIPAMENT ----
  // =========================================================
  tipuriEchipament: TipEchipament[] = [];
  isLoadingTipEch: boolean = false;
  searchText: string = '';
  sortKey: string = 'denumire';
  sortAsc: boolean = true;
  selectedIndex: number | null = null;
  showForm: boolean = false;
  isEditMode: boolean = false;
  formModel: TipEchipament = this.tipEchipamentGol();
  editingIndex: number | null = null;

  autonomaOptions: string[] = ['NA', 'Zilnic', 'Saptamanal', 'Start fabricatie'];
  periodOptions: { value: string; label: string }[] = [
    { value: 'na', label: 'NA' }, { value: 'lunar', label: 'Lunar' },
    { value: 'la_2_luni', label: 'La 2 luni' }, { value: 'la_3_luni', label: 'La 3 luni' },
    { value: 'la_6_luni', label: 'La 6 luni' }, { value: 'anual', label: 'Anual' }
  ];
  periodOptions1: { value: string; label: string }[] = [
    { value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' },
    { value: '4', label: '4' }, { value: '5', label: '5' }, { value: '6', label: '6' },
    { value: '7', label: '7' }, { value: '8', label: '8' }, { value: '9', label: '9' },
    { value: '10', label: '10' }, { value: '11', label: '11' }, { value: '12', label: '12' }
  ];

  private tipEchipamentGol(): TipEchipament {
    return { cod_line: '', denumire: '', mentenanta_ac: 'NA', mentenanta_prev: 'na', calibrare: 'na', esd: 'NA', electrosecuritate: 'NA', backup: 'na', ssm: 'NA', isqw: 'NA', lista_piese: '', lista_operatii: '', responsabil: '' };
  }

  loadTipuriEchipamente() {
    this.isLoadingTipEch = true;
    this.nomenclatureService.getTipuriEchipament().subscribe({
      next: (data: TipEchipament[]) => { this.tipuriEchipament = data; this.isLoadingTipEch = false; },
      error: (err: any) => { console.error(err); this.isLoadingTipEch = false; }
    });
  }

  get tipuriFiltrate(): TipEchipament[] {
    const term = this.searchText.trim().toLowerCase();
    let lista = !term ? [...this.tipuriEchipament] : this.tipuriEchipament.filter(t => t.denumire.toLowerCase().includes(term));
    lista.sort((a, b) => {
      const va = (a[this.sortKey as keyof TipEchipament] || '').toString().toLowerCase();
      const vb = (b[this.sortKey as keyof TipEchipament] || '').toString().toLowerCase();
      if (va < vb) return this.sortAsc ? -1 : 1;
      if (va > vb) return this.sortAsc ? 1 : -1;
      return 0;
    });
    return lista;
  }

  setSort(key: string) {
    if (this.sortKey === key) { this.sortAsc = !this.sortAsc; } 
    else { this.sortKey = key; this.sortAsc = true; }
  }

  selectRow(index: number) { this.selectedIndex = index; }
  
  openAddForm() { this.isEditMode = false; this.formModel = this.tipEchipamentGol(); this.editingIndex = null; this.showForm = true; }
  openEditForm(item: TipEchipament, index: number) { this.isEditMode = true; this.formModel = { ...item }; this.editingIndex = index; this.showForm = true; }
  closeForm() { this.showForm = false; }

  saveForm() {
    if (!this.formModel.denumire.trim()) return;
    if (this.isEditMode && this.formModel.id) {
      this.nomenclatureService.updateTipEchipament(this.formModel).subscribe(() => { this.loadTipuriEchipamente(); this.closeForm(); });
    } else {
      this.nomenclatureService.createTipEchipament(this.formModel).subscribe(() => { this.loadTipuriEchipamente(); this.closeForm(); });
    }
  }

  deleteItem(item: TipEchipament) {
    if (!confirm('Ștergi acest tip?')) return;
    if (item.id) {
      this.nomenclatureService.deleteTipEchipament(item.id).subscribe(() => { this.loadTipuriEchipamente(); this.selectedIndex = null; });
    }
  }

  getBadgeClass(val: string): string {
    const v = (val || '').toLowerCase();
    if (v === 'na' || v === '') return 'badge-danger';
    return 'badge-success';
  }

  // =========================================================
  // ---- TIP INTERVENTIE ----
  // =========================================================
  tipuriInterventie: TipInterventie[] = [];
  isLoadingInterv: boolean = false;
  searchTextInterv: string = '';
  sortKeyInterv: SortKeyInterv = 'denumire';
  sortAscInterv: boolean = true;
  selectedIndexInterv: number | null = null;
  showFormInterv: boolean = false;
  isEditModeInterv: boolean = false;
  formModelInterv: TipInterventie = { denumire: '' };
  editingIndexInterv: number | null = null;

  loadTipuriInterventie() {
    this.isLoadingInterv = true;
    this.nomenclatureService.getTipuriInterventie().subscribe({
      next: (data: TipInterventie[]) => { this.tipuriInterventie = data; this.isLoadingInterv = false; },
      error: (err: any) => { console.error(err); this.isLoadingInterv = false; }
    });
  }

  get tipuriInterventieFiltrate(): TipInterventie[] {
    const term = this.searchTextInterv.trim().toLowerCase();
    let lista = !term ? [...this.tipuriInterventie] : this.tipuriInterventie.filter(t => t.denumire.toLowerCase().includes(term));
    lista.sort((a, b) => {
      const va = a.denumire.toLowerCase();
      const vb = b.denumire.toLowerCase();
      if (va < vb) return this.sortAscInterv ? -1 : 1;
      if (va > vb) return this.sortAscInterv ? 1 : -1;
      return 0;
    });
    return lista;
  }

  setSortInterv(key: SortKeyInterv) {
    if (this.sortKeyInterv === key) { this.sortAscInterv = !this.sortAscInterv; } 
    else { this.sortKeyInterv = key; this.sortAscInterv = true; }
  }

  selectRowInterv(index: number) { this.selectedIndexInterv = index; }
  openAddFormInterv() { this.isEditModeInterv = false; this.formModelInterv = { denumire: '' }; this.editingIndexInterv = null; this.showFormInterv = true; }
  openEditFormInterv(item: TipInterventie, index: number) { this.isEditModeInterv = true; this.formModelInterv = { ...item }; this.editingIndexInterv = index; this.showFormInterv = true; }
  closeFormInterv() { this.showFormInterv = false; }
  
  saveFormInterv() {
    if (!this.formModelInterv.denumire.trim()) return;
    if (this.isEditModeInterv && this.formModelInterv.id) {
      this.nomenclatureService.updateTipInterventie(this.formModelInterv).subscribe({
        next: () => { this.loadTipuriInterventie(); this.closeFormInterv(); },
        error: (err: any) => alert(err?.error?.detail || 'Eroare.')
      });
    } else {
      this.nomenclatureService.createTipInterventie(this.formModelInterv).subscribe({
        next: () => { this.loadTipuriInterventie(); this.closeFormInterv(); },
        error: (err: any) => alert(err?.error?.detail || 'Eroare.')
      });
    }
  }

  deleteItemInterv(item: TipInterventie, index: number) {
    if (!confirm('Ștergi acest tip?')) return;
    if (!item.id) return;
    this.nomenclatureService.deleteTipInterventie(item.id).subscribe({
      next: () => { this.loadTipuriInterventie(); if (this.selectedIndexInterv === index) this.selectedIndexInterv = null; },
      error: (err: any) => alert(err?.error?.detail || 'Eroare.')
    });
  }
  listeazaInterv() { window.print(); }

  // =========================================================
  // ---- CATEGORIE DEFECT ----
  // =========================================================
  categoriiDefect: CategorieDefect[] = [];
  isLoadingCtg: boolean = false;
  searchTextCtg: string = '';
  sortKeyCtg: SortKeyCtg = 'idCategorie';
  sortAscCtg: boolean = true;
  selectedIndexCtg: number | null = null;
  showFormCtg: boolean = false;
  isEditModeCtg: boolean = false;
  formModelCtg: CategorieDefect = { idCategorie: '', denumire: '' };
  editingIndexCtg: number | null = null;

  loadCategoriiDefect() {
    this.isLoadingCtg = true;
    this.nomenclatureService.getCategoriiDefect().subscribe({
      next: (data: CategorieDefect[]) => { this.categoriiDefect = data; this.isLoadingCtg = false; },
      error: (err: any) => { console.error(err); this.isLoadingCtg = false; }
    });
  }

  get categoriiFiltrate(): CategorieDefect[] {
    const term = this.searchTextCtg.trim().toLowerCase();
    let lista = !term ? [...this.categoriiDefect] : this.categoriiDefect.filter(c => c.idCategorie.toLowerCase().includes(term) || c.denumire.toLowerCase().includes(term));
    lista.sort((a, b) => {
      const va = a[this.sortKeyCtg as 'idCategorie' | 'denumire'].toLowerCase();
      const vb = b[this.sortKeyCtg as 'idCategorie' | 'denumire'].toLowerCase();
      if (va < vb) return this.sortAscCtg ? -1 : 1;
      if (va > vb) return this.sortAscCtg ? 1 : -1;
      return 0;
    });
    return lista;
  }

  setSortCtg(key: SortKeyCtg) {
    if (this.sortKeyCtg === key) { this.sortAscCtg = !this.sortAscCtg; } 
    else { this.sortKeyCtg = key; this.sortAscCtg = true; }
  }

  selectRowCtg(index: number) { this.selectedIndexCtg = index; }
  openAddFormCtg() { this.isEditModeCtg = false; this.formModelCtg = { idCategorie: '', denumire: '' }; this.editingIndexCtg = null; this.showFormCtg = true; }
  openEditFormCtg(item: CategorieDefect, index: number) { this.isEditModeCtg = true; this.formModelCtg = { ...item }; this.editingIndexCtg = index; this.showFormCtg = true; }
  closeFormCtg() { this.showFormCtg = false; }
  
  saveFormCtg() {
    if (!this.formModelCtg.idCategorie.trim() || !this.formModelCtg.denumire.trim()) return;
    if (this.isEditModeCtg && this.formModelCtg.id) {
      this.nomenclatureService.updateCategorieDefect(this.formModelCtg).subscribe({
        next: () => { this.loadCategoriiDefect(); this.closeFormCtg(); },
        error: (err: any) => alert(err?.error?.detail || 'Eroare.')
      });
    } else {
      this.nomenclatureService.createCategorieDefect(this.formModelCtg).subscribe({
        next: () => { this.loadCategoriiDefect(); this.closeFormCtg(); },
        error: (err: any) => alert(err?.error?.detail || 'Eroare.')
      });
    }
  }

  deleteItemCtg(item: CategorieDefect, index: number) {
    if (!confirm('Ștergi categoria?')) return;
    if (!item.id) return;
    this.nomenclatureService.deleteCategorieDefect(item.id).subscribe({
      next: () => { this.loadCategoriiDefect(); if (this.selectedIndexCtg === index) this.selectedIndexCtg = null; },
      error: (err: any) => alert(err?.error?.detail || 'Eroare.')
    });
  }
  listeazaCtg() { window.print(); }

  // =========================================================
  // ---- UTILIZATORI PMB ----
  // =========================================================
  isAdmin: boolean = true;
  utilizatoriPMB: UtilizatorPMB[] = [];
  isLoadingUtilizatori: boolean = false;
  filtruMarca: string = '';
  filtruNume: string = '';
  filtruFunctie: string = '';
  filtruGrup: string = '';
  filtruUser: string = '';
  sortKeyUtil: SortKeyUtil = 'nume';
  sortAscUtil: boolean = true;
  selectedIndexUtil: number | null = null;
  showFormUtil: boolean = false;
  isEditModeUtil: boolean = false;
  formModelUtil: UtilizatorPMB = { marca: '', nume: '', functie: '', grup: '', user: '' };

  loadUtilizatoriPMB() {
    this.isLoadingUtilizatori = true;
    this.nomenclatureService.getUtilizatoriPMB().subscribe({
      next: (data: UtilizatorPMB[]) => { this.utilizatoriPMB = data; this.isLoadingUtilizatori = false; },
      error: (err: any) => { console.error(err); this.isLoadingUtilizatori = false; }
    });
  }

  get utilizatoriFiltrati(): UtilizatorPMB[] {
    const marca = this.filtruMarca.trim().toLowerCase();
    const nume = this.filtruNume.trim().toLowerCase();
    const functie = this.filtruFunctie.trim().toLowerCase();
    const grup = this.filtruGrup.trim().toLowerCase();
    const user = this.filtruUser.trim().toLowerCase();

    let lista = this.utilizatoriPMB.filter(u => {
      if (marca && !u.marca.toLowerCase().includes(marca)) return false;
      if (nume && !u.nume.toLowerCase().includes(nume)) return false;
      if (functie && !u.functie.toLowerCase().includes(functie)) return false;
      if (grup && !(u.grup || '').toLowerCase().includes(grup)) return false;
      if (user && !u.user.toLowerCase().includes(user)) return false;
      return true;
    });

    lista.sort((a, b) => {
      let va: any = a[this.sortKeyUtil]; let vb: any = b[this.sortKeyUtil];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return this.sortAscUtil ? -1 : 1;
      if (va > vb) return this.sortAscUtil ? 1 : -1;
      return 0;
    });
    return lista;
  }

  setSortUtil(key: SortKeyUtil) {
    if (this.sortKeyUtil === key) { this.sortAscUtil = !this.sortAscUtil; } 
    else { this.sortKeyUtil = key; this.sortAscUtil = true; }
  }

  selectRowUtil(index: number) { this.selectedIndexUtil = index; }
  openAddFormUtil() { if (!this.isAdmin) return; this.isEditModeUtil = false; this.formModelUtil = { marca: '', nume: '', functie: '', grup: '', user: '' }; this.showFormUtil = true; }
  openEditFormUtil(item: UtilizatorPMB, index: number) { this.isEditModeUtil = true; this.formModelUtil = { ...item }; this.selectedIndexUtil = index; this.showFormUtil = true; }
  closeFormUtil() { this.showFormUtil = false; }

  saveFormUtil() {
    if (!this.formModelUtil.nume.trim() || !this.formModelUtil.user.trim()) return;
    const onDone = () => { this.loadUtilizatoriPMB(); this.loadGrupuriMunca(); this.closeFormUtil(); };
    const onError = (err: any) => { console.error(err); alert('Eroare la salvare.'); };

    if (this.isEditModeUtil && this.formModelUtil.id) {
      this.nomenclatureService.updateUtilizatorPMB(this.formModelUtil).subscribe({ next: onDone, error: onError });
    } else {
      if (!this.isAdmin) return;
      this.nomenclatureService.createUtilizatorPMB(this.formModelUtil).subscribe({ next: onDone, error: onError });
    }
  }

  deleteUtilizator(item: UtilizatorPMB) {
    if (!this.isAdmin || !item.id) return;
    if (!confirm('Sigur ștergi acest utilizator?')) return;
    this.nomenclatureService.deleteUtilizatorPMB(item.id).subscribe({
      next: () => { this.loadUtilizatoriPMB(); this.loadGrupuriMunca(); },
      error: (err: any) => { console.error(err); alert('Eroare la ștergere.'); }
    });
  }

  // =========================================================
  // ---- GRUPURI MUNCA ----
  // =========================================================
  searchTextGrup: string = '';
  filterDepartament: string = ''; 
  sortKeyGrup: SortKeyGrup = 'grup';
  sortAscGrup: boolean = true;
  isLoadingGrupuri: boolean = false;
  grupuriMuncaData: GrupMunca[] = [];
  showFormGrupNou: boolean = false;
  isSavingGrupNou: boolean = false;
  formModelGrupNou: { nume: string, departament: string } = { nume: '', departament: '' };

  loadGrupuriMunca() {
    this.isLoadingGrupuri = true;
    this.nomenclatureService.getGrupuriMunca().subscribe({
      next: (data: GrupMunca[]) => { this.grupuriMuncaData = data; this.isLoadingGrupuri = false; },
      error: (err: any) => { console.error(err); this.isLoadingGrupuri = false; }
    });
  }

  get grupuriFiltrate(): GrupMunca[] {
    const term = this.searchTextGrup.trim().toLowerCase();
    const dep = this.filterDepartament;
    
    let lista = this.grupuriMuncaData.filter((g: any) => {
      const matchText = !term || g.grup.toLowerCase().includes(term) || (g.membri && g.membri.join(', ').toLowerCase().includes(term));
      const matchDep = !dep || g.departament === dep;
      return matchText && matchDep;
    });

    lista.sort((a: any, b: any) => {
      let va = ''; let vb = '';
      if (this.sortKeyGrup === 'membri') {
        va = (a.membri || []).join(', ').toLowerCase();
        vb = (b.membri || []).join(', ').toLowerCase();
      } else if (this.sortKeyGrup === 'departament') {
        va = (a.departament || '').toLowerCase();
        vb = (b.departament || '').toLowerCase();
      } else {
        va = (a.grup || '').toLowerCase();
        vb = (b.grup || '').toLowerCase();
      }
      if (va < vb) return this.sortAscGrup ? -1 : 1;
      if (va > vb) return this.sortAscGrup ? 1 : -1;
      return 0;
    });
    return lista;
  }

  setSortGrup(key: SortKeyGrup) {
    if (this.sortKeyGrup === key) { this.sortAscGrup = !this.sortAscGrup; }
    else { this.sortKeyGrup = key; this.sortAscGrup = true; }
  }

  filtreazaGrupuri(): void {}

  openAddFormGrupNou() { this.formModelGrupNou = { nume: '', departament: '' }; this.showFormGrupNou = true; }
  closeFormGrupNou() { this.showFormGrupNou = false; }

  saveFormGrupNou() {
    const nume = this.formModelGrupNou.nume.trim();
    if (!nume) return;
    this.isSavingGrupNou = true;
    
    this.nomenclatureService.createGrupMunca(this.formModelGrupNou as any).subscribe({
      next: () => { this.isSavingGrupNou = false; this.closeFormGrupNou(); this.loadGrupuriMunca(); },
      error: (err: any) => {
        this.isSavingGrupNou = false;
        if (err?.status === 409) { alert('Există deja un grup cu acest nume.'); } 
        else { console.error(err); alert('Eroare la adăugarea grupului.'); }
      }
    });
  }

  get numeGrupuriDisponibile(): string[] {
    const nume = this.grupuriMuncaData.map(g => g.grup);
    const grupCurent = this.formModelUtil?.grup?.trim();
    if (grupCurent && !nume.some(n => n.toLowerCase() === grupCurent.toLowerCase())) { nume.push(grupCurent); }
    return nume.sort((a, b) => a.localeCompare(b));
  }

  get grupuriInterventieOptions(): string[] {
    const nume = this.grupuriMuncaData.map(g => g.grup);
    const responsabilCurent = this.formModel?.responsabil?.trim();
    if (responsabilCurent && !nume.some(n => n.toLowerCase() === responsabilCurent.toLowerCase())) { nume.push(responsabilCurent); }
    return nume.sort((a, b) => a.localeCompare(b));
  }
  listeazaGrup() { window.print(); }

  // =========================================================
  // ---- PIESE ----
  // =========================================================
  listePiese: ListaPiese[] = [];
  isLoadingListePiese: boolean = false;
  umOptions: string[] = ['m', 'l', 'kg', 'buc'];
  magazieOptions: string[] = ['Centrala', 'PMB', 'CBT', 'Sectie', 'SMT'];
  frecventaOptions: string[] = ['foarte rar', 'rar', 'mediu', 'des', 'foarte des'];
  toatePiesele: Piesa[] = [];
  isLoadingPiese: boolean = false;
  listaSelectataPiese: ListaPiese | null = null;
  selectedLista: ListaPiese | null = null;
  selectedLeftPieceIndex: number | null = null;
  selectedRightPieceIndex: number | null = null;
  filtruListaNr: string = '';
  filtruListaDenumire: string = '';
  conditieAprovOptions: string[] = ['Nu comanda', 'Avertisment', 'Comanda'];
  filtruPiesaId: string = '';
  filtruPiesaDenumire: string = '';
  filtruPiesaCodSap: string = '';
  filtruPiesaPozRaft: string = '';
  filtruPiesaPartNr: string = '';
  filtruPiesaStoc: string = '';
  filtruPiesaConditie: string = '';
  showFormLista: boolean = false;
  isEditModeLista: boolean = false;
  editingRefLista: ListaPiese | null = null;
  formModelLista: any = { nrLista: '', denumire: '', pieseIds: [] };
  showFormPiesa: boolean = false;
  isEditModePiesa: boolean = false;
  formModelPiesa: any = this.piesaGoala();

  get listaPieseOptions(): string[] {
    const liste = this.listePiese.map(l => l.denumire);
    const curent = this.formModel?.lista_piese?.trim();
    if (curent && !liste.some(l => l.toLowerCase() === curent.toLowerCase())) { liste.push(curent); }
    return liste.sort((a, b) => a.localeCompare(b));
  }

  piesaGoala(): Piesa {
    return {
      id: 0, denumire: '', codSap: '', pretRon: '', um: '', magazie: '',
      pozitieRaft: '', stocMinim: '', stocCurent: '', frecventa: '', producator: '', 
      partNumber: '', moq: '', utilizare: '', dublura: '',
      excludeDublate: false, excludeIesiteDinFabricatie: false,
      furnizor: '', refFurnizor: '', furnizor1: '', refFurn1: '', furnizor2: '', refFurn2: ''
    };
  }

  loadPiese() {
    this.isLoadingPiese = true;
    this.nomenclatureService.getPiese().subscribe({
      next: (data: Piesa[]) => { this.toatePiesele = data; this.isLoadingPiese = false; },
      error: (err: any) => { console.error(err); this.isLoadingPiese = false; }
    });
  }

  loadListePiese() {
    this.isLoadingListePiese = true;
    this.nomenclatureService.getListePiese().subscribe({
      next: (data: ListaPiese[]) => {
        this.listePiese = data;
        this.isLoadingListePiese = false;
        if (this.listaSelectataPiese) {
          const proaspata = this.listePiese.find(l => l.id === this.listaSelectataPiese!.id);
          this.listaSelectataPiese = proaspata || null;
        }
      },
      error: (err: any) => { console.error(err); this.isLoadingListePiese = false; }
    });
  }

  get listePieseFiltrate(): ListaPiese[] {
    const nr = this.filtruListaNr.trim().toLowerCase();
    const den = this.filtruListaDenumire.trim().toLowerCase();
    return this.listePiese.filter(l =>
      (!nr || l.nrLista.toLowerCase().includes(nr)) &&
      (!den || l.denumire.toLowerCase().includes(den))
    );
  }

  get pieseDisponibileFiltrate(): Piesa[] {
    const id = this.filtruPiesaId.trim().toLowerCase();
    const den = this.filtruPiesaDenumire.trim().toLowerCase();
    const cod = this.filtruPiesaCodSap.trim().toLowerCase();
    const poz = this.filtruPiesaPozRaft.trim().toLowerCase();
    const part = this.filtruPiesaPartNr.trim().toLowerCase();
    const stoc = this.filtruPiesaStoc.trim().toLowerCase();
    const cond = this.filtruPiesaConditie;

    return this.pieseDisponibile.filter((p: any) => {
      if (id && !String(p.id).toLowerCase().includes(id)) return false;
      if (den && !p.denumire.toLowerCase().includes(den)) return false;
      if (cod && !p.codSap.toLowerCase().includes(cod)) return false;
      if (poz && !p.pozitieRaft.toLowerCase().includes(poz)) return false;
      if (part && !p.partNumber.toLowerCase().includes(part)) return false;
      if (stoc && !String(p.stocCurent).toLowerCase().includes(stoc)) return false;
      if (cond && this.conditieAprovizionare(p).label !== cond) return false;
      return true;
    });
  }

  get pieseInLista(): Piesa[] {
    if (!this.listaSelectataPiese) return [];
    return this.toatePiesele.filter(p => this.listaSelectataPiese!.pieseIds.includes(p.id));
  }

  get pieseDisponibile(): Piesa[] {
    if (!this.listaSelectataPiese) return this.toatePiesele;
    return this.toatePiesele.filter(p => !this.listaSelectataPiese!.pieseIds.includes(p.id));
  }

  conditieAprovizionare(p: Piesa): { label: string; cls: string } {
    const curent = Number(p.stocCurent); const minim = Number(p.stocMinim);
    if (isNaN(curent) || isNaN(minim)) return { label: '—', cls: '' };
    const diff = curent - minim;
    if (diff >= 2) return { label: 'Nu comanda', cls: 'badge-aprov-verde' };
    if (diff === 1) return { label: 'Avertisment', cls: 'badge-aprov-albastru' };
    return { label: 'Comanda', cls: 'badge-aprov-rosu' };
  }

  selectLista(item: ListaPiese) { this.selectedLista = item; }
  openAddFormLista() { this.isEditModeLista = false; this.editingRefLista = null; this.formModelLista = { nrLista: '', denumire: '', pieseIds: [] }; this.showFormLista = true; }
  openEditFormLista(item: ListaPiese) { this.isEditModeLista = true; this.editingRefLista = item; this.formModelLista = { ...item }; this.showFormLista = true; }
  closeFormLista() { this.showFormLista = false; }

  saveFormLista() {
    if (!this.formModelLista.denumire.trim()) return;
    const onDone = () => { this.loadListePiese(); this.closeFormLista(); };
    if (this.isEditModeLista && this.editingRefLista && this.editingRefLista.id) {
      this.nomenclatureService.updateListaPiese({ ...this.formModelLista, id: this.editingRefLista.id }).subscribe({ next: onDone });
    } else {
      this.nomenclatureService.createListaPiese(this.formModelLista).subscribe({ next: onDone });
    }
  }

  deleteLista() {
    if (!this.selectedLista || !this.selectedLista.id) return;
    if (!confirm('Sigur ștergi această listă?')) return;
    this.nomenclatureService.deleteListaPiese(this.selectedLista.id).subscribe({
      next: () => { this.selectedLista = null; this.loadListePiese(); }
    });
  }

  deschideLista(item: ListaPiese) { this.listaSelectataPiese = item; this.selectedLeftPieceIndex = null; this.selectedRightPieceIndex = null; }
  inapoiLaListe() { this.listaSelectataPiese = null; this.selectedLista = null; this.selectedLeftPieceIndex = null; this.selectedRightPieceIndex = null; }
  selectPiesaStanga(index: number) { this.selectedLeftPieceIndex = index; this.selectedRightPieceIndex = null; }
  selectPiesaDreapta(index: number) { this.selectedRightPieceIndex = index; this.selectedLeftPieceIndex = null; }

  mutaInLista() {
    if (!this.listaSelectataPiese || !this.listaSelectataPiese.id || this.selectedRightPieceIndex === null) return;
    const piesa = this.pieseDisponibile[this.selectedRightPieceIndex];
    if (!piesa) return;
    this.nomenclatureService.adaugaPiesaInLista(this.listaSelectataPiese.id, piesa.id).subscribe({
      next: () => { this.selectedRightPieceIndex = null; this.loadListePiese(); }
    });
  }

  scoateDinLista() {
    if (!this.listaSelectataPiese || !this.listaSelectataPiese.id || this.selectedLeftPieceIndex === null) return;
    const piesa = this.pieseInLista[this.selectedLeftPieceIndex];
    if (!piesa) return;
    this.nomenclatureService.scoatePiesaDinLista(this.listaSelectataPiese.id, piesa.id).subscribe({
      next: () => { this.selectedLeftPieceIndex = null; this.loadListePiese(); }
    });
  }

  openAddFormPiesa() { this.isEditModePiesa = false; this.formModelPiesa = this.piesaGoala(); this.showFormPiesa = true; }
  openEditFormPiesa(item: Piesa) { this.isEditModePiesa = true; this.formModelPiesa = { ...item }; this.showFormPiesa = true; }
  closeFormPiesa() { this.showFormPiesa = false; }

  saveFormPiesa() {
    if (!this.formModelPiesa.denumire.trim()) return;
    const onDone = () => { this.loadPiese(); this.loadListePiese(); this.closeFormPiesa(); };
    if (this.isEditModePiesa && this.formModelPiesa.id) {
      this.nomenclatureService.updatePiesa(this.formModelPiesa).subscribe({ next: onDone });
    } else {
      this.nomenclatureService.createPiesa(this.formModelPiesa).subscribe({ next: onDone });
    }
  }

  deleteSelectedPiesa() {
    if (this.selectedRightPieceIndex === null) return;
    const piesa = this.pieseDisponibileFiltrate[this.selectedRightPieceIndex];
    if (!piesa) return;
    if (!confirm('Sigur ștergi această înregistrare?')) return;
    this.nomenclatureService.deletePiesa(piesa.id).subscribe({
      next: () => { this.selectedRightPieceIndex = null; this.loadPiese(); this.loadListePiese(); }
    });
  }

  sortKeyPiese: SortKeyPiese = 'denumire';
  sortAscPiese: boolean = true;
  setSortPiese(key: SortKeyPiese) {
    if (this.sortKeyPiese === key) { this.sortAscPiese = !this.sortAscPiese; } 
    else { this.sortKeyPiese = key; this.sortAscPiese = true; }
    this.pieseDisponibile.sort((a: any, b: any) => {
      const valA = a[key] ?? ''; const valB = b[key] ?? '';
      const numA = Number(valA); const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') { return this.sortAscPiese ? numA - numB : numB - numA; }
      const strA = String(valA).toLowerCase(); const strB = String(valB).toLowerCase();
      if (strA < strB) return this.sortAscPiese ? -1 : 1;
      if (strA > strB) return this.sortAscPiese ? 1 : -1;
      return 0;
    });
  }

  sortKeyListe: 'nrLista' | 'denumire' | '' = 'nrLista';
  sortAscListe: boolean = true;
  setSortListe(key: 'nrLista' | 'denumire') {
    if (this.sortKeyListe === key) { this.sortAscListe = !this.sortAscListe; } 
    else { this.sortKeyListe = key; this.sortAscListe = true; }
    this.listePiese.sort((a: any, b: any) => {
      const valA = a[key] ?? ''; const valB = b[key] ?? '';
      const numA = Number(valA); const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') { return this.sortAscListe ? numA - numB : numB - numA; }
      const strA = String(valA).toLowerCase(); const strB = String(valB).toLowerCase();
      if (strA < strB) return this.sortAscListe ? -1 : 1;
      if (strA > strB) return this.sortAscListe ? 1 : -1;
      return 0;
    });
  }

  // =========================================================
  // ---- OPERATII MENTENANTA (TABUL NOU COMPLET DECUPLAT) ----
  // =========================================================
  listeOperatii: ListaOperatii[] = [];
  toateOperatiile: OperatieMentenanta[] = [];
  listaSelectataOp: ListaOperatii | null = null;
  selectedListaOp: ListaOperatii | null = null;
  selectedLeftOpIndex: number | null = null;
  selectedRightOpIndex: number | null = null;
  filtruListaOpDenumire: string = '';
  filtruOpDenumire: string = '';
  showFormListaOp: boolean = false;
  isEditModeListaOp: boolean = false;
  editingRefListaOp: ListaOperatii | null = null;
  formModelListaOp: any = { denumire: '', timp: '', operatiiIds: [] };
  showFormOp: boolean = false;
  isEditModeOp: boolean = false;
  formModelOp: any = { denumire: '', instructiune: '', sculeSpeciale: '', prioritate: 'Medie', autonoma: false, preventiva: false };
  prioritateOpOptions: string[] = ['Scăzută', 'Medie', 'Ridicată'];

  get listaOperatiiOptions(): string[] {
    const liste = this.listeOperatii.map(l => l.denumire);
    const curent = this.formModel?.lista_operatii?.trim();
    if (curent && !liste.some(l => l.toLowerCase() === curent.toLowerCase())) { liste.push(curent); }
    return liste.sort((a, b) => a.localeCompare(b));
  }

  loadOperatiiMentenanta() {
    this.nomenclatureService.getOperatiiMentenanta().subscribe(data => this.toateOperatiile = data);
  }
  
  loadListeOperatii() {
    this.nomenclatureService.getListeOperatii().subscribe(data => {
      this.listeOperatii = data;
      if (this.listaSelectataOp) {
        this.listaSelectataOp = this.listeOperatii.find(l => l.id === this.listaSelectataOp!.id) || null;
      }
    });
  }

  get listeOpFiltrate(): ListaOperatii[] {
    const den = this.filtruListaOpDenumire.toLowerCase();
    return this.listeOperatii.filter(l => !den || l.denumire.toLowerCase().includes(den));
  }

  get opInLista(): OperatieMentenanta[] {
    if (!this.listaSelectataOp) return [];
    return this.toateOperatiile.filter(o => this.listaSelectataOp!.operatiiIds.includes(o.id!));
  }

  get opDisponibileFiltrate(): OperatieMentenanta[] {
    const den = this.filtruOpDenumire.toLowerCase();
    const disponibile = this.listaSelectataOp 
      ? this.toateOperatiile.filter(o => !this.listaSelectataOp!.operatiiIds.includes(o.id!))
      : this.toateOperatiile;
    return disponibile.filter(o => !den || o.denumire.toLowerCase().includes(den));
  }

  openAddFormListaOp() { this.isEditModeListaOp = false; this.editingRefListaOp = null; this.formModelListaOp = { denumire: '', timp: '', operatiiIds: [] }; this.showFormListaOp = true; }
  openEditFormListaOp(item: ListaOperatii) { this.isEditModeListaOp = true; this.editingRefListaOp = item; this.formModelListaOp = { ...item }; this.showFormListaOp = true; }
  closeFormListaOp() { this.showFormListaOp = false; }
  
  saveFormListaOp() {
    if (this.isEditModeListaOp && this.editingRefListaOp) {
      this.nomenclatureService.updateListaOperatii(this.formModelListaOp).subscribe(() => { this.loadListeOperatii(); this.closeFormListaOp(); });
    } else {
      this.nomenclatureService.createListaOperatii(this.formModelListaOp).subscribe(() => { this.loadListeOperatii(); this.closeFormListaOp(); });
    }
  }
  
  deleteListaOp() {
    if (!this.selectedListaOp || !this.selectedListaOp.id) return;
    if (confirm('Sigur ștergi lista de operații?')) {
      this.nomenclatureService.deleteListaOperatii(this.selectedListaOp.id).subscribe(() => { this.selectedListaOp = null; this.loadListeOperatii(); });
    }
  }

  openAddFormOp() { this.isEditModeOp = false; this.formModelOp = { denumire: '', instructiune: '', sculeSpeciale: '', prioritate: 'Medie', autonoma: false, preventiva: false }; this.showFormOp = true; }
  openEditFormOp(item: OperatieMentenanta) { this.isEditModeOp = true; this.formModelOp = { ...item }; this.showFormOp = true; }
  closeFormOp() { this.showFormOp = false; }

  saveFormOp() {
    if (this.isEditModeOp && this.formModelOp.id) {
      this.nomenclatureService.updateOperatieMentenanta(this.formModelOp).subscribe(() => { this.loadOperatiiMentenanta(); this.loadListeOperatii(); this.closeFormOp(); });
    } else {
      this.nomenclatureService.createOperatieMentenanta(this.formModelOp).subscribe(() => { this.loadOperatiiMentenanta(); this.loadListeOperatii(); this.closeFormOp(); });
    }
  }

  deleteSelectedOp() {
    if (this.selectedRightOpIndex === null) return;
    if (confirm('Sigur ștergi operația?')) {
      const op = this.opDisponibileFiltrate[this.selectedRightOpIndex];
      if (op.id) {
        this.nomenclatureService.deleteOperatieMentenanta(op.id).subscribe(() => { this.selectedRightOpIndex = null; this.loadOperatiiMentenanta(); this.loadListeOperatii(); });
      }
    }
  }

  deschideListaOp(item: ListaOperatii) { this.listaSelectataOp = item; this.selectedLeftOpIndex = null; this.selectedRightOpIndex = null; }
  inapoiLaListeOp() { this.listaSelectataOp = null; this.selectedListaOp = null; this.selectedLeftOpIndex = null; this.selectedRightOpIndex = null; }
  
  mutaInListaOp() {
    if (!this.listaSelectataOp || !this.listaSelectataOp.id || this.selectedRightOpIndex === null) return;
    const op = this.opDisponibileFiltrate[this.selectedRightOpIndex];
    if (op && op.id) {
      this.nomenclatureService.adaugaOpInLista(this.listaSelectataOp.id, op.id).subscribe(() => { this.selectedRightOpIndex = null; this.loadListeOperatii(); });
    }
  }

  scoateDinListaOp() {
    if (!this.listaSelectataOp || !this.listaSelectataOp.id || this.selectedLeftOpIndex === null) return;
    const op = this.opInLista[this.selectedLeftOpIndex];
    if (op && op.id) {
      this.nomenclatureService.scoateOpDinLista(this.listaSelectataOp.id, op.id).subscribe(() => { this.selectedLeftOpIndex = null; this.loadListeOperatii(); });
    }
  }

  // =========================================================
  // ---- SECȚII ----
  // =========================================================
  sectii: Sectie[] = [];
  isLoadingSectii: boolean = false;
  searchTextSectii: string = '';
  sortKeySectii: string = 'sectie';
  sortAscSectii: boolean = true;
  selectedIndexSectii: number | null = null;
  showFormSectie: boolean = false;
  isEditModeSectie: boolean = false;
  formModelSectie: Sectie = this.sectieGoala();
  editingIndexSectie: number | null = null;

  private sectieGoala(): Sectie {
    return { sectie: '', sectieMiniBde: '', linia: '', liniaMiniBde: '', sefSectie: '', sefLinie1: '', sefLinie2: '', electrosecuritateLuna: 'na', electrosecuritateResponsabil: '', esdLuna: 'na', esdResponsabil: '' };
  }

  loadSectii() {
    this.isLoadingSectii = true;
    this.nomenclatureService.getSectii().subscribe({
      next: (data: Sectie[]) => { this.sectii = data; this.isLoadingSectii = false; },
      error: (err: any) => { console.error(err); this.isLoadingSectii = false; }
    });
  }

  get sectiiFiltrate(): Sectie[] {
    const term = this.searchTextSectii.trim().toLowerCase();
    let lista = !term ? [...this.sectii] : this.sectii.filter(s => 
      s.sectie.toLowerCase().includes(term) || 
      (s.sectieMiniBde && s.sectieMiniBde.toLowerCase().includes(term)) || 
      s.linia.toLowerCase().includes(term) || 
      s.sefSectie.toLowerCase().includes(term)
    );
    lista.sort((a: any, b: any) => {
      const va = (a[this.sortKeySectii] || '').toString().toLowerCase();
      const vb = (b[this.sortKeySectii] || '').toString().toLowerCase();
      if (va < vb) return this.sortAscSectii ? -1 : 1;
      if (va > vb) return this.sortAscSectii ? 1 : -1;
      return 0;
    });
    return lista;
  }

  setSortSectii(key: string) {
    if (this.sortKeySectii === key) { this.sortAscSectii = !this.sortAscSectii; } 
    else { this.sortKeySectii = key; this.sortAscSectii = true; }
  }

  selectRowSectii(index: number) { this.selectedIndexSectii = index; }
  openAddFormSectie() { this.isEditModeSectie = false; this.formModelSectie = this.sectieGoala(); this.editingIndexSectie = null; this.showFormSectie = true; }
  openEditFormSectie(item: Sectie, index: number) { this.isEditModeSectie = true; this.formModelSectie = { ...item }; this.editingIndexSectie = index; this.showFormSectie = true; this.updateResponsabiliDinSefi(); }
  
  updateResponsabiliDinSefi(): void {
    const combinat = [this.formModelSectie.sefLinie1, this.formModelSectie.sefLinie2]
      .filter(sef => !!sef && sef.trim() !== '')
      .join(', ');
    this.formModelSectie.esdResponsabil = combinat;
  }

  get electricieniOptions(): string[] {
    const grup = this.grupuriMuncaData.find(g => (g.grup || '').trim().toLowerCase() === 'electric');
    return grup ? [...(grup.membri || [])].sort((a, b) => a.localeCompare(b)) : [];
  }

  closeFormSectie() { this.showFormSectie = false; }
  saveFormSectie() {
    if (!this.formModelSectie.sectie.trim()) { alert('Completează câmpul "Secția" înainte de a salva.'); return; }
    const onDone = () => { this.loadSectii(); this.closeFormSectie(); };
    if (this.isEditModeSectie && this.formModelSectie.id) {
      this.nomenclatureService.updateSectie(this.formModelSectie).subscribe({ next: onDone });
    } else {
      this.nomenclatureService.createSectie(this.formModelSectie).subscribe({ next: onDone });
    }
  }

  deleteItemSectie(item: Sectie) {
    if (!confirm('Ștergi această secție?')) return;
    if (item.id) {
      this.nomenclatureService.deleteSectie(Number(item.id)).subscribe(() => { this.loadSectii(); this.selectedIndexSectii = null; });
    }
  }
  listeazaSectii() { window.print(); }
}