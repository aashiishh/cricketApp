import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> {
    return this.authService.user.pipe(
      take(1),
      map(user => {
        const isValidSession = !!user && new Date(user.tokenExpirationDate) > new Date();
        if (!isValidSession) {
          return this.router.createUrlTree(['/auth/login'], {
            queryParams: { returnUrl: state.url }
          });
        }

        const allowedRoles = route.data['roles'] as string[] | undefined;
        if (allowedRoles?.length && !allowedRoles.includes(user.role)) {
          return this.router.createUrlTree(['/home']);
        }

        return true;
      })
    );
  }
}
