import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CHORD_CATALOG } from '../../core/chords/chord-library.service';
import { CatalogPhase, Chord, StringState } from '../../core/models';
import { ChordDiagramComponent } from '../../shared/chord-diagram/chord-diagram.component';

const PHASES: { value: CatalogPhase; label: string }[] = [
  { value: 1, label: 'Fase 1 · iniciais' },
  { value: 2, label: 'Fase 2 · maiores e menores' },
  { value: 3, label: 'Fase 3 · com sétima' },
  { value: 4, label: 'Fase 4 · variações' },
];

/** Formação em texto, da 6ª para a 1ª corda: "x 3 2 0 1 0". */
export function shapeText(strings: StringState[]): string {
  return strings
    .map((s) => (s.type === 'muted' ? 'x' : s.type === 'open' ? '0' : String(s.fret)))
    .join(' ');
}

/** Dedos em texto, da 6ª para a 1ª corda: "– 3 2 – 1 –". */
export function fingersText(strings: StringState[]): string {
  return strings.map((s) => (s.type === 'fretted' ? String(s.finger) : '–')).join(' ');
}

/**
 * Página de desenvolvimento para conferir os diagramas contra as fontes de estudo (issue #10).
 * Mostra cada acorde nos três tamanhos com formação, dedos e notas em texto ao lado.
 * Só é registrada nas rotas em modo de desenvolvimento.
 */
@Component({
  selector: 'app-chord-review-page',
  imports: [ChordDiagramComponent],
  templateUrl: './chord-review.page.html',
  styleUrl: './chord-review.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChordReviewPage {
  private readonly catalog = inject(CHORD_CATALOG);

  protected readonly phases = PHASES;
  protected readonly phase = signal<CatalogPhase>(1);
  protected readonly chords = computed<Chord[]>(() =>
    this.catalog.filter((c) => c.catalogPhase === this.phase()),
  );
  protected readonly shapeText = shapeText;
  protected readonly fingersText = fingersText;
  protected readonly difficultyText = (d: number) => '●'.repeat(d) + '○'.repeat(3 - d);
}
