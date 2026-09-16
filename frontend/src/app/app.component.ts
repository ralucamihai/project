import { HttpClient } from '@angular/common/http';
import { Component, HostListener } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { ApiCallerService } from './services/api-caller.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  standalone: false
})
export class AppComponent {
  title = 'PMB TEST DASHBOARD';
  language: string = 'ro';
  version: string = '1.0';
  buildDate: string = '2025-08-22';
  currentRoute: string = '';
  isAdmin: boolean = false;

  // Dropdown activ prin CLICK (Settings / Limba)
  activeClickDropdown: string | null = null;

  // Dropdown activ prin HOVER (Mentenanta / Testing / Nomenclatura)
  activeHoverDropdown: string | null = null;

  private isClosing: boolean = false;

  // Limba paginii asa cum e configurata Google Translate (pageLanguage din index.html)
  private readonly pageLanguage: string = 'ro';

  constructor(private router: Router, private http: HttpClient, private api_caller: ApiCallerService) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.urlAfterRedirects;
      });

    // Reacționează instant la login/logout fără să mai fie nevoie de refresh
    this.api_caller.currentUser$.subscribe(user => {
      if (user && user.role) {
        this.isAdmin = user.role.toLowerCase() === 'admin';
      } else {
        this.isAdmin = false;
      }
    });

    // Inițializează utilizatorul la prima deschidere / refresh dacă există token
    if (this.api_caller.getToken()) {
      this.api_caller.getUser().subscribe();
    }
  }

  getEnvironmentVersion() {
    this.api_caller.get_environment_version().subscribe(response => {
      this.buildDate = response.build;
      this.version = response.version;
    });
  }

  ngOnInit() {
    this.getEnvironmentVersion();
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

    // Sincronizeaza dropdown-ul de limba cu limba curenta (daca a fost setata anterior prin cookie)
    const savedLang = this.getLangFromCookie();
    if (savedLang) {
      this.language = savedLang;
    }
  }

  handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      this.isClosing = true;
    } else {
      this.isClosing = false;
    }
  }

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any) {
    if (this.isClosing) {
      const username = String(localStorage.getItem('username'));

      if (username != '') {
        const logoutData = { "username": username };
        this.http.post('http://127.0.0.1:8000/api/logout', logoutData).subscribe(
          (response: any) => {
            console.log(response);
          },
          (error) => {
            console.log(error);
          }
        );
      }
    }
  }

  isAuthenticated() {
    if (localStorage.getItem('authenticated') == "yes") {
      return true;
    } else {
      return false;
    }
  }

  shouldShowNav() {
    if (this.currentRoute != '/login' && this.currentRoute != '/register' && this.currentRoute != '/forgot-password') {
      return true;
    }
    return false;
  }

  // ---- Dropdown pe CLICK (Settings / Limba) ----
  toggleClickDropdown(event: Event, menu: string) {
    event.preventDefault();
    event.stopPropagation();
    this.activeClickDropdown = this.activeClickDropdown === menu ? null : menu;
  }

  closeClickDropdown() {
    this.activeClickDropdown = null;
  }

  isClickMenuOpen(menu: string): boolean {
    return this.activeClickDropdown === menu;
  }

  // ---- Dropdown pe HOVER (Mentenanta / Testing / Nomenclatura) ----
  openHoverDropdown(menu: string) {
    this.activeHoverDropdown = menu;
  }

  closeHoverDropdown(menu: string) {
    if (this.activeHoverDropdown === menu) {
      this.activeHoverDropdown = null;
    }
  }

  isHoverMenuOpen(menu: string): boolean {
    return this.activeHoverDropdown === menu;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    const dropdown = target.closest('.dropdown');
    if (!dropdown) {
      this.closeClickDropdown();
    }
  }

  // =========================================================
  // ---- Google Translate (cookie-based, cu reload) ----
  // =========================================================

  changeLanguage(langCode: string) {
    if (langCode === this.language) {
      return; 
    }

    if (langCode === this.pageLanguage) {
      this.deleteGoogTransCookie();
    } else {
      this.setGoogTransCookie(langCode);
    }

    window.location.reload();
  }

  private setGoogTransCookie(langCode: string) {
    const value = `/${this.pageLanguage}/${langCode}`;
    document.cookie = `googtrans=${value}; path=/`;
  }

  private deleteGoogTransCookie() {
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }

  private getLangFromCookie(): string | null {
    const match = document.cookie.match(/(?:^|;\s*)googtrans=([^;]*)/);
    if (!match) return null;

    const parts = decodeURIComponent(match[1]).split('/').filter(Boolean);
    return parts.length ? parts[parts.length - 1] : null;
  }
}