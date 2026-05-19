import { PLATFORM_ID, ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { NgOptimizedImage, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Sidebar } from '../../components/sidebar/sidebar';
import { UploadContainer } from '../../components/upload-container/upload-container';
import { FolderPreview } from '../../components/folder-preview/folder-preview';
import { FileService, FileItem } from '../../services/file.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [Sidebar, UploadContainer, NgOptimizedImage, FolderPreview],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Home implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private fileService = inject(FileService);
  private router = inject(Router);

  files = signal<FileItem[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  deleteMode = signal(false);
  draggedFileId = signal<string | null>(null);

  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private longPressTriggered = false;

  async ngOnInit() {
    await this.loadFiles();
  }

  async loadFiles() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.fileService.getFiles().subscribe({
      next: (formattedFiles) => {
        this.files.set(formattedFiles);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Errore caricamento file:', err);
        this.error.set('Impossibile caricare i file');
        this.loading.set(false);
      }
    });
  }

  openQuiz(fileId: string) {
    this.router.navigate(['/quiz', fileId]);
  }

  handleFile(file: File) {
    // Reset stato
    this.error.set(null);
    this.loading.set(true);

    this.fileService.handleFile(
      file,
      () => {
        this.loading.set(false);
        this.loadFiles();
      },
      (msg) => {
        this.loading.set(false);
        this.error.set(msg);
      }
    );
  }
 
  onFolderPointerDown(e: PointerEvent, fileId: string) {
    // su touch evita long-press menu/scroll selection
    if (e.pointerType === 'touch') {
      e.preventDefault();
    }

    this.longPressTriggered = false;

    this.longPressTimer = setTimeout(() => {
      this.longPressTriggered = true;
      this.deleteMode.set(true);
    }, 450);
  }

  onFolderPointerUpOrCancel() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  onFolderClick(fileId: string) {
    // se long press è attivo o siamo in delete mode, non apre il quiz
    if (this.longPressTriggered || this.deleteMode()) return;
    this.openQuiz(fileId);
  }

  onFolderDragStart(ev: DragEvent, fileId: string) {
    if (!this.deleteMode()) return;

    this.draggedFileId.set(fileId);
    ev.dataTransfer?.setData('text/plain', fileId);
    ev.dataTransfer?.setDragImage?.((ev.target as HTMLElement), 40, 40);
  }

  onFolderDragEnd() {
    this.draggedFileId.set(null);
  }

  onTrashDragOver(ev: DragEvent) {
    ev.preventDefault();
  }

  deleteFile(id: string) {
    this.fileService.deleteFile(id).subscribe({
      next: () => {
        this.files.update(list => list.filter(f => f.id !== id));
      },
      error: () => {
        this.error.set('Impossibile eliminare il file');
      }
    });
  }

  onTrashDrop(ev: DragEvent) {
    ev.preventDefault();

    const fromDt = ev.dataTransfer?.getData('text/plain');
    const id = this.draggedFileId() ?? fromDt ?? null;

    if (id) {
      this.deleteFile(id);
    }

    this.draggedFileId.set(null);
    this.deleteMode.set(false);
  }

  exitDeleteMode() {
    this.draggedFileId.set(null);
    this.deleteMode.set(false);
  }

  onKeydown(ev: KeyboardEvent) {
    if (ev.key === 'Escape' && this.deleteMode()) {
      this.exitDeleteMode();
    }
  }
}
