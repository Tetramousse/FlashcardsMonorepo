import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase.config';

export const authGuard: CanActivateFn = (): Promise<boolean | UrlTree> | boolean => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const firebaseAuth = auth;

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  if (!firebaseAuth) {
    return Promise.resolve(router.createUrlTree(['/auth']));
  }

  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      unsubscribe();
      if (user) {
        resolve(true);
      } else {
        resolve(router.createUrlTree(['/auth']));
      }
    });
  });
};