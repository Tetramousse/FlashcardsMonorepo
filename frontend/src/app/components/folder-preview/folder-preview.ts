import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-folder-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './folder-preview.html',
  styleUrl: './folder-preview.scss',
})
export class FolderPreview {
  @Input() label: string = 'cartella';
  @Input() previewText: string = 'Anteprima contenuto...';
}
