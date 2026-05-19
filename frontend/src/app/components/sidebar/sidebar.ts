import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { getAuth } from 'firebase/auth';

interface FileItem {
  id: number;
  name: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Sidebar {
  private http = inject(HttpClient);
  private router = inject(Router);

  async openRandomQuiz() {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      return;
    }

    try {
      const token = await user.getIdToken();
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      
      this.http.get<FileItem[]>('http://localhost:9090/api/v1/files', { headers })
        .subscribe({
          next: (files) => {
            if (files.length === 0) {
              this.router.navigate(['/']);
              return;
            }
            const randomFile = files[Math.floor(Math.random() * files.length)];
            this.router.navigate(['/quiz', randomFile.id]);
          },
          error: (err) => {
            console.error('Errore caricamento file:', err);
          }
        });
    } catch (err) {
      console.error('Errore:', err);
    }
  }
}
