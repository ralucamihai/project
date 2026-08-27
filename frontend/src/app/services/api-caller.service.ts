import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiCallerService {
  private apiUrl = environment.apiUrlIP;
  private loggedIn = new BehaviorSubject<boolean>(!!this.getToken());

  constructor(private http: HttpClient) { }

  register(firstName: string, lastName: string, username: string, password: string, email:string, employeeNo:string, role: string): Observable<any> {
    const body = {firstName, lastName, username, password, email, employeeNo, role};
    return this.http.post(`${this.apiUrl}/register`, body);
  }

  approveUser(username: string, role: string, status: string): Observable<any> {
    const body = {username, role, status};
    return this.http.post(`${this.apiUrl}/approve_user`, body);
  }

  login(username: string, password: string): Observable<any> {
    const body = new URLSearchParams();
    body.set('username', username);
    body.set('password', password);
    return this.http.post<any>(`${this.apiUrl}/token`, body.toString(), {
      headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' })
    }).pipe(
      tap(res => {
        if (res.access_token) {
          localStorage.setItem(environment.accessTokenKey, res.access_token);
          localStorage.setItem(environment.usernameKey, username);
          this.loggedIn.next(true);
        }
      })
    );
    
  }
  // --- Metodă nouă pentru sincronizarea util. aprobat în Nomenclator PMB ---
  saveOperatorPmb(operatorData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/nomenclature/utilizatori_pmb`, operatorData);
  }

  resetPassword(username: string | null, currentPassword: string, newPassword: string): Observable<any> {
    const body = {username, currentPassword, newPassword};
    return this.http.post(`${this.apiUrl}/reset_password`, body);
  }

  updateUserInfo(username: string | null, firstName:string, lastName:string, email:string, employeeNo:string): Observable<any> {
    const body = {username, firstName, lastName, email, employeeNo};
    return this.http.post(`${this.apiUrl}/api/update_user_info`, body);
  }

  forgotPassword(email: string): Observable<any> {
    const body = {email};
    return this.http.post(`${this.apiUrl}/forgot_password`, body);
  }

  logout() {
    localStorage.removeItem(environment.accessTokenKey);
    localStorage.removeItem(environment.usernameKey);
    this.loggedIn.next(false);
  }

  getToken(): string | null {
    return localStorage.getItem(environment.accessTokenKey);
  }

  getUsername(): string | null {
    return localStorage.getItem(environment.usernameKey);
  }

  isLoggedIn(): Observable<boolean> {
    return this.loggedIn.asObservable();
  }

  getUser(): Observable<any> {
    return this.http.get(`${this.apiUrl}/user`);
  }

  getAllUsers(): Observable<any> {
    return this.http.get(`${this.apiUrl}/all_users`);
  }

  get_devices_data(): Observable<any> {
    return this.http.get<any[]>(`${this.apiUrl}/get_devices_info`);
  }

  scan_network(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/scan_network`);
  }

  get_global_lp_data(startDate?: string, endDate?: string, productCode?: string): Observable<any> {
    let params = new HttpParams();
    
    if (startDate) {
      params = params.set('startDate', startDate);
    } else {
      params = params.set('startDate', '');
    }

    if (endDate) {
      params = params.set('endDate', endDate);
    } else {
      params = params.set('endDate', '');
    }

    if (productCode) {
      params = params.set('productCode', productCode);
    } else {
      params = params.set('productCode', '');
    }
    
    return this.http.get<any>(`${this.apiUrl}/get_global_lp_data`, { params });
  }

  get_available_dates() {
    return this.http.get<any[]>(`${this.apiUrl}/get_pmb_dashboard_available_dates`);
  }

  get_available_product_codes() {
    return this.http.get<any[]>(`${this.apiUrl}/get_pmb_dashboard_available_product_codes`);
  }

  get_pmb_dashboard_limits(): Observable<any> {
    return this.http.get<any[]>(`${this.apiUrl}/get_pmb_dashboard_limits`);
  }

  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }

  get_environment_version(): Observable<any> {
    return this.http.get<any[]>(`${this.apiUrl}/environment_version`);
  }

  get_specific_dat_file(filename: string): Observable<any[]> {
    const params = new HttpParams().set('filename', filename);
    return this.http.get<any[]>(`${this.apiUrl}/specific_dat_file`, { params });
  }

  getGuideText(): Observable<string> {
    return this.http.get(`${this.apiUrl}/get_guide_text`, { responseType: 'text' })
    .pipe(
      catchError(error => {
        console.error('Error fetching guide text:', error);
        // Return default text instead of error
        return of(`Bine ai venit pe site!
          Pentru a naviga, folosește meniul de sus.
          Poți reseta parola sau administra contul folosind butoanele din secțiunea principală.
          Dacă ai întrebări, nu ezita să folosești butonul de feedback din dreapta jos.

          <strong>Rolul tău:</strong> {{role}}
          <strong>Utilizator:</strong> {{username}}`);
      })
    );
  }

  updateGuideText(text: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/put_guide_text`, 
      { text: text },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
    .pipe(
      catchError(error => {
        console.error('Error updating guide text:', error);
        throw error;
      })
    );
  }
}
