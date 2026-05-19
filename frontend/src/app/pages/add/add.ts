import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Router } from '@angular/router';
import { Sidebar } from '../../components/sidebar/sidebar';
import { UploadContainer } from '../../components/upload-container/upload-container';
import { FileService } from '../../services/file.service';

@Component({
  selector: 'app-add',
  standalone: true,
  imports: [Sidebar, UploadContainer, NgOptimizedImage],
  templateUrl: './add.html',
  styleUrl: './add.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Add {
  private fileService = inject(FileService);
  private router = inject(Router);
  
  // Signals per lo stato
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  handleFile(file: File) {
    // Reset stato
    this.errorMessage.set(null);
    this.loading.set(true);

    this.fileService.handleFile(
      file,
      () => {
        this.loading.set(false);
        this.router.navigate(['/']);
      },
      (msg) => {
        this.loading.set(false);
        this.errorMessage.set(msg);
      }
    );
  }
}
