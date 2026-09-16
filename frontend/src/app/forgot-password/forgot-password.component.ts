import { Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiCallerService } from '../services/api-caller.service';
import { environment } from '../../environments/environment'; // Adăugat aici

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {
  forgotPasswordForm: FormGroup;
  language: string = 'ro'; 
  
  // Modificarea este aici: preluăm datele direct din environment
  version: string = environment.version; 
  buildDate: string = environment.buildDate; 
  
  error: string = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private api_caller: ApiCallerService
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [
        Validators.required,
        Validators.email,
        Validators.pattern(/^[a-zA-Z0-9._%+-]+@steinel\.(ro|ch|de|md|cz)$/)
      ]]
    });
  }

  changeLanguage(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    this.language = selectElement.value;
  }

  onSubmit() {
    if (this.forgotPasswordForm.valid) {
      this.api_caller.forgotPassword(this.forgotPasswordForm.value.email).subscribe({
        next: () => {
          this.error = '';
          this.router.navigate(['/login']);
        },
        error: err => {
          if (err.error?.detail) {
            this.error = err.error.detail;
          } else if (typeof err.error === 'string') {
            this.error = err.error;
          } else {
            this.error = 'Înregistrarea a eșuat.';
          }
        }
      });
    }
  }

  goBackToLogin() {
    this.router.navigate(['/login']);
  }

  get f() {
    return this.forgotPasswordForm.controls;
  }
}