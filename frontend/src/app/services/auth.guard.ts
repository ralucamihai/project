import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { ApiCallerService } from '../services/api-caller.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private apiCallerService: ApiCallerService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.apiCallerService.isLoggedIn().pipe(
      take(1),
      map(isLoggedIn => {
        if (isLoggedIn && this.authService.isAuthenticated()) {
          return true;
        } else {
          this.authService.logout();
          this.router.navigate(['/login']);
          return false;
        }
      })
    );
  }
}