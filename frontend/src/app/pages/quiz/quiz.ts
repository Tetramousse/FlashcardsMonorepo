import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { Sidebar } from '../../components/sidebar/sidebar';
import { Flashcard } from '../../components/flashcard/flashcard';
import { QuizService, CardData } from '../../services/quiz.service';

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [Sidebar, Flashcard, RouterLink, NgOptimizedImage],
  templateUrl: './quiz.html',
  styleUrl: './quiz.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Quiz implements OnInit {
  private quizService = inject(QuizService);
  private route = inject(ActivatedRoute);
  
  fileId = signal<string | null>(null);
  cards = signal<CardData[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  
  currentIndex = signal(0);
  isFlipped = signal(false);
  totalScore = signal(0);
  quizFinished = signal(false);

  currentCard = computed(() => this.cards()[this.currentIndex()]);
  isLastCard = computed(() => this.currentIndex() === this.cards().length - 1);

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('fileId');
    if (!id) {
      this.error.set('ID file non valido');
      this.loading.set(false);
      return;
    }
    
    this.fileId.set(id);
    await this.loadFlashcards(id);
  }

  async loadFlashcards(id: string) {
    this.quizService.getFlashcards(id, 20).subscribe({
      next: (response) => {
        this.cards.set(response);
        this.loading.set(false);
        
        if (response.length === 0) {
          this.error.set('Nessuna flashcard trovata per questo file');
        }
      },
      error: (err) => {
        console.error('Errore caricamento flashcard:', err);
        this.error.set(err.error?.detail || 'Errore nel caricamento delle flashcard');
        this.loading.set(false);
      }
    });
  }

  toggleFlip() {
    this.isFlipped.update(v => !v);
  }

  submitScore(points: number) {
    this.totalScore.update(s => s + points);
    this.nextCard();
  }

  nextCard() {
    if (this.isLastCard()) {
      this.quizFinished.set(true);
    } else {
      this.isFlipped.set(false);
      this.currentIndex.update(i => i + 1);
    }
  }

  prevCard() {
    if (this.currentIndex() > 0) {
      this.isFlipped.set(false);
      this.currentIndex.update(i => i - 1);
    }
  }
}
