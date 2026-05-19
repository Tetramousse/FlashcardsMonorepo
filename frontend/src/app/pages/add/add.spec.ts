import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Add } from './add';
import { Sidebar } from '../../components/sidebar/sidebar';
import { UploadContainer } from '../../components/upload-container/upload-container';

describe('Add', () => {
  let component: Add;
  let fixture: ComponentFixture<Add>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        Add, 
        Sidebar, 
        UploadContainer
      ],
      providers: [
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Add);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});