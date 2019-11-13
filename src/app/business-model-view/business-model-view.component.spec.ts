import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BusinessModelViewComponent } from './business-model-view.component';

describe('BusinessModelViewComponent', () => {
  let component: BusinessModelViewComponent;
  let fixture: ComponentFixture<BusinessModelViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BusinessModelViewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BusinessModelViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
