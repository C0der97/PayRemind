import { TestBed } from '@angular/core/testing';

import { MediatorStorageService } from './mediator-storage.service';

describe('MediatorStorageService', () => {
  let service: MediatorStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MediatorStorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
