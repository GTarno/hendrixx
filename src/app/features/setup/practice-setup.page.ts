import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ChordLibraryService } from '../../core/chords/chord-library.service';
import {
  BEATS_PER_CHORD_OPTIONS,
  BPM_MAX,
  BPM_MIN,
  BeatsPerChord,
  PracticeOrder,
  STOP_CYCLES_MAX,
  STOP_CYCLES_MIN,
  STOP_MINUTES_MAX,
  STOP_MINUTES_MIN,
  StopCondition,
} from '../../core/models';
import { ChordNamingService } from '../../core/preferences/chord-naming.service';
import { PracticeSessionService } from '../../core/session/practice-session.service';
import { ChordDiagramComponent } from '../../shared/chord-diagram/chord-diagram.component';
import { PracticeStorageService } from '../../core/presets/practice-storage.service';
import { PracticeTabsComponent } from '../../shared/practice-tabs/practice-tabs.component';
import { SavePracticeComponent } from '../../shared/save-practice/save-practice.component';
import {
  ORDER_LABELS,
  PracticeDraftService,
  practiceSummary,
  suggestedName,
} from './practice-draft.service';
import { TapTempo } from './tap-tempo';

/** Tela 1: montar treino (docs/wireframes.md). */
@Component({
  selector: 'app-practice-setup-page',
  imports: [ChordDiagramComponent, PracticeTabsComponent, SavePracticeComponent],
  templateUrl: './practice-setup.page.html',
  styleUrl: './practice-setup.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PracticeSetupPage {
  protected readonly draft = inject(PracticeDraftService);
  protected readonly naming = inject(ChordNamingService);
  private readonly library = inject(ChordLibraryService);
  private readonly session = inject(PracticeSessionService);
  private readonly router = inject(Router);
  private readonly storage = inject(PracticeStorageService);
  private readonly tapTempo = new TapTempo();

  protected readonly available = this.library.main;
  protected readonly beatOptions = BEATS_PER_CHORD_OPTIONS;
  protected readonly orders = Object.entries(ORDER_LABELS) as [PracticeOrder, string][];
  protected readonly limits = {
    bpmMin: BPM_MIN,
    bpmMax: BPM_MAX,
    cyclesMin: STOP_CYCLES_MIN,
    cyclesMax: STOP_CYCLES_MAX,
    minutesMin: STOP_MINUTES_MIN,
    minutesMax: STOP_MINUTES_MAX,
  };

  protected readonly tapHint = signal(`Entre ${BPM_MIN} e ${BPM_MAX} bpm.`);

  /** Primeiro problema que impede começar, para mostrar acima do botão. */
  protected readonly blocker = computed(() => this.draft.errors()[0]?.message ?? null);

  protected readonly suggestedName = computed(() =>
    suggestedName(
      this.draft.config(),
      this.draft.chords().map((c) => c.labelCifra),
    ),
  );

  protected readonly summary = computed(() =>
    practiceSummary(
      this.draft.config(),
      this.draft.chords().map((c) => this.naming.label(c)),
    ),
  );

  protected numberFrom(event: Event): number {
    return Number((event.target as HTMLInputElement).value);
  }

  protected setBpm(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.value === '') return;
    this.draft.setBpm(Number(input.value));
  }

  /** Ao sair do campo, mostra o valor efetivamente aplicado (ex.: 300 → 240). */
  protected commitBpm(event: Event): void {
    const input = event.target as HTMLInputElement;
    const applied = this.draft.setBpm(Number(input.value || this.draft.bpm()));
    input.value = String(applied);
  }

  protected tap(): void {
    const bpm = this.tapTempo.tap(performance.now());
    if (bpm === null) {
      this.tapHint.set('Continue tocando no pulso…');
      return;
    }
    this.draft.setBpm(bpm);
    this.tapHint.set(`Tap tempo: ${bpm} bpm (${this.tapTempo.count} toques).`);
  }

  protected setBeats(value: number): void {
    this.draft.beatsPerChord.set(value as BeatsPerChord);
  }

  protected setStopType(type: StopCondition['type']): void {
    this.draft.stopType.set(type);
  }

  protected setCountIn(event: Event): void {
    this.draft.countIn.set((event.target as HTMLInputElement).checked);
  }

  protected orderPosition(id: string): number {
    return this.draft.chordIds().indexOf(id) + 1;
  }

  /** Inicia no próprio clique (o áudio precisa de um gesto da pessoa) e vai para o treino. */
  protected start(event: Event): void {
    event.preventDefault();
    if (!this.draft.canStart()) return;
    const config = this.draft.config();
    const errors = this.session.start(config);
    if (errors.length) return;
    this.storage.rememberLast(config);
    void this.router.navigate(['/treino']);
  }
}
