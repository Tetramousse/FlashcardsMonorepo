import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.html',
  styleUrl: './auth.scss',
})
export class Auth {
  readonly isLoginMode = signal(true);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  email = '';
  password = '';

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  toggleMode(): void {
    this.isLoginMode.update((v) => !v);
    this.error.set(null);
  }

  async submit(): Promise<void> {
    this.error.set(null);
    this.isLoading.set(true);

    try {
      if (this.isLoginMode()) {
        await this.authService.signIn(this.email, this.password);
      } else {
        await this.authService.signUp(this.email, this.password);
      }
      this.router.navigate(['/']);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An error occurred';
      this.error.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  async signInWithGoogle(): Promise<void> {
    this.error.set(null);
    this.isLoading.set(true);

    try {
      await this.authService.signInWithGoogle();
      this.router.navigate(['/']);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An error occurred';
      this.error.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }
}
