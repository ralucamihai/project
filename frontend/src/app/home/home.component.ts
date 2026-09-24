import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ApiCallerService } from '../services/api-caller.service';
import { AuthService, UserInfo } from '../services/auth.service';
import { NomenclatureService } from '../services/nomenclature.service';
import { MaintenanceService } from '../services/maintenance.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { WebSocketService } from '../services/web-socket.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class HomeComponent implements OnInit {
  showGuide = false;
  showEditGuide = false;
  reportProblemVisible = false;
  isLoading = false;
  showUserMenu = false;

  problemDescription = '';
  userEmail = '';
  editableGuideText = '';

  currentUser: any = {
    username: 'N/A',
    role: 'N/A',
    firstName: '',
    lastName: '',
    functie: ''
  };

  guideText = '';
  messageSubscription!: Subscription;

  // Proprietăți pentru prezență
  currentDate: string = '';
  currentDateShort: string = '';
  schimbCurent: string = 'Schimbul 1'; 
  schimbCurentNumar: string = '1';
  ultimaZiLunaCurenta: string = '';

  // Hardcodat personal prezent
  listaPrezenti: any[] = [
    { nume: 'Ion Popescu', functie: 'Operator CNC', schimb: 'Schimbul 1', timpRamas: 450, status: 'Prezent' },
    { nume: 'Maria Ionescu', functie: 'Controlor Calitate', schimb: 'Schimbul 1', timpRamas: 420, status: 'Prezent' },
    { nume: 'Andrei Vasilescu', functie: 'Mecanic Întreținere', schimb: 'Schimbul 1', timpRamas: 390, status: 'Prezent' },
    { nume: 'Elena Dumitrescu', functie: 'Operator Asamblare', schimb: 'Schimbul 1', timpRamas: 460, status: 'Prezent' }
  ];

  // Exemple hardcodate personal Absent și Învoit
  listaAbsenti: any[] = [
    { nume: 'Vasile Georgescu', functie: 'Operator CNC', schimb: 'Schimbul 1', status: 'Absent' },
    { nume: 'Ana Mihăilescu', functie: 'Controlor Calitate', schimb: 'Schimbul 1', status: 'Învoit' },
    { nume: 'Mihai Dobre', functie: 'Mecanic Întreținere', schimb: 'Schimbul 1', status: 'Absent' },
    { nume: 'Cristina Neagu', functie: 'Operator Asamblare', schimb: 'Schimbul 1', status: 'Învoit' }
  ];

  // Date dinamice pentru Întreruperi active și Activități programate
  currentDateFormatted: string = '';
  liniiFabricatie: any[] = [];
  tipuriInterventie: any[] = [];
  activitatiProgramate: any[] = [];

  // Proprietate pentru filtrarea activităților programate
  doarAleMele: boolean = false;

  constructor(
    private router: Router,
    private api_caller: ApiCallerService,
    public authService: AuthService,
    private wsService: WebSocketService,
    private nomenclatureService: NomenclatureService,
    private maintenanceService: MaintenanceService
  ) {}

  ngOnInit(): void {
    this.setCurrentDate();
    this.wsService.connect();
    this.getCurrentUser();
    this.loadIntreruperiActiveData();
    this.loadActivitatiProgramateData();

    this.messageSubscription = this.wsService.messages$.subscribe((message) => {
      console.log('Received message:', message);
      if (message === 'guide_text_data_updated' || message === 'user_management_data_updated') {
        this.getCurrentUser();
      }
    }); 
  }

  setCurrentDate(): void {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const yearFull = d.getFullYear();
    const yearShort = String(yearFull).slice(-2);

    this.currentDate = `${day}.${month}.${yearFull}`;
    this.currentDateFormatted = `${day}.${month}.${yearFull}`;
    this.currentDateShort = `${day}.${month}.${yearShort}`;

    // Calcularea ultimei zile din luna curentă
    const lastDayObj = new Date(yearFull, d.getMonth() + 1, 0);
    const lastDay = String(lastDayObj.getDate()).padStart(2, '0');
    this.ultimaZiLunaCurenta = `${lastDay}.${month}.${yearShort}`;
  }

  getSchimbNumar(schimbStr: string): string {
    if (!schimbStr) return '1';
    const match = schimbStr.match(/\d+/);
    return match ? match[0] : '1';
  }

  loadIntreruperiActiveData(): void {
    this.nomenclatureService.getSectii().subscribe({
      next: (sectii) => {
        this.liniiFabricatie = sectii || [];
      },
      error: (err) => console.error('Eroare la încărcarea secțiilor/liniilor:', err)
    });

    this.nomenclatureService.getTipuriInterventie().subscribe({
      next: (tipuri) => {
        this.tipuriInterventie = tipuri || [];
      },
      error: (err) => console.error('Eroare la încărcarea tipurilor de intervenție:', err)
    });
  }

  loadActivitatiProgramateData(): void {
    const lunaCurenta = new Date().getMonth() + 1;

    this.maintenanceService.getEchipamente().subscribe({
      next: (echipamente) => {
        this.activitatiProgramate = (echipamente || []).filter(e => {
          return (
            this.verificaLuna(e.dataReceptie, e.preventiva, lunaCurenta) ||
            this.verificaLuna(e.dataReceptie, e.calibrare, lunaCurenta) ||
            this.verificaLuna(e.dataReceptie, e.backup, lunaCurenta) ||
            (e.controlESD && e.controlESD.trim().toUpperCase() !== 'NA') ||
            (e.electrosecuritate && e.electrosecuritate.trim().toUpperCase() !== 'NA')
          );
        });
      },
      error: (err) => console.error('Eroare la încărcarea echipamentelor pentru activități:', err)
    });
  }

  // Metodă de filtrare bazată pe checkbox-ul "Doar ale mele"
  get activitatiFiltrate(): any[] {
    if (!this.doarAleMele) {
      return this.activitatiProgramate;
    }
    const currentName = this.getFullName().toLowerCase();
    const currentUsername = (this.currentUser?.username || '').toLowerCase();

    return this.activitatiProgramate.filter(eq => {
      const resp = (eq.responsabil || '').toLowerCase();
      return resp === currentName || resp === currentUsername || (!eq.responsabil && true);
    });
  }

  // Funcție export CSV
  listeazaCSV(): void {
    const dateDeExportat = this.activitatiFiltrate;
    if (!dateDeExportat || dateDeExportat.length === 0) {
      alert('Nu există date de exportat!');
      return;
    }

    const headers = ['Nr. inv.', 'Descriere', 'Tip', 'Responsabil', 'Termen'];
    let fileContent = '\uFEFF' + headers.join('\t') + '\n';

    dateDeExportat.forEach(eq => {
      const row = [
        eq.numar || '',
        eq.denumire || '',
        'Mentenanță',
        eq.responsabil || this.currentUser.username,
        this.ultimaZiLunaCurenta
      ];
      fileContent += row.join('\t') + '\n';
    });

    const blob = new Blob([fileContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `activitati_programate_${this.currentDateShort}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private verificaLuna(dataReceptie: string, periodValue: string, lunaCurenta: number): boolean {
    if (!periodValue || periodValue === 'na' || periodValue === 'NA') return false;
    
    let interval = null;
    if (periodValue === 'lunar') interval = 1;
    else if (periodValue === 'la_2_luni') interval = 2;
    else if (periodValue === 'la_3_luni') interval = 3;
    else if (periodValue === 'la_6_luni') interval = 6;
    else if (periodValue === 'anual') interval = 12;

    if (!interval) return false;

    let addedMonth = lunaCurenta;
    if (dataReceptie) {
      const parti = dataReceptie.split('-');
      const lunaRec = parti.length === 3 ? parseInt(parti[1], 10) : NaN;
      if (!isNaN(lunaRec) && lunaRec >= 1 && lunaRec <= 12) addedMonth = lunaRec;
    }

    const diff = ((lunaCurenta - addedMonth) % interval + interval) % interval;
    return diff === 0;
  }

  getFullName(): string {
    const f = this.currentUser?.firstName || '';
    const l = this.currentUser?.lastName || '';
    if (f || l) {
      return `${f} ${l}`.trim();
    }
    return this.currentUser?.username || 'N/A';
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  closeUserMenu(): void {
    this.showUserMenu = false;
  }

  getCurrentUser(): void {
    this.api_caller.getUser().subscribe(response => {  
      if (response) {
        this.currentUser = response;
      }
      this.loadGuideText();
    });
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 'admin' || this.currentUser?.role === 'Admin';
  }

  logout(): void {
    this.api_caller.logout();
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  openGuide(): void { this.showGuide = true; }
  closeGuide(): void { this.showGuide = false; }

  loadGuideText(): void {
    this.api_caller.getGuideText().subscribe({
      next: (text) => { this.guideText = this.formatGuideText(text); },
      error: () => { this.guideText = this.getDefaultGuideText(); }
    });
  }

  formatGuideText(guideText: string): string {
    if (!guideText || !this.currentUser) return this.getDefaultGuideText();
    return this.cleanTextInput(guideText)
      .replace(/{{role}}/g, this.currentUser.role || '')
      .replace(/{{username}}/g, this.currentUser.username || '')
      .replace(/\n/g, '<br>');
  }

  openEditGuide(): void {
    if (!this.isAdmin()) { alert('Nu aveți permisiuni.'); return; }
    this.showEditGuide = true;
  }

  closeEditGuide(): void { this.showEditGuide = false; this.editableGuideText = ''; }

  saveGuideText(): void {
    if (!this.editableGuideText.trim()) return;
    this.isLoading = true;
    this.api_caller.updateGuideText(this.editableGuideText).subscribe({
      next: () => { this.closeEditGuide(); this.loadGuideText(); this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
  }

  private cleanTextInput(text: string): string {
    if (typeof text !== 'string') return '';
    let cleanText = text.trim();
    if (cleanText.startsWith('"') && cleanText.endsWith('"')) cleanText = cleanText.slice(1, -1);
    return cleanText.replace(/\\n/g, '\n');
  }

  private getDefaultGuideText(): string {
    return `Bine ai venit pe site!<br>Utilizator: ${this.currentUser.username}`;
  }

  onTextInput(event: any): void { this.editableGuideText = event.target.value; }
  
  getPreviewText(): string {
    if (!this.editableGuideText) return '';
    return this.editableGuideText.replace(/{{role}}/g, this.currentUser.role || '').replace(/{{username}}/g, this.currentUser.username || '').replace(/\n/g, '<br>');
  }
}