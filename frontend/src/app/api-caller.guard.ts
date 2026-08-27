import { ActivatedRouteSnapshot, CanActivate, CanActivateFn, GuardResult, MaybeAsync, Router, RouterStateSnapshot } from '@angular/router';
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
        if (!user) {
          localStorage.removeItem(environment.accessTokenKey);
          localStorage.removeItem(environment.usernameKey);
          this.router.navigate(['/login']);
          return false;
        }

        // Check if route requires admin role
        const requiresAdmin = route.data?.['requiresAdmin'];
        
        if (requiresAdmin && user.role !== 'Admin') {
          // User is authenticated but not admin, redirect to home or show error
          this.router.navigate(['/home']);
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
    );
  }
};