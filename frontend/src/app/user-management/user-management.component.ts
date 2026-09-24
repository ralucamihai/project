import { Component, HostListener, OnInit } from '@angular/core';
import { ApiCallerService } from '../services/api-caller.service';
import { Router } from '@angular/router';
import { WebSocketService } from '../services/web-socket.service';
import { NomenclatureService, GrupMunca } from '../services/nomenclature.service';
import { Subscription } from 'rxjs';

interface UserRow {
  firstName: string;
  lastName: string;
  nume: string;
  prenume: string;
  utilizator: string;
  email: string;
  'numar marca': string;
  departament: string;
  functie: string;
  grup: string;
  'rol cerut': string;
  'rol aprobat': string;
  'status cont': string;
}

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css'],
  standalone: false,
})
export class UserManagementComponent implements OnInit {
  constructor(
    private api_caller: ApiCallerService,
    private router: Router,
    private wsService: WebSocketService,
    private nomenclatureService: NomenclatureService
  ) {}

  messageSubscription!: Subscription;
  data: UserRow[] = [];
  error: string = '';

  filters: { [key: string]: string } = {
    nume: '',
    prenume: '',
    utilizator: '',
    email: '',
    'numar marca': '',
    departament: '',
    functie: '',
    grup: '',
    'rol cerut': '',
    'rol aprobat': '',
    'status cont': ''
  };

  selectedRowIndex: number | null = null;
  hoverIndex: number | null = null;

  showEditModal: boolean = false;
  editingUser: UserRow | null = null;
  formModelEdit: Partial<UserRow> = {};

  grupuriDisponibile: string[] = [];

  loadGrupuri() {
    this.nomenclatureService.getGrupuriMunca().subscribe({
      next: (grupuri: GrupMunca[]) => {
        this.grupuriDisponibile = (grupuri || []).map(g => g.grup);
      },
      error: (err: any) => console.error('Nu s-au putut incarca grupurile:', err)
    });
  }
  
  getAllUsers() {
    this.api_caller.getAllUsers().subscribe(response => {   
      this.data = this.mapResponseToUserRows(response);   
    });
  }

  ngOnInit(): void {
    this.wsService.connect();
    this.getAllUsers();
    this.loadGrupuri();
    this.messageSubscription = this.wsService.messages$.subscribe((message) => {
      console.log('Received message:', message);
      if (message === 'user_management_data_updated') {
        this.getAllUsers();
      }
    }); 
  }

  mapResponseToUserRows(response: any[]): UserRow[] {
    return response.map(user => ({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      nume: user.firstName || '',
      prenume: user.lastName || '',
      utilizator: user.username || '',
      email: user.email || '',
      'numar marca': user.employeeNo || '',
      departament: user.department || '',
      functie: user.functie || '',
      grup: user.grup || '',
      'rol cerut': user.role || '', 
      'rol aprobat': user.role || '',
      'status cont': this.mapStatus(user.status)
    }));
  }

  mapStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'not confirmed': 'in_asteptare',
      'active': 'activ',
      'inactive': 'inactiv',
      'pending': 'in_asteptare',
    };
    return statusMap[status] || status;
  }

  approveUser(row: UserRow) {
    const backendStatusMap: { [key: string]: string } = {
      'in_asteptare': 'pending',
      'activ': 'active',
      'inactiv': 'inactive'
    };
    const statusToSend = backendStatusMap[row['status cont']] || row['status cont'];

    this.api_caller.approveUser(row.utilizator, row['rol aprobat'], statusToSend, row.grup).subscribe({
      next: () => {
        this.error = '';
        if (row['status cont'] === 'activ') {
          const operatorPmbData = {
            marca: row['numar marca'] || '0000',
            nume: `${row.nume} ${row.prenume}`.trim(),
            functie: row.functie || 'Operator',
            grup: row.grup || '',
            acces: true,
            user: row.utilizator,
            nivelAcces: row['rol aprobat'],
            activ: true,
            dataActiv: new Date().toISOString().slice(0, 10)
          };

          this.api_caller.saveOperatorPmb(operatorPmbData).subscribe({
            next: () => console.log('Operator sincronizat în Nomenclator PMB!'),
            error: err => console.warn('Eroare la salvarea operatorului:', err)
          });
        }
        this.getAllUsers();
      },
      error: err => {
        console.error('Eroare la aprobare utilizator:', err);
        if (err.error?.detail) this.error = err.error.detail;
        else if (typeof err.error === 'string') this.error = err.error;
        else this.error = 'Salvarea a eșuat.';
        alert('Eroare la salvare: ' + this.error);
      }
    });
  }

  get filteredData(): UserRow[] {
    return this.data.filter(row => {
      return Object.keys(this.filters).every(key => {
        const filterValue = this.filters[key].toLowerCase();
        const rowValue = (row as any)[key]?.toLowerCase?.() || '';
        return rowValue.includes(filterValue);
      });
    });
  }

  selectRow(index: number) {
    this.selectedRowIndex = index;
  }

  deselectRow() {
    this.selectedRowIndex = null;
  }

  saveUser(row: UserRow) {
    this.approveUser(row);
  }

  openEditModal(row: UserRow) {
    this.editingUser = row;
    this.formModelEdit = { ...row }; 
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editingUser = null;
  }

  saveEditModal() {
    if (this.editingUser) {
      Object.assign(this.editingUser, this.formModelEdit);
      this.saveUser(this.editingUser);

      this.api_caller.updateUserInfo(
        this.editingUser.utilizator,
        this.editingUser.nume,
        this.editingUser.prenume,
        this.editingUser.email,
        this.editingUser['numar marca'],
        this.editingUser.departament,
        this.editingUser.functie,
        this.editingUser.grup
      ).subscribe({
        next: () => {
          console.log('Datele personale au fost actualizate și salvate în DB!');
          this.getAllUsers();
        },
        error: err => {
          console.error('Eroare la salvarea datelor personale:', err);
          alert('Nu s-au putut salva datele personale: ' + (err.error?.detail || 'Eroare server.'));
        }
      });
    }
    this.closeEditModal();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const clickedInsideTable = target.closest('table');
    const clickedInsideModal = target.closest('.modal-box');
    
    if (!clickedInsideTable && !clickedInsideModal && this.selectedRowIndex !== null) {
      this.deselectRow();
    }
  }
}