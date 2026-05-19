import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FileService, FileItem } from '../../services/file.service';

import { Home } from './home';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;
  let mockedFiles: FileItem[];

  const fileServiceMock: Pick<FileService, 'getFiles' | 'deleteFile' | 'uploadFile' | 'handleFile'> = {
    getFiles: () => of(mockedFiles),
    deleteFile: () => of(void 0),
    uploadFile: () => of({}),
    handleFile: () => void 0
  };

  const createFile = (overrides: Partial<FileItem> = {}): FileItem => ({
    id: '1',
    name: 'default.pdf',
    preview: 'preview',
    fullName: 'default',
    displayName: 'default',
    ...overrides
  });

  beforeEach(async () => {
    mockedFiles = [];

    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        { provide: FileService, useValue: fileServiceMock }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show upload container when no files are available', () => {
    const upload = fixture.nativeElement.querySelector('app-upload-container');
    const grid = fixture.nativeElement.querySelector('.folder-grid');

    expect(upload).not.toBeNull();
    expect(grid).toBeNull();
  });

  it('should show folder grid and truncated label when files are available', () => {
    mockedFiles = [
      createFile({
        id: 'a1',
        fullName: 'questo nome file e molto lungo',
        displayName: 'questo nome file e mo...'
      })
    ];

    component.loadFiles();
    fixture.detectChanges();

    const upload = fixture.nativeElement.querySelector('app-upload-container');
    const grid = fixture.nativeElement.querySelector('.folder-grid');
    const label = fixture.nativeElement.querySelector('.folder-label');

    expect(upload).toBeNull();
    expect(grid).not.toBeNull();
    expect(label?.textContent?.trim()).toBe('questo nome file e mo...');
  });
});
