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
import { PracticeDraftService, formatDuration, stopText } from './practice-draft.service';
import { TapTempo } from './tap-tempo';

const ORDER_LABELS: Record<PracticeOrder, string> = {
  sequential: 'Sequencial',
  random: 'Aleatória',
  pingpong: 'Ping-pong',
};

/** Tela 1: montar treino (docs/wireframes.md). */
@Component({
  selector: 'app-practice-setup-page',
  imports: [ChordDiagramComponent],
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

  protected readonly summary = computed(() => {
    const chords = this.draft.chords();
    if (!chords.length) return 'Nenhum acorde escolhido';
    const n = this.draft.beatsPerChord();
    return [
      chords.map((c) => this.naming.label(c)).join(' → '),
      `${this.draft.bpm()} bpm`,
      `${n} ${n === 1 ? 'tempo' : 'tempos'}`,
      ORDER_LABELS[this.draft.order()].toLowerCase(),
      `≈ ${formatDuration(this.draft.cycleSeconds())} por ciclo`,
      stopText(this.draft.stop(), this.draft.cycleSeconds()),
    ].join(' · ');
  });

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
    const errors = this.session.start(this.draft.config());
    if (!errors.length) void this.router.navigate(['/treino']);
  }
}
