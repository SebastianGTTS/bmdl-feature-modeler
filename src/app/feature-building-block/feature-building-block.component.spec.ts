import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FeatureBuildingBlockComponent } from './feature-building-block.component';

describe('FeatureBuildingBlockComponent', () => {
  let component: FeatureBuildingBlockComponent;
  let fixture: ComponentFixture<FeatureBuildingBlockComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FeatureBuildingBlockComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FeatureBuildingBlockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
