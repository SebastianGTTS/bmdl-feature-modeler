import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FeatureModelDetailComponent } from './feature-model-detail.component';

describe('FeatureModelDetailComponent', () => {
  let component: FeatureModelDetailComponent;
  let fixture: ComponentFixture<FeatureModelDetailComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FeatureModelDetailComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FeatureModelDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
