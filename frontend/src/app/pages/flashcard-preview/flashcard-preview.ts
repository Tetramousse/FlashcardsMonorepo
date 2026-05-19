import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Flashcard } from '../../components/flashcard/flashcard';

@Component({
  selector: 'app-flashcard-preview',
  standalone: true,
  imports: [Flashcard],
  template: `
    <div class="d-flex align-items-center justify-content-center min-vh-100 bg-light p-4">
      <div class="w-100 d-flex flex-column align-items-center gap-4">
        <h1 class="mb-4">Anteprima Flashcard</h1>
        
        <app-flashcard
          [question]="question()"
          [answer]="answer()"
          [isFlipped]="isFlipped()"
          (flip)="toggleFlip()"
          (rate)="handleRate($event)"
        />

        <div class="mt-4 text-center">
          <p class="text-muted">Clicca sulla carta per girarla</p>
          <p class="text-muted">Valutazione ricevuta: <strong>{{ lastRating() || 'nessuna' }}</strong></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlashcardPreview {
  question = signal<string>('Qual è la capitale della Francia?');
  answer = signal<string>('Parigi');
  isFlipped = signal<boolean>(false);
  lastRating = signal<number | null>(null);

  toggleFlip() {
    this.isFlipped.update(value => !value);
  }

  handleRate(rating: number) {
    this.lastRating.set(rating);
    console.log('Rating ricevuto:', rating);
  }
}
