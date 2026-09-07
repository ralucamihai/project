import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { ApiCallerService } from './services/api-caller.service';
import { catchError, map, Observable, of } from 'rxjs';
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class apiCallerGuard implements CanActivate {
  constructor(private api_caller: ApiCallerService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.api_caller.getUser().pipe(
      map((user: any) => {
        console.log('User primit în Guard:', user);

        if (!user) {
          localStorage.removeItem(environment.accessTokenKey);
          localStorage.removeItem(environment.usernameKey);
          this.router.navigate(['/login']);
          return false;
        }

        // Verifică dacă ruta cere permisiuni de administrator
        const requiresAdmin = route.data?.['requiresAdmin'];
        
        // Preluăm rolul și îl facem lowercase pentru a evita erorile de tip 'Admin' vs 'admin'
        const userRole = (user.role || '').toLowerCase();

        if (requiresAdmin && userRole !== 'admin') {
          console.warn('Acces interzis: Utilizatorul nu este admin. Rol găsit:', user.role);
          this.router.navigate(['/home']);
          return false;
        }

        return true;
      }),
      catchError((err) => {
        console.error('Eroare în guard la preluarea utilizatorului:', err);
        localStorage.removeItem(environment.accessTokenKey);
        localStorage.removeItem(environment.usernameKey);
        this.router.navigate(['/login']);
        return of(false);
      })
    );
  }
}