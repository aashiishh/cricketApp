import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  browserLocalPersistence,
  ConfirmationResult,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  RecaptchaVerifier,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  updateProfile,
  User
} from 'firebase/auth';
import { BehaviorSubject, from, Observable, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AppUser, UserProfile, UserRole } from '../models/app-user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly userStorageKey = 'cricketAppUser';
  private logoutTimer: ReturnType<typeof setTimeout>;
  private readonly _user = new BehaviorSubject<AppUser>(null);
  private readonly firebaseApp: FirebaseApp;
  private readonly firebaseAuth: Auth;
  private recaptchaVerifier: RecaptchaVerifier;
  private phoneConfirmation: ConfirmationResult;

  constructor(private http: HttpClient, private router: Router) {
    this.firebaseApp = getApps().length ? getApp() : initializeApp(environment.firebase);
    this.firebaseAuth = getAuth(this.firebaseApp);
    setPersistence(this.firebaseAuth, browserLocalPersistence).catch(error => {
      console.warn('Unable to set auth persistence', error);
    });
  }

  get user() {
    return this._user.asObservable();
  }

  get currentUser() {
    return this._user.value;
  }

  get isLoggedIn() {
    return !!this.currentUser && new Date(this.currentUser.tokenExpirationDate) > new Date();
  }

  get token() {
    return this.isLoggedIn ? this.currentUser.idToken : null;
  }

  get role(): UserRole {
    return this.currentUser?.role ?? 'player';
  }

  get canManageRoles() {
    return this.role === 'super-admin';
  }

  get canManagePlayers() {
    return this.role === 'super-admin' || this.role === 'admin';
  }

  get canManageMatches() {
    return this.role === 'super-admin' || this.role === 'admin';
  }

  register(email: string, password: string, displayName: string) {
    if (!environment.firebase.apiKey) {
      return throwError(() => new Error('Firebase API key is missing in environment configuration.'));
    }

    return from(createUserWithEmailAndPassword(this.firebaseAuth, email, password)).pipe(
      switchMap(credential => from(updateProfile(credential.user, { displayName })).pipe(map(() => credential.user))),
      switchMap(firebaseUser => this.createUserProfile(firebaseUser, displayName || email.split('@')[0])),
      tap(user => this.setUser(user)),
      catchError(error => this.handleAuthError(error))
    );
  }

  login(email: string, password: string) {
    return from(signInWithEmailAndPassword(this.firebaseAuth, email, password)).pipe(
      switchMap(credential => this.ensureUserProfile(credential.user)),
      tap(user => this.setUser(user)),
      catchError(error => this.handleAuthError(error))
    );
  }

  signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return from(signInWithPopup(this.firebaseAuth, provider)).pipe(
      switchMap(credential => this.ensureUserProfile(credential.user)),
      tap(user => this.setUser(user)),
      catchError(error => this.handleAuthError(error))
    );
  }

  initPhoneVerifier(containerId: string) {
    if (this.recaptchaVerifier) {
      return;
    }

    this.recaptchaVerifier = new RecaptchaVerifier(this.firebaseAuth, containerId, {
      size: 'invisible'
    });
  }

  sendPhoneOtp(phoneNumber: string) {
    if (!this.recaptchaVerifier) {
      return throwError(() => new Error('Phone verification is not ready. Please try again.'));
    }

    return from(signInWithPhoneNumber(this.firebaseAuth, phoneNumber, this.recaptchaVerifier)).pipe(
      tap(confirmation => {
        this.phoneConfirmation = confirmation;
      }),
      catchError(error => this.handleAuthError(error))
    );
  }

  verifyPhoneOtp(code: string) {
    if (!this.phoneConfirmation) {
      return throwError(() => new Error('Please request an OTP first.'));
    }

    return from(this.phoneConfirmation.confirm(code)).pipe(
      switchMap(credential => this.ensureUserProfile(credential.user)),
      tap(user => this.setUser(user)),
      catchError(error => this.handleAuthError(error))
    );
  }

  autoLogin() {
    const storedUser = localStorage.getItem(this.userStorageKey);
    if (storedUser) {
      const user = JSON.parse(storedUser) as AppUser;
      const expiresIn = new Date(user.tokenExpirationDate).getTime() - new Date().getTime();
      if (expiresIn > 0) {
        this._user.next(user);
        this.setAutoLogout(expiresIn);
      } else {
        this.clearSession(false);
      }
    }

    onAuthStateChanged(this.firebaseAuth, firebaseUser => {
      if (!firebaseUser) {
        this.clearSession(false);
        return;
      }

      this.ensureUserProfile(firebaseUser).subscribe({
        next: user => this.setUser(user),
        error: () => this.clearSession(false)
      });
    });
  }

  logout(redirect = true) {
    signOut(this.firebaseAuth).finally(() => this.clearSession(redirect));
  }

  hasAnyRole(roles: UserRole[]) {
    return roles.includes(this.role);
  }

  fetchUserProfiles() {
    if (!this.token) {
      return throwError(() => new Error('Please sign in again.'));
    }

    return this.http.get<{[uid: string]: UserProfile}>(
      `${environment.firebase.databaseUrl}/Users.json?auth=${this.token}`
    ).pipe(
      map(usersData => Object.keys(usersData ?? {}).map(uid => ({
        ...usersData[uid],
        uid: usersData[uid].uid || uid
      })))
    );
  }

  updateUserRole(uid: string, role: UserRole) {
    if (!this.canManageRoles || !this.token) {
      return throwError(() => new Error('Only Super Admin can update user roles.'));
    }

    return this.http.patch(
      `${environment.firebase.databaseUrl}/Users/${uid}.json?auth=${this.token}`,
      {
        role,
        updatedAt: new Date().toISOString()
      }
    );
  }

  updateCurrentUserProfile(update: Partial<UserProfile>) {
    if (!this.currentUser || !this.token || !this.firebaseAuth.currentUser) {
      return throwError(() => new Error('Please sign in again.'));
    }

    const updatedProfile: UserProfile = {
      uid: this.currentUser.uid,
      email: update.email ?? this.currentUser.email,
      phone: update.phone ?? this.currentUser.phone,
      displayName: update.displayName ?? this.currentUser.displayName,
      photoUrl: update.photoUrl ?? this.currentUser.photoUrl,
      role: this.currentUser.role,
      playerId: update.playerId ?? this.currentUser.playerId,
      createdAt: this.currentUser.createdAt,
      updatedAt: new Date().toISOString()
    };

    return this.saveUserProfile(updatedProfile, this.token).pipe(
      switchMap(() => this.buildUser(this.firebaseAuth.currentUser, updatedProfile, this.token)),
      tap(user => this.setUser(user))
    );
  }

  private createUserProfile(firebaseUser: User, displayName: string) {
    return from(firebaseUser.getIdToken()).pipe(
      switchMap(idToken => {
        const now = new Date().toISOString();
        const profile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? '',
          phone: firebaseUser.phoneNumber ?? '',
          displayName: displayName || firebaseUser.displayName || firebaseUser.phoneNumber || 'Player',
          photoUrl: firebaseUser.photoURL ?? '',
          role: 'player',
          createdAt: now,
          updatedAt: now
        };

        return this.saveUserProfile(profile, idToken).pipe(
          switchMap(() => this.buildUser(firebaseUser, profile, idToken))
        );
      })
    );
  }

  private ensureUserProfile(firebaseUser: User): Observable<AppUser> {
    return from(firebaseUser.getIdToken()).pipe(
      switchMap(idToken => this.http.get<UserProfile>(
        `${environment.firebase.databaseUrl}/Users/${firebaseUser.uid}.json?auth=${idToken}`
      ).pipe(
        switchMap(profile => {
          if (profile) {
            return this.buildUser(firebaseUser, profile, idToken);
          }
          return this.createUserProfile(firebaseUser, firebaseUser.displayName || firebaseUser.phoneNumber || 'Player');
        })
      ))
    );
  }

  private saveUserProfile(profile: UserProfile, idToken: string) {
    return this.http.put(
      `${environment.firebase.databaseUrl}/Users/${profile.uid}.json?auth=${idToken}`,
      profile
    );
  }

  private buildUser(firebaseUser: User, profile: UserProfile, idToken?: string): Observable<AppUser> {
    return from(Promise.all([
      idToken ? Promise.resolve(idToken) : firebaseUser.getIdToken(),
      firebaseUser.getIdTokenResult()
    ])).pipe(
      map(([resolvedToken, tokenResult]) => ({
        ...profile,
        idToken: resolvedToken,
        refreshToken: firebaseUser.refreshToken,
        tokenExpirationDate: tokenResult.expirationTime
      }))
    );
  }

  private setUser(user: AppUser) {
    this._user.next(user);
    localStorage.setItem(this.userStorageKey, JSON.stringify(user));
    const expiresIn = new Date(user.tokenExpirationDate).getTime() - new Date().getTime();
    this.setAutoLogout(expiresIn);
  }

  private clearSession(redirect: boolean) {
    this._user.next(null);
    localStorage.removeItem(this.userStorageKey);
    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
    }
    if (redirect) {
      this.router.navigateByUrl('/auth/login');
    }
  }

  private setAutoLogout(duration: number) {
    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
    }
    this.logoutTimer = setTimeout(() => this.logout(), duration);
  }

  private handleAuthError(error: { code?: string; message?: string }) {
    const friendlyMessages: {[key: string]: string} = {
      'auth/account-exists-with-different-credential': 'This email is already linked with another sign-in method.',
      'auth/captcha-check-failed': 'Phone verification failed. Please retry the OTP.',
      'auth/email-already-in-use': 'This email is already registered.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/invalid-phone-number': 'Please enter a valid phone number with country code.',
      'auth/invalid-verification-code': 'The OTP is incorrect.',
      'auth/missing-verification-code': 'Please enter the OTP.',
      'auth/billing-not-enabled': 'Phone OTP requires Firebase billing for real SMS. Please use email/password or Google sign-in.',
      'auth/operation-not-allowed': 'This sign-in method is not enabled for this Firebase project.',
      'auth/popup-closed-by-user': 'Google sign-in was closed before completion.',
      'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
      'auth/user-disabled': 'This account has been disabled.',
      'auth/user-not-found': 'No account found for this email.',
      'auth/wrong-password': 'The password is incorrect.'
    };

    return throwError(() => new Error(friendlyMessages[error?.code] ?? error?.message ?? 'Authentication failed.'));
  }
}
