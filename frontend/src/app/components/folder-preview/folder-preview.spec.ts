import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FolderPreview } from './folder-preview';

describe('FolderPreview', () => {
  let component: FolderPreview;
  let fixture: ComponentFixture<FolderPreview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FolderPreview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FolderPreview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
