import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ChordLibraryService } from '../../core/chords/chord-library.service';
import { ChordNamingService } from '../../core/preferences/chord-naming.service';
import { SUGGESTED_PRACTICES, SuggestedPractice } from '../../core/presets/suggested-practices';
import { PracticeDraftService } from './practice-draft.service';

/** Cards de treinos sugeridos: tocar preenche a tela de montar treino, sem iniciar. */
@Component({
  selector: 'app-suggested-practices',
  template: `
    <section class="suggested" aria-labelledby="suggested-title">
      <h2 id="suggested-title">Treinos sugeridos</h2>
      <div class="row">
        @for (s of items(); track s.practice.id) {
          <button
            type="button"
            class="card"
            [attr.aria-pressed]="chosen() === s.practice.id"
            (click)="choose(s.practice)"
          >
            <span class="name">{{ s.practice.name }}</span>
            <span class="chords">{{ s.line }}</span>
            <span class="desc">{{ s.practice.description }}</span>
          </button>
        }
      </div>
      <p class="sr-only" aria-live="polite">{{ announcement() }}</p>
    </section>
  `,
  styles: `
    .suggested {
      display: grid;
      gap: 8px;
      min-width: 0;
    }
    h2 {
      margin: 0;
      font-size: 0.8rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .row {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      padding-bottom: 6px;
      scroll-snap-type: x proximity;
    }
    .card {
      flex: 0 0 auto;
      display: grid;
      gap: 2px;
      width: 190px;
      min-height: 48px;
      padding: 10px 12px;
      border: 2px solid var(--line);
      border-radius: 12px;
      background: var(--surface);
      text-align: left;
      cursor: pointer;
      scroll-snap-align: start;
    }
    .card[aria-pressed='true'] {
      border-color: var(--accent);
      background: var(--accent-soft);
    }
    .name {
      font-weight: 800;
    }
    .chords {
      font: 0.85rem var(--font-mono);
    }
    .desc {
      font-size: 0.8rem;
      color: var(--muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuggestedPracticesComponent {
  private readonly draft = inject(PracticeDraftService);
  private readonly library = inject(ChordLibraryService);
  private readonly naming = inject(ChordNamingService);

  protected readonly chosen = signal<string | null>(null);
  protected readonly announcement = signal('');

  protected readonly items = computed(() =>
    SUGGESTED_PRACTICES.map((practice) => {
      const labels = practice.config.chordIds.map((id) => {
        const chord = this.library.byId(id);
        return chord ? this.naming.label(chord) : id;
      });
      const separator = labels.length === 2 && practice.config.order !== 'random' ? ' ↔ ' : ' → ';
      return { practice, line: `${labels.join(separator)} · ${practice.config.bpm} bpm` };
    }),
  );

  protected choose(practice: SuggestedPractice): void {
    this.draft.load(practice.config);
    this.chosen.set(practice.id);
    this.announcement.set(
      `Treino "${practice.name}" carregado. Ajuste se quiser e toque em Iniciar.`,
    );
  }
}
