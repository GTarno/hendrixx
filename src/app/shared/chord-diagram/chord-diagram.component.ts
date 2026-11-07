import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Chord } from '../../core/models';
import { VIEWBOX_WIDTH, describeChord, diagramGeometry } from './chord-diagram.geometry';

export type ChordDiagramSize = 'mini' | 'md' | 'lg';

/**
 * Diagrama de acorde em SVG, desenhado a partir dos dados do catálogo.
 *
 * Tamanhos: `mini` (chip, 48 px, só a forma), `md` (próximo acorde, biblioteca) e `lg`
 * (acorde atual, ocupa a largura disponível até 320 px). Sem `showFingers`/`showNotes`
 * explícitos, o tamanho decide: dedos em `md` e `lg`, notas só em `lg`.
 *
 * Cores herdadas do texto (`currentColor`) e ajustáveis pelas variáveis CSS
 * `--chord-ink`, `--chord-fret`, `--chord-dot`, `--chord-dot-ink` e `--chord-muted`.
 */
@Component({
  selector: 'app-chord-diagram',
  templateUrl: './chord-diagram.component.html',
  styleUrl: './chord-diagram.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-size]': 'size()' },
})
export class ChordDiagramComponent {
  readonly chord = input.required<Chord>();
  readonly size = input<ChordDiagramSize>('md');
  readonly showFingers = input<boolean | undefined>(undefined);
  readonly showNotes = input<boolean | undefined>(undefined);

  protected readonly fingersVisible = computed(() => this.showFingers() ?? this.size() !== 'mini');
  protected readonly notesVisible = computed(() => this.showNotes() ?? this.size() === 'lg');
  protected readonly geometry = computed(() => diagramGeometry(this.chord(), this.notesVisible()));
  protected readonly label = computed(() => describeChord(this.chord()));
  protected readonly viewBox = computed(() => `0 0 ${VIEWBOX_WIDTH} ${this.geometry().height}`);
}
