import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadContainer } from './upload-container';

describe('UploadContainer', () => {
  let component: UploadContainer;
  let fixture: ComponentFixture<UploadContainer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UploadContainer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UploadContainer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
