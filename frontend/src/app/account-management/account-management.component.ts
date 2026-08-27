import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiCallerService } from '../services/api-caller.service';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-account-management',
  templateUrl: './account-management.component.html',
  styleUrl: './account-management.component.css',
  standalone: false,
})
export class AccountManagementComponent {
  error: string = '';

  user = {
    email: "N/A",
    employeeNo: "N/A",
    firstName: "N/A",
    id: 1,
    lastName: "N/A",
    role: "N/A",
    status: "N/A",
    username: "N/A"
  };

  resetForm: FormGroup;
  userForm: FormGroup;

  submitted: boolean = false;

  ngOnInit(): void {
    this.getCurrentUser();
  }

  constructor(private fb: FormBuilder, private router: Router, private api_caller: ApiCallerService) {
    // Initialize forms without user data first
    this.resetForm = this.fb.group({
      currentPassword: ['', [Validators.required, Validators.minLength(6)]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(6)]]
    });

    // Initialize userForm with empty values - will be populated after user data is fetched
    this.userForm = this.fb.group({
      email: ['', [Validators.required, Validators.email, this.steinelEmailValidator]],
      employeeNo: ['', [Validators.required, Validators.pattern(/^[0-9]+$/)]],
      firstName: ['', [Validators.required, Validators.pattern(/^[a-zA-ZĂÂÎȘȚăâîșț\s\-]+$/)]],
      lastName: ['', [Validators.required, Validators.pattern(/^[a-zA-ZĂÂÎȘȚăâîșț\s\-]+$/)]],
      role: [{ value: '', disabled: true }],
      status: [{ value: '', disabled: true }],
      username: [{ value: '', disabled: true }]
    });
  }

  resetPassword() {
    if (this.resetForm.value.newPassword !== this.resetForm.value.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    const username = localStorage.getItem(environment.usernameKey);
    this.api_caller.resetPassword(username, this.resetForm.value.currentPassword, this.resetForm.value.newPassword).subscribe({
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
          this.error = 'Action has failed!';
        }
      }
    });
  }

  saveChanges() {
    if (this.userForm.valid) {
      const username = localStorage.getItem(environment.usernameKey);
      this.api_caller.updateUserInfo(username, this.userForm.value.firstName, this.userForm.value.lastName, this.userForm.value.email, this.userForm.value.employeeNo).subscribe({
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
            this.error = 'Action has failed!';
          }
        }
      });
    }

    this.submitted = true;
  }

  steinelEmailValidator(control: AbstractControl) {
    const email = control.value;
    const pattern = /^[a-zA-Z0-9._%+-]+@steinel\.(ro|ch|de|md|cz)$/;
    return pattern.test(email) ? null : { invalidSteinelEmail: true };
  }

  getCurrentUser(): void {
    this.api_caller.getUser().subscribe(response => {  
      console.log(response);

      // Update user object
      this.user.firstName = response.firstName;
      this.user.lastName = response.lastName;
      this.user.email = response.email;
      this.user.employeeNo = response.employeeNo;
      this.user.username = response.username;
      this.user.role = response.role;
      this.user.status = response.status;

      // Update form values with fetched user data
      this.userForm.patchValue({
        email: response.email,
        employeeNo: response.employeeNo,
        firstName: response.firstName,
        lastName: response.lastName,
        role: response.role,
        status: response.status,
        username: response.username
      });
    });
  }
}