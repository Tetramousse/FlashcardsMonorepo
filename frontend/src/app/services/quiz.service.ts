import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment.local';

export interface CardData {
  question: string;
  answer: string;
}

@Injectable({
  providedIn: 'root',
})
export class QuizService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/files`;

  getFlashcards(fileId: string, limit: number = 20): Observable<CardData[]> {
    return this.http.post<CardData[]>(
      `${this.apiUrl}/${fileId}/flashcards`,
      { limit }
    );
  }
}
