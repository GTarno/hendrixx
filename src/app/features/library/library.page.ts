import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChordLibraryService } from '../../core/chords/chord-library.service';
import {
  DIFFICULTY_LABELS,
  QUALITY_LABELS,
  filterChords,
  groupByRoot,
} from '../../core/chords/chord-search';
import { CHORD_QUALITIES, ChordQuality, Difficulty } from '../../core/models';
import { ChordNamingService } from '../../core/preferences/chord-naming.service';
import { ChordDiagramComponent } from '../../shared/chord-diagram/chord-diagram.component';
import { PracticeTabsComponent } from '../../shared/practice-tabs/practice-tabs.component';
import { PracticeDraftService } from '../setup/practice-draft.service';

/** Tela 3: Biblioteca (todos os acordes, com busca e filtros). */
@Component({
  selector: 'app-library-page',
  imports: [ChordDiagramComponent, PracticeTabsComponent, RouterLink],
  templateUrl: './library.page.html',
  styleUrl: './library.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibraryPage {
  private readonly library = inject(ChordLibraryService);
  private readonly draft = inject(PracticeDraftService);
  protected readonly naming = inject(ChordNamingService);

  protected readonly query = signal('');
  protected readonly quality = signal<ChordQuality | null>(null);
  protected readonly difficulty = signal<Difficulty | null>(null);

  protected readonly qualities = CHORD_QUALITIES.map((q) => ({
    value: q,
    label: QUALITY_LABELS[q],
  }));
  protected readonly difficulties = ([1, 2, 3] as const).map((d) => ({
    value: d,
    label: DIFFICULTY_LABELS[d],
  }));

  protected readonly groups = computed(() =>
    groupByRoot(
      filterChords(this.library.all(), {
        query: this.query(),
        quality: this.quality(),
        difficulty: this.difficulty(),
      }),
    ),
  );

  protected readonly count = computed(() =>
    this.groups().reduce((total, g) => total + g.chords.length, 0),
  );

  protected readonly filtered = computed(
    () => !!this.query().trim() || this.quality() !== null || this.difficulty() !== null,
  );

  protected variantCount(id: string): number {
    return this.library.variantsOf(id).length;
  }

  /** Se o acorde (ou uma variação dele) já está no treino montado. */
  protected inPractice(id: string): boolean {
    return this.library.alternativesOf(id).some((c) => this.draft.isSelected(c.id));
  }

  protected search(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected clearFilters(): void {
    this.query.set('');
    this.quality.set(null);
    this.difficulty.set(null);
  }
}
