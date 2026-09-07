import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NomenclatureService, UtilizatorPMB, NivelAcces, GrupMunca, Piesa, ListaPiese, TipEchipament } from '../services/nomenclature.service';

type SortKey = 'nr' | 'denumire';

export interface TipInterventie {
  denumire: string;
}

type SortKeyInterv = 'nr' | 'denumire';

export interface CategorieDefect {
  idCategorie: string;
  denumire: string;
}

type SortKeyCtg = 'nr' | 'idCategorie' | 'denumire';

type SortKeyUtil = 'marca' | 'nume' | 'functie' | 'grup' | 'user' | 'nivelAcces' | 'activ' | 'dataActiv';

export interface OperatieLogistica {
  cod: string;
  denumireRO: string;
  denumireDE: string;
}

type SortKeyOp = 'nr' | 'cod' | 'denumireRO' | 'denumireDE';

type SortKeyGrup = 'nr' | 'grup' | 'membri';

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
    { key: 'utilizatori_pmb', label: 'Utilizatori PMB' },
    { key: 'tip_interventie', label: 'Tip Intervenție' },
    { key: 'categorie_defect', label: 'Categorie Defect' },
    { key: 'piese_schimb', label: 'Piese' },
    { key: 'operatii', label: 'Operații' },
    { key: 'grupuri', label: 'Grupuri' }
  ];

  constructor(
    private route: ActivatedRoute,
    private nomenclatureService: NomenclatureService
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
  }

  setTab(tab: string) {
    this.activeTab = tab;
  }

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
    { value: 'na', label: 'NA' },
    { value: 'lunar', label: 'Lunar' },
    { value: 'la_2_luni', label: 'La 2 luni' },
    { value: 'la_3_luni', label: 'La 3 luni' },
    { value: 'la_6_luni', label: 'La 6 luni' },
    { value: 'anual', label: 'Anual' }
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
  
  openAddForm() {
    this.isEditMode = false;
    this.formModel = this.tipEchipamentGol();
    this.editingIndex = null;
    this.showForm = true;
  }

  openEditForm(item: TipEchipament, index: number) {
    this.isEditMode = true;
    this.formModel = { ...item };
    this.editingIndex = index;
    this.showForm = true;
  }

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

  tipuriInterventie: TipInterventie[] = [
    { denumire: 'Accidentala' }, { denumire: 'AEM' }, { denumire: 'Ajustare parametrii' },
    { denumire: 'Backup' }, { denumire: 'Cladiri' }, { denumire: 'Curatare_echip' },
    { denumire: 'Electric' }, { denumire: 'Electrosecuritate' }, { denumire: 'ESD' },
    { denumire: 'Imbunatatire' }, { denumire: 'Instalare Echipament' }, { denumire: 'Masuratoare' },
    { denumire: 'Pneumatic' }, { denumire: 'Pornire_fabricatie' }, { denumire: 'Predictiva' },
    { denumire: 'Prelucrare mecanica repere' }, { denumire: 'Preventiva' }, { denumire: 'Produs_nou' },
    { denumire: 'Reglaj echipament' }, { denumire: 'Reglaj stanta' }, { denumire: 'Schimb_echip' },
    { denumire: 'Schimb_produs' }, { denumire: 'Schimb_recipient' }, { denumire: 'Schimb_stanta' },
  ];

  searchTextInterv: string = '';
  sortKeyInterv: SortKeyInterv = 'denumire';
  sortAscInterv: boolean = true;
  selectedIndexInterv: number | null = null;
  showFormInterv: boolean = false;
  isEditModeInterv: boolean = false;
  formModelInterv: TipInterventie = { denumire: '' };
  editingIndexInterv: number | null = null;

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
    if (this.isEditModeInterv && this.editingIndexInterv !== null) { this.tipuriInterventie[this.editingIndexInterv] = { ...this.formModelInterv }; } 
    else { this.tipuriInterventie.push({ ...this.formModelInterv }); }
    this.closeFormInterv();
  }

  deleteItemInterv(index: number) { this.tipuriInterventie.splice(index, 1); if (this.selectedIndexInterv === index) this.selectedIndexInterv = null; }
  listeazaInterv() { window.print(); }
  salveazaInterv() { console.log('Salvare tipuri intervenție:', this.tipuriInterventie); }

  // =========================================================
  // ---- PMB CATEGORII (Categorie Defect) ----
  // =========================================================

  categoriiDefect: CategorieDefect[] = [
    { idCategorie: '001', denumire: 'Defect electronic' }, { idCategorie: '002', denumire: 'Defect mecanic' },
    { idCategorie: '003', denumire: 'Defect electric' }, { idCategorie: '004', denumire: 'Defect de produs' },
    { idCategorie: '005', denumire: 'Eroare operator' }, { idCategorie: '006', denumire: 'Calibrare echipament' },
    { idCategorie: '007', denumire: 'Mentenanta preventiva' }, { idCategorie: '008', denumire: 'Defect software' },
    { idCategorie: '009', denumire: 'Alte defecte' }, { idCategorie: '010', denumire: 'Schimbare echipament' },
    { idCategorie: '011', denumire: 'Implementare produs nou' }, { idCategorie: '012', denumire: 'Imbunatatire' },
    { idCategorie: '013', denumire: 'Prelucrare mecanica reper' }, { idCategorie: '014', denumire: 'Produs nou' },
    { idCategorie: '015', denumire: 'Backup' },
  ];

  searchTextCtg: string = '';
  sortKeyCtg: SortKeyCtg = 'idCategorie';
  sortAscCtg: boolean = true;
  selectedIndexCtg: number | null = null;
  showFormCtg: boolean = false;
  isEditModeCtg: boolean = false;
  formModelCtg: CategorieDefect = { idCategorie: '', denumire: '' };
  editingIndexCtg: number | null = null;

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
    if (this.isEditModeCtg && this.editingIndexCtg !== null) { this.categoriiDefect[this.editingIndexCtg] = { ...this.formModelCtg }; } 
    else { this.categoriiDefect.push({ ...this.formModelCtg }); }
    this.closeFormCtg();
  }

  deleteItemCtg(index: number) { this.categoriiDefect.splice(index, 1); if (this.selectedIndexCtg === index) this.selectedIndexCtg = null; }
  listeazaCtg() { window.print(); }
  salveazaCtg() { console.log('Salvare categorii defect:', this.categoriiDefect); }

  // =========================================================
  // ---- UTILIZATORI PMB (conectat la backend) ----
  // =========================================================

  isAdmin: boolean = true;
  utilizatoriPMB: UtilizatorPMB[] = [];
  isLoadingUtilizatori: boolean = false;

  filtruMarca: string = '';
  filtruNume: string = '';
  filtruFunctie: string = '';
  filtruGrup: string = '';
  filtruUser: string = '';
  filtruAccesPmb: boolean = false;
  arataInactivi: boolean = false;

  sortKeyUtil: SortKeyUtil = 'nume';
  sortAscUtil: boolean = true;
  selectedIndexUtil: number | null = null;
  showFormUtil: boolean = false;
  isEditModeUtil: boolean = false;
  formModelUtil: UtilizatorPMB = this.utilizatorGol();
  nivelAccesOptions: NivelAcces[] = ['Admin', 'Editare', 'Vizualizare'];

  private utilizatorGol(): UtilizatorPMB {
    return {
      marca: '', nume: '', functie: '', grup: '', acces: true,
      user: '', nivelAcces: 'Vizualizare', activ: true,
      dataActiv: new Date().toISOString().slice(0, 10)
    };
  }

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
      if (!this.arataInactivi && !u.activ) return false;
      if (marca && !u.marca.toLowerCase().includes(marca)) return false;
      if (nume && !u.nume.toLowerCase().includes(nume)) return false;
      if (functie && !u.functie.toLowerCase().includes(functie)) return false;
      if (grup && !(u.grup || '').toLowerCase().includes(grup)) return false;
      if (user && !u.user.toLowerCase().includes(user)) return false;
      if (this.filtruAccesPmb && !u.acces) return false;
      return true;
    });

    lista.sort((a, b) => {
      let va: any = this.sortKeyUtil === 'acces' as any || this.sortKeyUtil === 'activ' ? (a[this.sortKeyUtil] ? 1 : 0) : a[this.sortKeyUtil];
      let vb: any = this.sortKeyUtil === 'acces' as any || this.sortKeyUtil === 'activ' ? (b[this.sortKeyUtil] ? 1 : 0) : b[this.sortKeyUtil];
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
  openAddFormUtil() { if (!this.isAdmin) return; this.isEditModeUtil = false; this.formModelUtil = this.utilizatorGol(); this.showFormUtil = true; }
  openEditFormUtil(item: UtilizatorPMB, index: number) { this.isEditModeUtil = true; this.formModelUtil = { ...item }; this.selectedIndexUtil = index; this.showFormUtil = true; }
  closeFormUtil() { this.showFormUtil = false; }

  saveFormUtil() {
    if (!this.formModelUtil.nume.trim() || !this.formModelUtil.user.trim()) return;
    const onDone = () => {
      this.loadUtilizatoriPMB();
      this.loadGrupuriMunca();
      this.closeFormUtil();
    };
    const onError = (err: any) => { console.error(err); alert('Eroare la salvare. Verifică datele și încearcă din nou.'); };

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

  toggleActivUtilizator(item: UtilizatorPMB) {
    if (!this.isAdmin || !item.id) return;
    this.nomenclatureService.toggleActivUtilizatorPMB(item.id).subscribe({
      next: () => { this.loadUtilizatoriPMB(); this.loadGrupuriMunca(); },
      error: (err: any) => { console.error(err); alert('Eroare la actualizare.'); }
    });
  }

  listeazaUtil() { window.print(); }
  salveazaUtil() { console.log('Utilizatori PMB persistați automat la fiecare salvare/ștergere.'); }

  // =========================================================
  // ---- OPERAȚII (Nomenclator operații) ----
  // =========================================================

  operatii: OperatieLogistica[] = [
    { cod: '10010', denumireRO: 'Montaj', denumireDE: 'Montage' },
    { cod: '10020', denumireRO: 'Lipire manuala', denumireDE: 'Handlöten' },
    { cod: '10030', denumireRO: 'Insurubare', denumireDE: 'Verschrauben' },
  ];

  searchTextOp: string = '';
  sortKeyOp: SortKeyOp = 'cod';
  sortAscOp: boolean = true;
  selectedIndexOp: number | null = null;
  showFormOp: boolean = false;
  isEditModeOp: boolean = false;
  formModelOp: OperatieLogistica = { cod: '', denumireRO: '', denumireDE: '' };
  editingIndexOp: number | null = null;

  get operatiiFiltrate(): OperatieLogistica[] {
    const term = this.searchTextOp.trim().toLowerCase();
    let lista = !term ? [...this.operatii] : this.operatii.filter(o => o.cod.toLowerCase().includes(term) || o.denumireRO.toLowerCase().includes(term) || o.denumireDE.toLowerCase().includes(term));
    lista.sort((a, b) => {
      const va = a[this.sortKeyOp as 'cod' | 'denumireRO' | 'denumireDE'].toLowerCase();
      const vb = b[this.sortKeyOp as 'cod' | 'denumireRO' | 'denumireDE'].toLowerCase();
      if (va < vb) return this.sortAscOp ? -1 : 1;
      if (va > vb) return this.sortAscOp ? 1 : -1;
      return 0;
    });
    return lista;
  }

  setSortOp(key: SortKeyOp) {
    if (this.sortKeyOp === key) { this.sortAscOp = !this.sortAscOp; } 
    else { this.sortKeyOp = key; this.sortAscOp = true; }
  }

  selectRowOp(index: number) { this.selectedIndexOp = index; }
  openAddFormOp() { this.isEditModeOp = false; this.formModelOp = { cod: '', denumireRO: '', denumireDE: '' }; this.editingIndexOp = null; this.showFormOp = true; }
  openEditFormOp(item: OperatieLogistica, index: number) { this.isEditModeOp = true; this.formModelOp = { ...item }; this.editingIndexOp = index; this.showFormOp = true; }
  closeFormOp() { this.showFormOp = false; }
  
  saveFormOp() {
    if (!this.formModelOp.cod.trim() || !this.formModelOp.denumireRO.trim()) return;
    if (this.isEditModeOp && this.editingIndexOp !== null) { this.operatii[this.editingIndexOp] = { ...this.formModelOp }; } 
    else { this.operatii.push({ ...this.formModelOp }); }
    this.closeFormOp();
  }

  deleteItemOp(index: number) { this.operatii.splice(index, 1); if (this.selectedIndexOp === index) this.selectedIndexOp = null; }
  listeazaOp() { window.print(); }
  salveazaOp() { console.log('Salvare operații:', this.operatii); }

  // =========================================================
  // ---- GRUPURI MUNCA (conectat la backend) ----
  // =========================================================

  searchTextGrup: string = '';
  sortKeyGrup: SortKeyGrup = 'grup';
  sortAscGrup: boolean = true;
  isLoadingGrupuri: boolean = false;
  grupuriMuncaData: GrupMunca[] = [];

  showFormGrupNou: boolean = false;
  isSavingGrupNou: boolean = false;
  formModelGrupNou: { nume: string } = { nume: '' };

  loadGrupuriMunca() {
    this.isLoadingGrupuri = true;
    this.nomenclatureService.getGrupuriMunca().subscribe({
      next: (data: GrupMunca[]) => { this.grupuriMuncaData = data; this.isLoadingGrupuri = false; },
      error: (err: any) => { console.error(err); this.isLoadingGrupuri = false; }
    });
  }

  get grupuriFiltrate(): GrupMunca[] {
    const term = this.searchTextGrup.trim().toLowerCase();
    const sursa = this.grupuriMuncaData;
    let lista = !term ? [...sursa] : sursa.filter(g => g.grup.toLowerCase().includes(term) || g.membri.join(', ').toLowerCase().includes(term));
    lista.sort((a, b) => {
      const va = this.sortKeyGrup === 'membri' ? a.membri.join(', ').toLowerCase() : a.grup.toLowerCase();
      const vb = this.sortKeyGrup === 'membri' ? b.membri.join(', ').toLowerCase() : b.grup.toLowerCase();
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

  openAddFormGrupNou() { this.formModelGrupNou = { nume: '' }; this.showFormGrupNou = true; }
  closeFormGrupNou() { this.showFormGrupNou = false; }

  saveFormGrupNou() {
    const nume = this.formModelGrupNou.nume.trim();
    if (!nume) return;
    this.isSavingGrupNou = true;
    this.nomenclatureService.createGrupMunca(nume).subscribe({
      next: () => {
        this.isSavingGrupNou = false;
        this.closeFormGrupNou();
        this.loadGrupuriMunca();
      },
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
    if (grupCurent && !nume.some(n => n.toLowerCase() === grupCurent.toLowerCase())) {
      nume.push(grupCurent);
    }
    return nume.sort((a, b) => a.localeCompare(b));
  }

  // Getter pentru popularea automată a dropdown-ului de grup intervenție din șablonul master
  get grupuriInterventieOptions(): string[] {
    const nume = this.grupuriMuncaData.map(g => g.grup);
    const responsabilCurent = this.formModel?.responsabil?.trim();
    if (responsabilCurent && !nume.some(n => n.toLowerCase() === responsabilCurent.toLowerCase())) {
      nume.push(responsabilCurent);
    }
    return nume.sort((a, b) => a.localeCompare(b));
  }
  // Getter pentru Lista de Piese (preluat din tabul Piese)
  get listaPieseOptions(): string[] {
    const liste = this.listePiese.map(l => l.denumire);
    const curent = this.formModel?.lista_piese?.trim();
    if (curent && !liste.some(l => l.toLowerCase() === curent.toLowerCase())) {
      liste.push(curent);
    }
    return liste.sort((a, b) => a.localeCompare(b));
  }

  // Getter pentru Lista de Operații (preluat din tabul Operații)
  get listaOperatiiOptions(): string[] {
    const ops = this.operatii.map(o => o.denumireRO);
    const curent = this.formModel?.lista_operatii?.trim();
    if (curent && !ops.some(o => o.toLowerCase() === curent.toLowerCase())) {
      ops.push(curent);
    }
    return ops.sort((a, b) => a.localeCompare(b));
  }

  listeazaGrup() { window.print(); }

  // =========================================================
  // ---- PIESE (Liste de piese <-> Piese) ----
  // =========================================================

  listePiese: ListaPiese[] = [];
  isLoadingListePiese: boolean = false;
  umOptions: string[] = ['m', 'l', 'kg', 'buc'];
  magazieOptions: string[] = ['Centrala', 'PMB', 'CBT', 'Sectie', 'SMT'];
  frecventaOptions: string[] = ['foarte rar', 'rar', 'mediu', 'des', 'foarte des'];
  toatePiesele: Piesa[] = [];
  isLoadingPiese: boolean = false;

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

  listaSelectataPiese: ListaPiese | null = null;
  selectedLista: ListaPiese | null = null;
  selectedLeftPieceIndex: number | null = null;
  selectedRightPieceIndex: number | null = null;

  filtruListaNr: string = '';
  filtruListaDenumire: string = '';

  get listePieseFiltrate(): ListaPiese[] {
    const nr = this.filtruListaNr.trim().toLowerCase();
    const den = this.filtruListaDenumire.trim().toLowerCase();
    return this.listePiese.filter(l =>
      (!nr || l.nrLista.toLowerCase().includes(nr)) &&
      (!den || l.denumire.toLowerCase().includes(den))
    );
  }

  conditieAprovOptions: string[] = ['Nu comanda', 'Avertisment', 'Comanda'];
  filtruPiesaId: string = '';
  filtruPiesaDenumire: string = '';
  filtruPiesaCodSap: string = '';
  filtruPiesaPozRaft: string = '';
  filtruPiesaPartNr: string = '';
  filtruPiesaStoc: string = '';
  filtruPiesaConditie: string = '';

  get pieseDisponibileFiltrate(): Piesa[] {
    const id = this.filtruPiesaId.trim().toLowerCase();
    const den = this.filtruPiesaDenumire.trim().toLowerCase();
    const cod = this.filtruPiesaCodSap.trim().toLowerCase();
    const poz = this.filtruPiesaPozRaft.trim().toLowerCase();
    const part = this.filtruPiesaPartNr.trim().toLowerCase();
    const stoc = this.filtruPiesaStoc.trim().toLowerCase();
    const cond = this.filtruPiesaConditie;

    return this.pieseDisponibile.filter(p => {
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

  showFormLista: boolean = false;
  isEditModeLista: boolean = false;
  editingRefLista: ListaPiese | null = null;
  formModelLista: ListaPiese = { nrLista: '', denumire: '', pieseIds: [] };

  showFormPiesa: boolean = false;
  isEditModePiesa: boolean = false;
  formModelPiesa: Piesa = this.piesaGoala();

  piesaGoala(): Piesa {
    return {
      id: 0, denumire: '', codSap: '', pretRon: '', um: '', magazie: '',
      pozitieRaft: '', stocMinim: '', stocCurent: '',
      frecventa: '', producator: '', partNumber: '', moq: '', utilizare: '', dublura: '',
      excludeDublate: false, excludeIesiteDinFabricatie: false,
      furnizor: '', refFurnizor: '', furnizor1: '', refFurn1: '', furnizor2: '', refFurn2: ''
    };
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
    const curent = Number(p.stocCurent);
    const minim = Number(p.stocMinim);
    if (isNaN(curent) || isNaN(minim)) return { label: '—', cls: '' };
    const diff = curent - minim;
    if (diff >= 2) return { label: 'Nu comanda', cls: 'badge-aprov-verde' };
    if (diff === 1) return { label: 'Avertisment', cls: 'badge-aprov-albastru' };
    return { label: 'Comanda', cls: 'badge-aprov-rosu' };
  }

  selectLista(item: ListaPiese) { this.selectedLista = item; }

  openAddFormLista() {
    this.isEditModeLista = false;
    this.editingRefLista = null;
    this.formModelLista = { nrLista: '', denumire: '', pieseIds: [] };
    this.showFormLista = true;
  }

  openEditFormLista(item: ListaPiese) {
    this.isEditModeLista = true;
    this.editingRefLista = item;
    this.formModelLista = { ...item };
    this.showFormLista = true;
  }

  closeFormLista() { this.showFormLista = false; }

  saveFormLista() {
    if (!this.formModelLista.denumire.trim()) return;
    const onDone = () => { this.loadListePiese(); this.closeFormLista(); };
    const onError = (err: any) => { console.error(err); alert('Eroare la salvare listă.'); };

    if (this.isEditModeLista && this.editingRefLista && this.editingRefLista.id) {
      this.nomenclatureService.updateListaPiese({ ...this.formModelLista, id: this.editingRefLista.id })
        .subscribe({ next: onDone, error: onError });
    } else {
      this.nomenclatureService.createListaPiese(this.formModelLista).subscribe({ next: onDone, error: onError });
    }
  }

  deleteLista() {
    if (!this.selectedLista || !this.selectedLista.id) return;
    if (!confirm('Sigur ștergi această listă?')) return;
    this.nomenclatureService.deleteListaPiese(this.selectedLista.id).subscribe({
      next: () => { this.selectedLista = null; this.loadListePiese(); },
      error: (err: any) => { console.error(err); alert('Eroare la ștergere listă.'); }
    });
  }

  deschideLista(item: ListaPiese) {
    this.listaSelectataPiese = item;
    this.selectedLeftPieceIndex = null;
    this.selectedRightPieceIndex = null;
  }

  inapoiLaListe() {
    this.listaSelectataPiese = null;
    this.selectedLista = null;
    this.selectedLeftPieceIndex = null;
    this.selectedRightPieceIndex = null;
  }

  selectPiesaStanga(index: number) { this.selectedLeftPieceIndex = index; this.selectedRightPieceIndex = null; }
  selectPiesaDreapta(index: number) { this.selectedRightPieceIndex = index; this.selectedLeftPieceIndex = null; }

  mutaInLista() {
    if (!this.listaSelectataPiese || !this.listaSelectataPiese.id || this.selectedRightPieceIndex === null) return;
    const piesa = this.pieseDisponibile[this.selectedRightPieceIndex];
    if (!piesa) return;
    this.nomenclatureService.adaugaPiesaInLista(this.listaSelectataPiese.id, piesa.id).subscribe({
      next: () => { this.selectedRightPieceIndex = null; this.loadListePiese(); },
      error: (err: any) => { console.error(err); alert('Eroare la adăugarea piesei în listă.'); }
    });
  }

  scoateDinLista() {
    if (!this.listaSelectataPiese || !this.listaSelectataPiese.id || this.selectedLeftPieceIndex === null) return;
    const piesa = this.pieseInLista[this.selectedLeftPieceIndex];
    if (!piesa) return;
    this.nomenclatureService.scoatePiesaDinLista(this.listaSelectataPiese.id, piesa.id).subscribe({
      next: () => { this.selectedLeftPieceIndex = null; this.loadListePiese(); },
      error: (err: any) => { console.error(err); alert('Eroare la scoaterea piesei din listă.'); }
    });
  }

  openAddFormPiesa() {
    this.isEditModePiesa = false;
    this.formModelPiesa = this.piesaGoala();
    this.showFormPiesa = true;
  }

  openEditFormPiesa(item: Piesa) {
    this.isEditModePiesa = true;
    this.formModelPiesa = { ...item };
    this.showFormPiesa = true;
  }

  closeFormPiesa() { this.showFormPiesa = false; }

  saveFormPiesa() {
    if (!this.formModelPiesa.denumire.trim() || !this.formModelPiesa.codSap.trim()) return;
    const onDone = () => { this.loadPiese(); this.loadListePiese(); this.closeFormPiesa(); };
    const onError = (err: any) => { console.error(err); alert('Eroare la salvare piesă.'); };

    if (this.isEditModePiesa && this.formModelPiesa.id) {
      this.nomenclatureService.updatePiesa(this.formModelPiesa).subscribe({ next: onDone, error: onError });
    } else {
      this.nomenclatureService.createPiesa(this.formModelPiesa).subscribe({ next: onDone, error: onError });
    }
  }

  deleteSelectedPiesa() {
    if (this.selectedRightPieceIndex === null) return;
    const piesa = this.pieseDisponibileFiltrate[this.selectedRightPieceIndex];
    if (!piesa) return;
    if (!confirm('Sigur ștergi această piesă?')) return;
    this.nomenclatureService.deletePiesa(piesa.id).subscribe({
      next: () => { this.selectedRightPieceIndex = null; this.loadPiese(); this.loadListePiese(); },
      error: (err: any) => { console.error(err); alert('Eroare la ștergere piesă.'); }
    });
  }

  sortKeyPiese: SortKeyPiese = 'denumire';
  sortAscPiese: boolean = true;

  setSortPiese(key: SortKeyPiese) {
    if (this.sortKeyPiese === key) {
      this.sortAscPiese = !this.sortAscPiese;
    } else {
      this.sortKeyPiese = key;
      this.sortAscPiese = true;
    }
    this.pieseDisponibile.sort((a: any, b: any) => {
      const valA = a[key] ?? '';
      const valB = b[key] ?? '';
      const numA = Number(valA);
      const numB = Number(valB);

      if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') {
        return this.sortAscPiese ? numA - numB : numB - numA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return this.sortAscPiese ? -1 : 1;
      if (strA > strB) return this.sortAscPiese ? 1 : -1;
      return 0;
    });
  }

  sortKeyListe: 'nrLista' | 'denumire' | '' = 'nrLista';
  sortAscListe: boolean = true;

  setSortListe(key: 'nrLista' | 'denumire') {
    if (this.sortKeyListe === key) {
      this.sortAscListe = !this.sortAscListe;
    } else {
      this.sortKeyListe = key;
      this.sortAscListe = true;
    }

    this.listePiese.sort((a: any, b: any) => {
      const valA = a[key] ?? '';
      const valB = b[key] ?? '';
      const numA = Number(valA);
      const numB = Number(valB);

      if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') {
        return this.sortAscListe ? numA - numB : numB - numA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return this.sortAscListe ? -1 : 1;
      if (strA > strB) return this.sortAscListe ? 1 : -1;
      return 0;
    });
  }
}