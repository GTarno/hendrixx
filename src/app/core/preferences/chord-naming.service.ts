import { Injectable, signal } from '@angular/core';
import { variantShortName } from '../chords/chord-search';
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

  /** Nome com a variação, quando houver: "F (Simplificado)". */
  fullLabel(chord: Chord): string {
    const variant = variantShortName(chord);
    return variant ? `${this.label(chord)} (${variant})` : this.label(chord);
  }

  /** Nome no outro modo, para mostrar menor ao lado. */
  altLabel(chord: Chord): string {
    return chordLabel(chord, this.current() === 'cifra' ? 'pt' : 'cifra');
  }
}
