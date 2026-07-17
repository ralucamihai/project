import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

export interface TipEchipament {
  cod: string;
  denumire: string;
  activ: boolean;
}

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
    { key: 'piese_schimb', label: 'Piese de Schimb' },
    { key: 'operatii', label: 'Operații' }
  ];

  // ---- Date Tip Echipament (mock, inlocuieste cu API cand e gata backend-ul) ----
  tipuriEchipament: TipEchipament[] = [
    { cod: 'C', denumire: 'Cabina', activ: true },
    { cod: 'D', denumire: 'Dispozitiv', activ: true },
    { cod: 'E', denumire: 'Echipament', activ: true },
    { cod: 'ELS', denumire: 'Electro securitate', activ: true },
    { cod: 'ESD', denumire: 'ESD punct de măsurare', activ: true },
  ];

  searchText: string = '';

  // ---- Formular adaugare / editare ----
  showForm: boolean = false;
  isEditMode: boolean = false;
  formModel: TipEchipament = { cod: '', denumire: '', activ: true };
  editingIndex: number | null = null;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.activeTab = params['tab'] || 'tip_echipament';
    });
  }

  setTab(tab: string) {
    this.activeTab = tab;
  }

  get tipuriFiltrate(): TipEchipament[] {
    const term = this.searchText.trim().toLowerCase();
    if (!term) return this.tipuriEchipament;
    return this.tipuriEchipament.filter(t =>
      t.cod.toLowerCase().includes(term) || t.denumire.toLowerCase().includes(term)
    );
  }

  openAddForm() {
    this.isEditMode = false;
    this.formModel = { cod: '', denumire: '', activ: true };
    this.editingIndex = null;
    this.showForm = true;
  }

  openEditForm(item: TipEchipament, index: number) {
    this.isEditMode = true;
    this.formModel = { ...item };
    this.editingIndex = index;
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
  }

  saveForm() {
    if (!this.formModel.cod.trim() || !this.formModel.denumire.trim()) {
      return;
    }

    if (this.isEditMode && this.editingIndex !== null) {
      this.tipuriEchipament[this.editingIndex] = { ...this.formModel };
    } else {
      this.tipuriEchipament.push({ ...this.formModel });
    }

    this.closeForm();
  }

  deleteItem(index: number) {
    this.tipuriEchipament.splice(index, 1);
  }

  toggleActiv(item: TipEchipament) {
    item.activ = !item.activ;
  }
}