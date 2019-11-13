import { TestBed } from '@angular/core/testing';

import { PouchdbService } from './pouchdb.service';

describe('PouchdbService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: PouchdbService = TestBed.get(PouchdbService);
    expect(service).toBeTruthy();
  });
});
