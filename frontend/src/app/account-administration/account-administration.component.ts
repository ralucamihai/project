import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-account-administration',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './account-administration.component.html',
  styleUrl: './account-administration.component.css'
})
export class AccountAdministrationComponent {
  

  selectedTheme: string = 'light';
  selectedLanguage: string = 'ro';
  

  successMessage: string = '';
  errorMessage: string = '';


  userInfo = {
    nume: 'Popescu',
    prenume: 'Ion',
    utilizator: 'ipopescu',
    email: 'ipopescu@example.com',
    numarMarca: '12345',
    rolCurent: 'Administrator',
    statusCont: 'Activ',
    dataInregistrarii: '15 Ianuarie 2024'
  };


  onLanguageChange(event: any) {
    this.selectedLanguage = event.target.value;
    console.log('Limba schimbată în:', this.selectedLanguage);
    this.showSuccessMessage(`Limba schimbată în: ${this.selectedLanguage === 'ro' ? 'Română' : 'English'}`);
  }

  // Salvează preferințele
  savePreferences() {
    console.log('Preferințe salvate:', {
      language: this.selectedLanguage
    });
    this.showSuccessMessage(`Preferințele au fost salvate! Limbă: ${this.selectedLanguage === 'ro' ? 'Română' : 'English'}`);
  }

  // Logout
  logout() {
    if (confirm('Ești sigur că vrei să te deconectezi?')) {
      console.log('Utilizatorul s-a deconectat');
      this.showSuccessMessage('Te-ai deconectat cu succes!');
     
    }
  }

 
  showSuccessMessage(message: string) {
    this.successMessage = message;
    this.errorMessage = '';
    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }

 
  showErrorMessage(message: string) {
    this.errorMessage = message;
    this.successMessage = '';
    setTimeout(() => {
      this.errorMessage = '';
    }, 3000);
  }
}