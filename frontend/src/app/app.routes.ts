import { Routes } from '@angular/router';
import { Home} from './pages/home/home';
import { Quiz } from './pages/quiz/quiz';
import { Auth } from './pages/auth/auth';
import { authGuard } from './guards/auth-guard';
import { Add } from './pages/add/add';

export const routes: Routes = [
  { path: 'auth', component: Auth },
  { 
    path: '', 
    component: Home, 
    canActivate: [authGuard] 
  },
  { 
    path: 'add', 
    component: Add, 
    canActivate: [authGuard] 
  },
  { 
    path: 'quiz/:fileId', 
    component: Quiz, 
    canActivate: [authGuard] 
  },
  { path: '**', redirectTo: '' }
];
