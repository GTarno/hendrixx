import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ChordLibraryService } from '../../core/chords/chord-library.service';
import {
  DIFFICULTY_LABELS,
  QUALITY_LABELS,
  variantShortName,
} from '../../core/chords/chord-search';
import { Chord } from '../../core/models';
import { ChordNamingService } from '../../core/preferences/chord-naming.service';
import { ChordDiagramComponent } from '../../shared/chord-diagram/chord-diagram.component';
import { PracticeDraftService } from '../setup/practice-draft.service';

/** Detalhe de um acorde da biblioteca: diagrama grande, notas, variações e "Adicionar ao treino". */
@Component({
  selector: 'app-chord-detail-page',
  imports: [ChordDiagramComponent, RouterLink],
  templateUrl: './chord-detail.page.html',
  styleUrl: './chord-detail.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChordDetailPage {
  private readonly library = inject(ChordLibraryService);
  private readonly draft = inject(PracticeDraftService);
  private readonly router = inject(Router);
  protected readonly naming = inject(ChordNamingService);

  /** Id do acorde, vindo da rota `/biblioteca/:id`. */
  readonly id = input.required<string>();

  /** O acorde principal e as variações dele (vazio se o id não existe). */
  protected readonly forms = computed(() => this.library.alternativesOf(this.id()));
  protected readonly chord = computed(() => this.forms()[0] ?? null);

  protected readonly qualityLabels = QUALITY_LABELS;
  protected readonly difficultyLabels = DIFFICULTY_LABELS;
  protected readonly variantName = variantShortName;

  protected inPractice(chord: Chord): boolean {
    return this.draft.isSelected(chord.id);
  }

  /** Leva o acorde (ou a variação) para o fim do ciclo e volta para a montagem do treino. */
  protected add(chord: Chord): void {
    this.draft.addChord(chord.id);
    void this.router.navigate(['/']);
  }
}
