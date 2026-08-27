import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { apiCallerGuard } from './api-caller.guard';

describe('apiCallerGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => apiCallerGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
