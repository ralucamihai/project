import { Component, HostListener } from '@angular/core';
import { ApiCallerService } from '../services/api-caller.service';
import { Router } from '@angular/router';
import { WebSocketService } from '../services/web-socket.service';
import { Subscription } from 'rxjs';

interface UserRow {
  nume: string;
  prenume: string;
  utilizator: string;
  email: string;
  'numar marca': string;
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
export class UserManagementComponent {
  constructor(private api_caller: ApiCallerService, private router: Router, private wsService: WebSocketService) {}

  messageSubscription!: Subscription;
  data: UserRow[] = [];
  error: string = '';

  filters: { [key: string]: string } = {
    nume: '',
    prenume: '',
    utilizator: '',
    email: '',
    'numar marca': '',
    'rol cerut': '',
    'rol aprobat': '',
    'status cont': ''
  };

  selectedRowIndex: number | null = null;
  hoverIndex: number | null = null;
  

  getAllUsers() {
    this.api_caller.getAllUsers().subscribe(response => {   
      this.data = this.mapResponseToUserRows(response);   
    });
  }

  ngOnInit(): void {
    this.wsService.connect();

    this.getAllUsers();

    this.messageSubscription = this.wsService.messages$.subscribe((message) => {
      console.log('Received message:', message);
      if (message === 'user_management_data_updated') {
        this.getAllUsers();
      }
    }); 
  }

  mapResponseToUserRows(response: any[]): UserRow[] {
    return response.map(user => ({
      nume: user.firstName || '',
      prenume: user.lastName || '',
      utilizator: user.username || '',
      email: user.email || '',
      'numar marca': user.employeeNo || '',
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
    // 1. Apelăm endpoint-ul existent de aprobare cont
    this.api_caller.approveUser(row.utilizator, row['rol aprobat'], row['status cont']).subscribe({
        next: () => {
          this.error = '';

          // 2. Dacă statusul contului a devenit 'activ', îl sincronizăm automat și în Nomenclator (Utilizatori PMB)
          if (row['status cont'] === 'activ') {
            const operatorPmbData = {
              marca: row['numar marca'] || '0000',
              nume: `${row.nume} ${row.prenume}`.trim(),
              functie: 'Operator',
              grup: row['rol aprobat'] === 'Admin' ? 'inginer' : 'electronist',
              acces: true,
              user: row.utilizator,
              nivelAcces: row['rol aprobat'],
              activ: true,
              dataActiv: new Date().toISOString().slice(0, 10)
            };

            // Apelăm serviciul API pentru a adăuga operatorul în lista PMB din Nomenclator
            this.api_caller.saveOperatorPmb(operatorPmbData).subscribe({
              next: () => console.log('Operator sincronizat cu succes în Nomenclator PMB!'),
              error: err => console.warn('Notă: Sincronizarea cu nomenclatorul PMB s-a făcut local sau necesită endpoint dedicat.', err)
            });
          }
        },
        error: err => {
          if (err.error?.detail) {
            this.error = err.error.detail;
          } else if (typeof err.error === 'string') {
            this.error = err.error;
          } else {
            this.error = 'Salvarea a eșuat.';
          }
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const clickedInsideTable = (event.target as HTMLElement).closest('table');
    if (!clickedInsideTable && this.selectedRowIndex !== null) {
      this.deselectRow();
    }
  }
}