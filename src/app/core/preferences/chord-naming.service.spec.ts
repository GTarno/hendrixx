import { TestBed } from '@angular/core/testing';
import { ChordLibraryService } from '../chords/chord-library.service';
import { ChordNamingService } from './chord-naming.service';

describe('ChordNamingService', () => {
  it('alterna entre cifra e português (RN8)', () => {
    const naming = TestBed.inject(ChordNamingService);
    const am = TestBed.inject(ChordLibraryService).byId('Am');
    if (!am) throw new Error('Am fora do catálogo');
    expect(naming.naming()).toBe('cifra');
    expect([naming.label(am), naming.altLabel(am)]).toEqual(['Am', 'Lá menor']);
    naming.toggle();
    expect([naming.label(am), naming.altLabel(am)]).toEqual(['Lá menor', 'Am']);
    naming.set('cifra');
    expect(naming.naming()).toBe('cifra');
  });
});
