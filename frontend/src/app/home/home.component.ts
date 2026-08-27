import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ApiCallerService } from '../services/api-caller.service';
import { AuthService, UserInfo } from '../services/auth.service';
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

  problemDescription = '';
  userEmail = '';
  editableGuideText = '';

  currentUser: any = {
    username: 'N/A',
    role: 'N/A'
  };

  guideText = '';

  messageSubscription!: Subscription;

  constructor(
    private router: Router,
    private api_caller: ApiCallerService,
    public authService: AuthService,
    private wsService: WebSocketService
  ) {}

  ngOnInit(): void {
    this.wsService.connect();
    this.getCurrentUser();

    this.messageSubscription = this.wsService.messages$.subscribe((message) => {
      console.log('Received message:', message);
      if (message === 'guide_text_data_updated') {
        this.getCurrentUser();
      }
    }); 
  }

  getCurrentUser(): void {
    this.api_caller.getUser().subscribe(response => {   
      this.currentUser = response;
      this.loadGuideText();
    });
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 'admin' || this.currentUser?.role === 'Admin';
  }

  goToForgotPassword(): void {
    this.router.navigate(['/forgot-password']);
  }

  goToAccountManagement(): void {
    this.router.navigate(['/account_management']);
  }

  goToAccountAdministration(): void {
    this.router.navigate(['/account-administration']);
  }

  logout(): void {
    this.api_caller.logout();
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  openGuide(): void {
    this.showGuide = true;
  }

  closeGuide(): void {
    this.showGuide = false;
  }

  loadGuideText(): void {
    this.api_caller.getGuideText().subscribe({
      next: (text) => {
        this.guideText = this.formatGuideText(text);
      },
      error: (error) => {
        console.error('Failed to load guide text:', error);
        this.guideText = this.getDefaultGuideText();
      }
    });
  }

  formatGuideText(guideText: string): string {
    if (!guideText || !this.currentUser) return this.getDefaultGuideText();
    
    let cleanText = this.cleanTextInput(guideText);
    
    return cleanText
      .replace(/{{role}}/g, this.currentUser.role || '')
      .replace(/{{username}}/g, this.currentUser.username || '')
      .replace(/\n/g, '<br>');
  }

  openEditGuide(): void {
    if (!this.isAdmin()) {
      alert('Nu aveți permisiuni pentru această acțiune.');
      return;
    }
    
    this.loadRawGuideText();
    this.showEditGuide = true;
  }

  closeEditGuide(): void {
    this.showEditGuide = false;
    this.editableGuideText = '';
  }

  loadRawGuideText(): void {
    this.api_caller.getGuideText().subscribe({
      next: (text) => {
        this.editableGuideText = this.cleanTextInput(text);
      },
      error: (error) => {
        console.error('Failed to load guide text for editing:', error);
        this.editableGuideText = this.getDefaultRawGuideText();
      }
    });
  }

  saveGuideText(): void {
    if (!this.editableGuideText.trim()) {
      alert('Textul nu poate fi gol.');
      return;
    }

    this.isLoading = true;
    
    this.api_caller.updateGuideText(this.editableGuideText).subscribe({
      next: () => {
        alert('Textul ghidului a fost actualizat cu succes!');
        this.closeEditGuide();
        this.loadGuideText(); 
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to update guide text:', error);
        alert('Eroare la actualizarea textului. Încercați din nou.');
        this.isLoading = false;
      }
    });
  }

  openFeedback(): void {
    this.openReportProblem();
  }

  openReportProblem(): void {
    this.reportProblemVisible = true;
   
    if (this.currentUser.email) {
      this.userEmail = this.currentUser.email;
    }
  }

  closeReportProblem(): void {
    this.reportProblemVisible = false;
    this.problemDescription = '';
    this.userEmail = '';
  }

  submitReport(): void {
    if (!this.problemDescription.trim() || !this.userEmail.trim()) {
      alert('Te rog completează toate câmpurile.');
      return;
    }
    console.log('Raport problemă:', this.problemDescription);
    console.log('Email utilizator:', this.userEmail);
    console.log('Utilizator:', this.currentUser.username);
    alert('Mulțumim pentru raportare!');
    this.closeReportProblem();
  }

  private cleanTextInput(text: string): string {
    if (typeof text !== 'string') return '';
    
    let cleanText = text.trim();
    
    if (cleanText.startsWith('"') && cleanText.endsWith('"')) {
      cleanText = cleanText.slice(1, -1);
    }
    
    cleanText = cleanText.replace(/\\n/g, '\n');
    
    return cleanText;
  }

  private getDefaultGuideText(): string {
    return `Bine ai venit pe site!<br>
      Pentru a naviga, folosește meniul de sus.<br>
      Poți reseta parola sau administra contul folosind butoanele din secțiunea principală.<br>
      Dacă ai întrebări, nu ezita să folosești butonul de feedback din dreapta jos.<br><br>
      <strong>Rolul tău:</strong> ${this.currentUser.role}<br>
      <strong>Utilizator:</strong> ${this.currentUser.username}`;
  }

  private getDefaultRawGuideText(): string {
    return `Bine ai venit pe site!
Pentru a naviga, folosește meniul de sus.
Poți reseta parola sau administra contul folosind butoanele din secțiunea principală.
Dacă ai întrebări, nu ezita să folosești butonul de feedback din dreapta jos.

<strong>Rolul tău:</strong> {{role}}
<strong>Utilizator:</strong> {{username}}

Funcționalități disponibile:
• Resetare parolă
• Administrare cont
• Raportare probleme
• Deconectare

Pentru asistență suplimentară, contactează administratorul sistemului.`;
  }

onTextInput(event: any): void {
  this.editableGuideText = event.target.value;
}

getPreviewText(): string {
  if (!this.editableGuideText) return '';
  
  return this.editableGuideText
    .replace(/{{role}}/g, this.currentUser.role || '')
    .replace(/{{username}}/g, this.currentUser.username || '')
    .replace(/\n/g, '<br>');
}

}