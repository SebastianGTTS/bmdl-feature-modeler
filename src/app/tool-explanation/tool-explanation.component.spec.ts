import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ToolExplanationComponent } from './tool-explanation.component';

describe('ToolExplanationComponent', () => {
  let component: ToolExplanationComponent;
  let fixture: ComponentFixture<ToolExplanationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ToolExplanationComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ToolExplanationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
