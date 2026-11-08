import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ChordLibraryService } from '../../core/chords/chord-library.service';
import { validatePracticeConfig } from '../../core/models';
import { ChordNamingService } from '../../core/preferences/chord-naming.service';
import {
  NAME_MAX_LENGTH,
  PracticeStorageService,
  SavedPractice,
} from '../../core/presets/practice-storage.service';
import { PracticeSessionService } from '../../core/session/practice-session.service';
import { PracticeTabsComponent } from '../../shared/practice-tabs/practice-tabs.component';
import { PracticeDraftService, practiceSummary } from '../setup/practice-draft.service';

interface PracticeView {
  practice: SavedPractice;
  summary: string;
  savedAt: string;
  /** Motivo para não poder iniciar (ex.: acorde fora do catálogo liberado), ou null. */
  problem: string | null;
}

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });

/** Tela 4: Meus treinos (treinos salvos no navegador). */
@Component({
  selector: 'app-my-practices-page',
  imports: [PracticeTabsComponent, RouterLink],
  templateUrl: './my-practices.page.html',
  styleUrl: './my-practices.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyPracticesPage {
  private readonly storage = inject(PracticeStorageService);
  private readonly library = inject(ChordLibraryService);
  private readonly naming = inject(ChordNamingService);
  private readonly session = inject(PracticeSessionService);
  private readonly draft = inject(PracticeDraftService);
  private readonly router = inject(Router);

  protected readonly maxLength = NAME_MAX_LENGTH;
  protected readonly persistent = this.storage.isPersistent;
  protected readonly renaming = signal<string | null>(null);
  protected readonly confirmingDelete = signal<string | null>(null);

  protected readonly items = computed<PracticeView[]>(() =>
    this.storage.practices().map((practice) => {
      const labels = practice.config.chordIds.map((id) => {
        const chord = this.library.byId(id);
        return chord ? this.naming.label(chord) : id;
      });
      const errors = validatePracticeConfig(practice.config, this.library.ids());
      return {
        practice,
        summary: practiceSummary(practice.config, labels),
        savedAt: dateFormat.format(new Date(practice.updatedAt)),
        problem: errors[0]?.message ?? null,
      };
    }),
  );

  /** Inicia no próprio clique (o áudio precisa de um gesto da pessoa). */
  protected start(item: PracticeView): void {
    const config = item.practice.config;
    if (this.session.start(config).length) return;
    this.draft.load(config);
    this.storage.rememberLast(config);
    void this.router.navigate(['/treino']);
  }

  /** Abre o treino na tela de montar, para ajustar antes de começar. */
  protected edit(item: PracticeView): void {
    this.draft.load(item.practice.config);
    void this.router.navigate(['/']);
  }

  protected startRename(id: string): void {
    this.confirmingDelete.set(null);
    this.renaming.set(id);
  }

  protected rename(event: Event, id: string): void {
    event.preventDefault();
    const input = (event.target as HTMLFormElement).elements.namedItem('name') as HTMLInputElement;
    this.storage.rename(id, input.value);
    this.renaming.set(null);
  }

  protected askDelete(id: string): void {
    this.renaming.set(null);
    this.confirmingDelete.set(id);
  }

  protected remove(id: string): void {
    this.storage.remove(id);
    this.confirmingDelete.set(null);
  }
}
