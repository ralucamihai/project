import { Component } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiCallerService } from '../services/api-caller.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
  standalone: false
})
export class RegisterComponent {
  registerForm: FormGroup;
  language: string = 'ro'; // Default language
  version: string = '1.0'; // Version number
  buildDate: string = '2025-08-22'; 
  error: string = '';
  rolEroare: boolean = false;
  submitted: boolean = false;

  roluri = [
    { name: 'Viewer', value: 'Vizualizare' },
    { name: 'Editor', value: 'Editare' },
    { name: 'Admin', value: 'Admin' }
  ];

  departamente = [
    'Administrativ',
    'Aprovizionare',
    'Calitate',
    'Clădiri',
    'Depozit',
    'Logistic',
    'Mentenanță',
    'Producție',
    'Tehnic'
  ];
  
  constructor(private fb: FormBuilder, private router: Router, private api_caller: ApiCallerService) {
    this.registerForm = this.fb.group({
      nume: ['', [Validators.required, Validators.pattern(/^[a-zA-ZĂÂÎȘȚăâîșț\s\-]+$/)]],
      prenume: ['', [Validators.required, Validators.pattern(/^[a-zA-ZĂÂÎȘȚăâîșț\s\-]+$/)]],
      username: [{ value: '', disabled: true }, Validators.required],
      email: ['', [Validators.required, Validators.email, this.steinelEmailValidator]],
      numarMarca: ['', [Validators.required, Validators.pattern(/^[0-9]+$/)]],
      departament: ['', Validators.required],
      rol: this.fb.array([], Validators.required),
      parola: ['', [Validators.required, Validators.minLength(6)]],
      confirmareParola: ['', Validators.required],
      remember: [false]
    }, { validators: this.passwordsMatchValidator });
  }

  getEnvironmentVersion() {
    this.api_caller.get_environment_version().subscribe(response => {        
      this.buildDate = response.build;      
      this.version = response.version;
    });
  }

  ngOnInit() {
    this.registerForm.get('nume')?.valueChanges.subscribe(() => this.updateUsername());
    this.registerForm.get('prenume')?.valueChanges.subscribe(() => this.updateUsername());

    this.getEnvironmentVersion();
  }

  updateUsername(): void {
    const prenume = this.registerForm.get('prenume')?.value || '';
    const nume = this.registerForm.get('nume')?.value || '';

    if (prenume && nume) {
      const username = prenume.charAt(0).toLowerCase() + nume.toLowerCase();
      this.registerForm.get('username')?.setValue(username, { emitEvent: false });
    } else {
      this.registerForm.get('username')?.setValue('', { emitEvent: false });
    }
  }

  passwordsMatchValidator(group: FormGroup) {
    const password = group.get('parola')?.value;
    const confirmPassword = group.get('confirmareParola')?.value;
    return password === confirmPassword ? null : { passwordsMismatch: true };
  }

  steinelEmailValidator(control: AbstractControl) {
    const email = control.value;
    const pattern = /^[a-zA-Z0-9._%+-]+@steinel\.(ro|ch|de|md|cz)$/;
    return pattern.test(email) ? null : { invalidSteinelEmail: true };
  }

  onRolChange(event: any) {
    const rolArray: FormArray = this.registerForm.get('rol') as FormArray;
    const value = event.target.value;

    if (event.target.checked) {
      if (rolArray.length >= 1) {
        event.target.checked = false;
        this.rolEroare = true;
        return;
      }
      rolArray.push(this.fb.control(value));
      this.rolEroare = false;
    } else {
      const index = rolArray.controls.findIndex(ctrl => ctrl.value === value);
      if (index !== -1) {
        rolArray.removeAt(index);
      }
      this.rolEroare = false;
    }
  }

  isRolSelected(value: string): boolean {
    const roluriSelectate = this.registerForm.get('rol')?.value || [];
    return roluriSelectate.includes(value);
  }

  changeLanguage(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    this.language = selectElement.value;
    
  }

  onSubmit() {
   this.submitted = true;

    const rolArray = this.registerForm.get('rol') as FormArray;

    if (rolArray.length !== 1) {
      this.rolEroare = true;
      return; 
    }

    if (this.registerForm.valid) {
      this.rolEroare = false;
      this.error = '';

      const formValues = this.registerForm.getRawValue();
      const { nume, prenume, username, parola, email, numarMarca, departament, rol } = formValues;

      this.api_caller.register(nume, prenume, username, parola, email, numarMarca, departament, rol[0]).subscribe({
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
    } else {
      this.error = 'Te rugăm să completezi corect formularul.';
      this.registerForm.markAllAsTouched();
    }

  }

  goBackToLogin() {
    this.router.navigate(['/login']);
  }
}