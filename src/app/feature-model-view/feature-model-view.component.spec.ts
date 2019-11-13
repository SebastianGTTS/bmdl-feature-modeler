import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FeatureModelViewComponent } from './feature-model-view.component';

describe('FeatureModelViewComponent', () => {
  let component: FeatureModelViewComponent;
  let fixture: ComponentFixture<FeatureModelViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FeatureModelViewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FeatureModelViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
