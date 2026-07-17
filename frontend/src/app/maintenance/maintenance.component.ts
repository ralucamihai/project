import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import {
  MaintenanceService,
  ActivitatePMB,
  EchipamentPMB
} from '../services/maintenance.service';

@Component({
  selector: 'app-maintenance',
  templateUrl: './maintenance.component.html',
  styleUrl: './maintenance.component.css',
  standalone: false
})
export class MaintenanceComponent implements OnInit {

  activeTab: string = 'echipamente';

  // ---- Optiuni dropdown-uri ----
  tipuriInterventie: string[] = [
    'Accidentala',
    'AEM',
    'Ajustare parametrii',
    'Backup',
    'Cladiri',
    'Curatare_echip',
    'Electric',
    'Electrosecuritate',
    'ESD',
    'Imbunatatire',
    'Instalare Echipament',
    'Masuratoare',
    'Pneumatic',
    'Pornire_fabricatie',
    'Predictiva',
    'Prelucrare mecanica repere',
    'Preventiva',
    'Produs_nou',
    'Reglaj echipament',
    'Reglaj stanta',
    'Schimb_echip',
    'Schimb_produs',
    'Schimb_recipient',
    'Schimb_stanta'
  ];

  defEnuntateOptions: string[] = [];

  statusOptions: string[] = ['Finalizat', 'In lucru', 'Programat', 'Anulat'];

  filtruListareOptions: { value: string; label: string }[] = [
    { value: 'total', label: 'Total' },
    { value: 'anual', label: 'Anual' },
    { value: 'lunar', label: 'Lunar' },
    { value: 'zilnic', label: 'Zilnic' }
  ];

  // ---- Filtre curente ----
  filtre = {
    tipInterventie: '',
    defEnuntat: '',
    piese: '',
    loc: '',
    executant: '',
    status: '',
    activ: '',
    filtruListare: 'total'
  };

  // ---- Date reale (populate din backend) ----
  activitati: ActivitatePMB[] = [];
  echipamente: EchipamentPMB[] = [];

  // ---- Stari UI ----
  isLoadingActivitati: boolean = false;
  isLoadingEchipamente: boolean = false;
  isLoadingOptions: boolean = false;
  errorActivitati: string | null = null;
  errorEchipamente: string | null = null;

  private filterDebounce: any;

  constructor(
    private route: ActivatedRoute,
    private maintenanceService: MaintenanceService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.activeTab = params['tab'] || 'echipamente';
      this.loadDataForActiveTab();
    });

    this.loadFilterOptions();
  }

  setTab(tab: string) {
    this.activeTab = tab;
    this.loadDataForActiveTab();
  }

  private loadDataForActiveTab() {
    if (this.activeTab === 'activitati' && this.activitati.length === 0) {
      this.loadActivitati();
    }
    if (this.activeTab === 'echipamente' && this.echipamente.length === 0) {
      this.loadEchipamente();
    }
  }

  loadFilterOptions() {
    // tipuriInterventie e acum lista fixa de mai sus, nu mai vine din backend

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

  loadActivitati() {
    this.isLoadingActivitati = true;
    this.errorActivitati = null;

    this.maintenanceService.getActivitati(this.filtre)
      .pipe(finalize(() => this.isLoadingActivitati = false))
      .subscribe({
        next: (data) => this.activitati = data,
        error: (err) => {
          console.error('Eroare la încărcarea activităților:', err);
          this.errorActivitati = 'Nu s-au putut încărca activitățile. Verifică conexiunea la server.';
        }
      });
  }

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

  onFiltreChanged() {
    clearTimeout(this.filterDebounce);
    this.filterDebounce = setTimeout(() => {
      this.loadActivitati();
    }, 400);
  }

  resetFiltre() {
    this.filtre = {
      tipInterventie: '',
      defEnuntat: '',
      piese: '',
      loc: '',
      executant: '',
      status: '',
      activ: '',
      filtruListare: 'total'
    };
    this.loadActivitati();
  }

  statusClass(status: string): string {
    switch (status) {
      case 'Finalizat': return 'badge badge-success';
      case 'In lucru': return 'badge badge-warning';
      case 'Programat': return 'badge badge-info';
      case 'Anulat': return 'badge badge-danger';
      default: return 'badge';
    }
  }
}