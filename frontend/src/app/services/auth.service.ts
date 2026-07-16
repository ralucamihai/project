import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface UserInfo {
  username: string;
  role: string;
  firstName: string;
  lastName: string;
  email: string;
  isAuthenticated: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userInfoSubject = new BehaviorSubject<UserInfo>({
    username: '',
    role: '',
    firstName: '',
    lastName: '',
    email: '',
    isAuthenticated: false
  });

  public userInfo$ = this.userInfoSubject.asObservable();

  constructor() {
   
    this.loadUserFromStorage();
  }

  setUserInfo(userInfo: Partial<UserInfo>): void {
    const currentInfo = this.userInfoSubject.value;
    const updatedInfo: UserInfo = {
      ...currentInfo,
      ...userInfo,
      isAuthenticated: true
    };
    
    console.log('Setting user info:', updatedInfo); // Pentru debugging
    this.userInfoSubject.next(updatedInfo);
    
    // Salvează informațiile în localStorage 
    localStorage.setItem('userInfo', JSON.stringify(updatedInfo));
  }

  getUserInfo(): UserInfo {
    return this.userInfoSubject.value;
  }

  getRoleDisplayName(role: string): string {
    if (!role) return 'utilizator';
    
    switch (role.toLowerCase()) {
      case 'vizualizare':
        return 'vizitator';
      case 'editare':
        return 'editor';
      case 'admin':
        return 'admin';
      default:
        return role.toLowerCase();
    }
  }

  logout(): void {
    const userInfo: UserInfo = {
      username: '',
      role: '',
      firstName: '',
      lastName: '',
      email: '',
      isAuthenticated: false
    };
    
    this.userInfoSubject.next(userInfo);
    localStorage.removeItem('userInfo');
  }

  private loadUserFromStorage(): void {
    const savedUserInfo = localStorage.getItem('userInfo');
    if (savedUserInfo) {
      try {
        const userInfo = JSON.parse(savedUserInfo);
        // Verifică dacă există și token-ul de access
        const token = localStorage.getItem('access_token');
        if (token && userInfo.isAuthenticated) {
          this.userInfoSubject.next(userInfo);
        } else {
          // Dacă nu există token, șterge informațiile utilizatorului
          this.logout();
        }
      } catch (error) {
        console.error('Error parsing saved user info:', error);
        localStorage.removeItem('userInfo');
      }
    }
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('access_token');
    const userInfo = this.userInfoSubject.value;
    return !!(token && userInfo.isAuthenticated);
  }

  // Metodă pentru a sincroniza cu starea din ApiCallerService
  syncWithApiCaller(isLoggedIn: boolean): void {
    if (!isLoggedIn) {
      this.logout();
    }
  }
}