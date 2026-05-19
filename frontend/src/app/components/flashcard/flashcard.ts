import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-flashcard',
  standalone: true,
  templateUrl: './flashcard.html',
  styleUrl: './flashcard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Flashcard {
  question = input.required<string>();
  answer = input.required<string>();
  isFlipped = input.required<boolean>();
  
  flip = output<void>();
  rate = output<number>();
}