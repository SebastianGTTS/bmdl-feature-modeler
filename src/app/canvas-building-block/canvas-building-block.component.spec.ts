import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CanvasBuildingBlockComponent } from './canvas-building-block.component';

describe('CanvasBuildingBlockComponent', () => {
  let component: CanvasBuildingBlockComponent;
  let fixture: ComponentFixture<CanvasBuildingBlockComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CanvasBuildingBlockComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CanvasBuildingBlockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
