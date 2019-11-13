import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FeatureModelComponent } from './feature-model.component';

describe('FeatureModelComponent', () => {
  let component: FeatureModelComponent;
  let fixture: ComponentFixture<FeatureModelComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FeatureModelComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FeatureModelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
