import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';

@Component({
  selector: 'app-upload-container',
  standalone: true,
  template: `
    <div 
      class="upload-box d-flex flex-column align-items-center justify-content-center text-center p-5 position-relative"
      [class.drag-active]="isDragging()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
      (click)="fileInput.click()"
      (keydown.enter)="fileInput.click()"
      tabindex="0"
      role="button"
      aria-label="Upload Dropzone">

      <ng-content></ng-content>
      
      <input 
        #fileInput
        type="file" 
        class="d-none"
        (change)="onFileSelected($event)" 
        accept=".pdf"
      />

    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .upload-box {
      min-height: 400px;
      border: 2px dashed #343a40;
      border-radius: 24px;
      background-color: transparent;
      transition: all 0.2s ease-in-out;
      cursor: pointer;

      &:hover {
        background-color: rgba(0,0,0, 0.02);
      }

      &.drag-active {
        background-color: rgba(13, 110, 253, 0.05);
        border-color: #0d6efd;
        border-style: solid;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UploadContainer {
  fileDropped = output<File>();
  isDragging = signal(false);

  onDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging.set(false);
    const file = e.dataTransfer?.files[0];
    if (file) this.fileDropped.emit(file);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.fileDropped.emit(input.files[0]);
    }
  }
}