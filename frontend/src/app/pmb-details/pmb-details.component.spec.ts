import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PmbDetailsComponent } from './pmb-details.component';

describe('PmbDetailsComponent', () => {
  let component: PmbDetailsComponent;
  let fixture: ComponentFixture<PmbDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PmbDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PmbDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
