import { Injectable, signal } from '@angular/core';
import { Chord, ChordNaming, chordLabel } from '../models';

/** Nomenclatura escolhida (RN8): cifra (C) ou português (Dó). Vale para todas as telas. */
@Injectable({ providedIn: 'root' })
export class ChordNamingService {
  private readonly current = signal<ChordNaming>('cifra');

  readonly naming = this.current.asReadonly();

  set(naming: ChordNaming): void {
    this.current.set(naming);
  }

  toggle(): void {
    this.current.update((n) => (n === 'cifra' ? 'pt' : 'cifra'));
  }

  /** Nome no modo escolhido. */
  label(chord: Chord): string {
    return chordLabel(chord, this.current());
  }

  /** Nome no outro modo, para mostrar menor ao lado. */
  altLabel(chord: Chord): string {
    return chordLabel(chord, this.current() === 'cifra' ? 'pt' : 'cifra');
  }
}
