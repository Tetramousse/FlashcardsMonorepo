import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  Auth,
  User,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { app } from '../firebase.config';
import { isPlatformBrowser } from '@angular/common';
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable, from, switchMap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth: Auth | null = null;
  private platformId = inject(PLATFORM_ID);

  constructor() {
    if (isPlatformBrowser(this.platformId) && app) {
      this.auth = getAuth(app);
    }
  }

  getCurrentUser(): User | null {
    return this.auth?.currentUser ?? null;
  }

  async getAuthToken(): Promise<string | null> {
    if (!this.auth) return null;

    const user = await new Promise<User | null>((resolve) => {
      const unsubscribe = onAuthStateChanged(this.auth!, (u) => {
        unsubscribe();
        resolve(u);
      });
    });

    if (!user) return null;
    return await user.getIdToken();
  }

  onAuthStateChanged(callback: (user: User | null) => void): void {
    if (this.auth) {
      onAuthStateChanged(this.auth, callback);
    }
  }

  async signIn(email: string, password: string): Promise<void> {
    if (!this.auth) throw new Error('Auth not initialized');
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  async signUp(email: string, password: string): Promise<void> {
    if (!this.auth) throw new Error('Auth not initialized');
    await createUserWithEmailAndPassword(this.auth, email, password);
  }

  async signInWithGoogle(): Promise<void> {
    if (!this.auth) throw new Error('Auth not initialized');
    const provider = new GoogleAuthProvider();
    await signInWithPopup(this.auth, provider);
  }

  async signOut(): Promise<void> {
    if (!this.auth) throw new Error('Auth not initialized');
    await signOut(this.auth);
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  
  return from(authService.getAuthToken()).pipe(
    switchMap(token => {
      if (token) {
        const authReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });
        return next(authReq);
      }
      return next(req);
    })
  );
};
