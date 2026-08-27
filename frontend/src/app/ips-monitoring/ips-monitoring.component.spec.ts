import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IpsMonitoringComponent } from './ips-monitoring.component';

describe('IpsMonitoringComponent', () => {
  let component: IpsMonitoringComponent;
  let fixture: ComponentFixture<IpsMonitoringComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IpsMonitoringComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IpsMonitoringComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
