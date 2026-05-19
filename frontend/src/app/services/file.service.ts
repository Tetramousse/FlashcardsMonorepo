import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { map, Observable, tap } from 'rxjs';
import { environment } from '../environments/environment.local';

export interface FileItem {
  id: string;
  name: string;
  preview: string;
  displayName: string;
  fullName: string;
}

@Injectable({
  providedIn: 'root',
})
export class FileService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = `${environment.apiBaseUrl}/files`;

  getFiles(): Observable<FileItem[]> {
    return this.http.get<Omit<FileItem, 'displayName' | 'fullName'>[]>(this.apiUrl).pipe(
      map(response => response.map(file => {
        const fullName = file.name
          .replace(/\.pdf$/i, '')
          .replace(/_/g, ' ');

        const displayName =
          fullName.length > 20 ? fullName.substring(0, 20) + '...' : fullName;

        return { ...file, fullName, displayName };
      }))
    );
  }

  deleteFile(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  uploadFile(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('name', file.name);
    formData.append('file', file);

    return this.http.post(this.apiUrl, formData);
  }

  handleFile(file: File, onSuccess?: () => void, onError?: (message: string) => void): void {
    this.uploadFile(file).subscribe({
      next: (response) => {
        console.log('Upload ok:', response);
        if (onSuccess) {
          onSuccess();
        }
      },
      error: (error) => {
        console.error(error);
        // Estrae il messaggio di errore dal backend o usa uno default
        const msg = error.error?.detail || error.message || 'Errore durante il caricamento';
        if (onError) {
          onError(msg);
        }
      }
    });
  }
}
