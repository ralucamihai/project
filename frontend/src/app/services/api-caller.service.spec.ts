import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiCallerService {
  private apiUrl = 'http://' + environment.apiUrlIP;
  private accessToken = 'access_token';
  private loggedIn = new BehaviorSubject<boolean>(!!this.getToken());

  constructor(private http: HttpClient) { }

  register(username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/register`, { username, password });
  }

  login(username: string, password: string): Observable<any> {
    const body = new URLSearchParams();
    body.set('username', username);
    body.set('password', password);
    return this.http.post<any>(`${this.apiUrl}/api/token`, body.toString(), {
      headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' })
    }).pipe(
      tap(res => {
        if (res.access_token) {
          localStorage.setItem(this.accessToken, res.access_token);
          this.loggedIn.next(true);
        }
      })
    );
  }

  logout() {
    localStorage.removeItem(this.accessToken);
    this.loggedIn.next(false);
  }

  getToken(): string | null {
    return localStorage.getItem(this.accessToken);
  }

  isLoggedIn(): Observable<boolean> {
    return this.loggedIn.asObservable();
  }

  getUser(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/user`);
  }

  get_devices_data(): Observable<any> {
    return this.http.get<any[]>(`${this.apiUrl}/api/get_devices_info`)
  }

  scan_network(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/api/scan_network`);
  }

  get_global_lp_data(): Observable<any> {
    return this.http.get<any[]>(`${this.apiUrl}/api/get_global_lp_data`)
  }

  get_pmb_dashboard_limits(): Observable<any> {
    return this.http.get<any[]>(`${this.apiUrl}/api/get_pmb_dashboard_limits`)
  }

}