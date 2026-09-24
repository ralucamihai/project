import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiCallerService } from '../services/api-caller.service';
import { catchError, map, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: false,
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  language: string = 'ro';
  version: string = '1.0';
  buildDate: string = '2025-08-22';
  error: string = '';
  username: string | null = '';
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private api_caller: ApiCallerService,
    private authService: AuthService
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
      remember: [false]
    });
  }

  ngOnInit(): void {
    // Top bar version info
    this.getEnvironmentVersion();

    // Clear previous error message while user types
    this.loginForm.valueChanges.subscribe(() => {
      if (this.error) this.error = '';
    });

    // Validate existing token/session
    this.api_caller.getUser().pipe(
      map((user: any) => {
        if (!user) {
          localStorage.removeItem(environment.accessTokenKey);
          localStorage.removeItem(environment.usernameKey);
          return false;
        }
        return true;
      }),
      catchError(() => {
        localStorage.removeItem(environment.accessTokenKey);
        localStorage.removeItem(environment.usernameKey);
        this.router.navigate(['/login']);
        return of(false);
      })
    ).subscribe();
  }

  getEnvironmentVersion(): void {
    this.api_caller.get_environment_version().subscribe({
      next: (response) => {
        this.buildDate = response.build;
        this.version = response.version;
      },
      error: () => {
        // Optional fallback behavior
        this.buildDate = 'unknown';
        this.version = 'unknown';
      }
    });
  }

  changeLanguage(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.language = selectElement.value;
  }

  onSubmit(): void {
    if (this.loginForm.invalid || this.isLoading) return;

    const { username, password } = this.loginForm.value;
    this.isLoading = true;
    this.error = '';

    this.api_caller.login(username, password).subscribe({
      next: () => {
        this.error = '';
        this.isLoading = false;

        // ensure username is updated for the alreadyAuthenticated() section
        this.username = this.api_caller.getUsername();

        // ✅ navigate immediately
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.error = err?.error?.detail || 'Invalid username or password';
        this.isLoading = false; // critical: allows retry
      }
    });
  }

  private getUserDetails(username: string): void {
    this.api_caller.getUser().subscribe({
      next: (userResponse: any) => {
        this.authService.setUserInfo({
          username: username,
          role: userResponse.role || userResponse.roles || 'Vizualizare',
          firstName: userResponse.firstName || userResponse.first_name || '',
          lastName: userResponse.lastName || userResponse.last_name || '',
          email: userResponse.email || ''
        });

        this.router.navigate(['/home']);
      },
      error: () => {
        // Safe fallback
        this.authService.setUserInfo({
          username: username,
          role: 'Admin'
        });
        this.router.navigate(['/home']);
      }
    });
  }

  onRegister(): void {
    this.router.navigate(['/register']);
  }

  onForgotPassword(): void {
    this.router.navigate(['/forgot-password']);
  }

  alreadyAuthenticated(): boolean {
    const token = this.api_caller.getToken();
    if (token) {
      this.username = this.api_caller.getUsername();
      return true;
    }
    return false;
  }

  accessHomePage(): void {
    this.router.navigate(['/home']);
  }
}
