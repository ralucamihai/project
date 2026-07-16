import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PmbDashboardComponent } from './pmb-dashboard.component';

describe('PmbDashboardComponent', () => {
  let component: PmbDashboardComponent;
  let fixture: ComponentFixture<PmbDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PmbDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PmbDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
