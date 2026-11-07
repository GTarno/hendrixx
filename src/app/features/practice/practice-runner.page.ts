import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BEATS_PER_BAR, clampBpm } from '../../core/models';
import { ChordNamingService } from '../../core/preferences/chord-naming.service';
import { PracticeSessionService } from '../../core/session/practice-session.service';
import { ChordDiagramComponent } from '../../shared/chord-diagram/chord-diagram.component';
import { formatClock } from '../../shared/time-format';
import { PracticeDraftService } from '../setup/practice-draft.service';

const STATUS_LABELS = {
  idle: 'Parado',
  'count-in': 'Contagem',
  running: 'Tocando',
  paused: 'Pausado',
  finished: 'Concluído',
} as const;

/** Tela 2: treino em andamento e resumo (docs/wireframes.md, telas 2 e 2b). */
@Component({
  selector: 'app-practice-runner-page',
  imports: [ChordDiagramComponent],
  templateUrl: './practice-runner.page.html',
  styleUrl: './practice-runner.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PracticeRunnerPage {
  protected readonly session = inject(PracticeSessionService);
  protected readonly naming = inject(ChordNamingService);
  private readonly draft = inject(PracticeDraftService);
  private readonly router = inject(Router);

  protected readonly beats = Array.from({ length: BEATS_PER_BAR }, (_, i) => i);
  protected readonly status = this.session.status;
  protected readonly statusLabel = computed(() => STATUS_LABELS[this.status()]);
  protected readonly isPlaying = computed(() => ['count-in', 'running'].includes(this.status()));
  protected readonly isActive = computed(() => this.isPlaying() || this.status() === 'paused');

  /** Na contagem (e antes do 1º clique), o destaque é o primeiro acorde, esmaecido. */
  protected readonly counting = computed(() => this.status() === 'count-in');

  /** Acorde do diagrama grande: o atual, ou o primeiro a tocar durante a contagem/pausa. */
  protected readonly stageChord = computed(
    () => this.session.currentChord() ?? this.session.nextChord(),
  );

  /** Texto grande: nome do acorde, número da contagem ou um marcador antes do 1º clique. */
  protected readonly bigText = computed(() => {
    const count = this.session.countInNumber();
    if (count !== null) return String(count);
    const chord = this.session.currentChord();
    if (chord) return this.naming.label(chord);
    return this.status() === 'paused' ? 'Pausado' : '·';
  });

  protected readonly bigAlt = computed(() => {
    const chord = this.session.currentChord();
    if (chord) return this.naming.altLabel(chord);
    if (this.counting()) return 'Contagem';
    const next = this.session.nextChord();
    return this.status() === 'paused' && next ? `Volta em ${this.naming.label(next)}` : '';
  });

  protected readonly stageLabel = computed(() =>
    this.session.currentChord() ? 'Acorde atual' : 'Posicione a mão',
  );

  protected readonly beatLabel = computed(() => {
    const beat = this.session.beatInBar();
    return beat === null ? 'Aguardando o primeiro tempo' : `Tempo ${beat + 1} de ${BEATS_PER_BAR}`;
  });

  /** Anúncio para leitores de tela: só muda na troca de acorde. */
  protected readonly announcement = computed(() => {
    const chord = this.session.currentChord();
    return chord ? `Acorde: ${chord.labelPt}` : '';
  });

  private readonly beatsPerChord = computed(() => this.session.config()?.beatsPerChord ?? 4);

  /** O próximo acorde ganha destaque nos últimos tempos antes da troca. */
  protected readonly changeSoon = computed(() => {
    if (this.counting()) return true;
    const left = this.session.beatsUntilChange();
    const n = this.beatsPerChord();
    return left !== null && (n === 1 || left <= Math.min(2, n - 1));
  });

  /** Progresso até a troca, em %, avançando a cada tempo. */
  protected readonly changeProgress = computed(() => {
    const left = this.session.beatsUntilChange();
    if (left === null) return 0;
    const n = this.beatsPerChord();
    return Math.round(((n - left + 1) / n) * 100);
  });

  protected readonly changeCaption = computed(() => {
    const left = this.session.beatsUntilChange();
    const n = this.beatsPerChord();
    if (n === 1) return 'Troca a cada tempo';
    if (left === null) return `Troca a cada ${n} tempos`;
    return `Troca em ${left} ${left === 1 ? 'tempo' : 'tempos'}`;
  });

  protected readonly cycleText = computed(() => {
    const stop = this.session.config()?.stop;
    const cycle = this.session.cycle() + 1;
    return stop?.type === 'cycles' ? `Ciclo ${cycle} de ${stop.value}` : `Ciclo ${cycle}`;
  });

  protected readonly clockText = computed(() => {
    const stop = this.session.config()?.stop;
    const elapsed = formatClock(this.session.elapsedSeconds());
    return stop?.type === 'minutes' ? `${elapsed} / ${formatClock(stop.value * 60)}` : elapsed;
  });

  protected readonly summaryStats = computed(() => {
    const s = this.session.summary();
    if (!s) return '';
    return [
      `${s.cycles} ${s.cycles === 1 ? 'ciclo' : 'ciclos'}`,
      `${s.changes} ${s.changes === 1 ? 'troca' : 'trocas'}`,
      formatClock(s.elapsedSeconds),
    ].join(' · ');
  });

  protected readonly summaryConfig = computed(() => {
    const chords = this.session.chords().map((c) => this.naming.label(c));
    return `${chords.join(' → ')} · ${this.session.bpm()} bpm`;
  });

  protected readonly fasterBpm = computed(() => clampBpm(this.session.bpm() + 5));

  constructor() {
    // Sair da tela (pelo cabeçalho ou voltar do navegador) encerra o treino em andamento.
    inject(DestroyRef).onDestroy(() => {
      if (this.isActive()) this.session.reset();
    });
  }

  protected togglePause(): void {
    if (this.status() === 'paused') this.session.resume();
    else this.session.pause();
  }

  protected stop(): void {
    this.session.stop();
  }

  protected stepBpm(delta: number): void {
    this.session.setBpm(this.session.bpm() + delta);
  }

  /** Repete o mesmo treino (no próprio clique, por causa do áudio). */
  protected again(bpmDelta = 0): void {
    const config = this.session.config();
    if (!config) return;
    const bpm = clampBpm(this.session.bpm() + bpmDelta);
    this.draft.setBpm(bpm);
    this.session.start({ ...config, bpm });
  }

  protected adjust(): void {
    this.session.reset();
    void this.router.navigate(['/']);
  }
}
