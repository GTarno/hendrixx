import {
  Injectable,
  InjectionToken,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { MetronomeService, ScheduledBeat } from '../audio/metronome.service';
import { ChordLibraryService } from '../chords/chord-library.service';
import { Chord, PracticeConfig, PracticeConfigError, validatePracticeConfig } from '../models';
import { RandomSource, SessionBeat, SessionPlanner, SessionSummary } from './session-planner';

/** Fonte de aleatoriedade da ordem aleatória (injetável para testes). */
export const SESSION_RANDOM = new InjectionToken<RandomSource>('SESSION_RANDOM', {
  providedIn: 'root',
  factory: () => Math.random,
});

/**
 * Estados do treino: parado → contagem → tocando ⇄ pausado → fim.
 * `count-in` e `running` são as duas fases de uma sessão ativa.
 */
export type SessionStatus = 'idle' | 'count-in' | 'running' | 'paused' | 'finished';

type Phase = 'idle' | 'active' | 'paused' | 'finished';

/**
 * Sessão de treino: junta a configuração, o catálogo e o metrônomo.
 *
 * Cada tempo é planejado quando o metrônomo o agenda (até ~100 ms antes de soar) e só vira
 * estado da tela quando soa (`MetronomeService.currentBeat`). Assim, troca de acorde, contagem
 * e fim saem do mesmo relógio de áudio que toca o clique.
 */
@Injectable({ providedIn: 'root' })
export class PracticeSessionService {
  private readonly metronome = inject(MetronomeService);
  private readonly library = inject(ChordLibraryService);
  private readonly random = inject(SESSION_RANDOM);

  private readonly phase = signal<Phase>('idle');
  private readonly activeConfig = signal<PracticeConfig | null>(null);
  private readonly activeChords = signal<Chord[]>([]);
  private readonly upcomingIndex = signal(0);
  private readonly lastSummary = signal<SessionSummary | null>(null);

  private planner: SessionPlanner | null = null;
  /** Tempos planejados, pelo índice do metrônomo no trecho atual. */
  private readonly planned = new Map<number, SessionBeat>();
  private pausedSummary: SessionSummary | null = null;

  /** Tempo da sessão que está soando agora, ou `null` antes do primeiro clique. */
  readonly currentBeat = computed<SessionBeat | null>(() => {
    const beat = this.metronome.currentBeat();
    if (this.phase() !== 'active' || !beat) return null;
    return this.planned.get(beat.index) ?? null;
  });

  readonly status = computed<SessionStatus>(() => {
    const phase = this.phase();
    if (phase !== 'active') return phase;
    const beat = this.currentBeat();
    if (beat) return beat.kind === 'count-in' ? 'count-in' : 'running';
    return this.activeConfig()?.countIn ? 'count-in' : 'running';
  });

  /** Configuração do treino em andamento (fixa até parar). */
  readonly config = this.activeConfig.asReadonly();
  /** Acordes do treino, na ordem da lista. */
  readonly chords = this.activeChords.asReadonly();
  /** Resumo do último treino terminado (RN4). */
  readonly summary = this.lastSummary.asReadonly();
  /** BPM atual (pode mudar ao vivo). */
  readonly bpm = this.metronome.bpm;

  /** Acorde em destaque; `null` durante a contagem. */
  readonly currentChord = computed<Chord | null>(() => {
    const beat = this.currentBeat();
    return beat?.kind === 'chord' ? (this.activeChords()[beat.chordIndex] ?? null) : null;
  });

  /** Próximo acorde; na contagem e antes do primeiro clique, o primeiro a tocar. */
  readonly nextChord = computed<Chord | null>(() => {
    const phase = this.phase();
    if (phase !== 'active' && phase !== 'paused') return null;
    const beat = this.currentBeat();
    const chords = this.activeChords();
    if (beat?.kind === 'chord') return chords[beat.nextChordIndex] ?? null;
    if (beat?.kind === 'count-in') return chords[beat.firstChordIndex] ?? null;
    return chords[this.upcomingIndex()] ?? null;
  });

  /** Número da contagem (1 a 4), ou `null` fora dela. */
  readonly countInNumber = computed(() => {
    const beat = this.currentBeat();
    return beat?.kind === 'count-in' ? beat.count : null;
  });

  /** Tempo no compasso (0 = tempo 1), ou `null` sem clique soando. */
  readonly beatInBar = computed(() => {
    const beat = this.currentBeat();
    return beat && beat.kind !== 'end' ? beat.beatInBar : null;
  });

  /** Tempos que faltam para a troca, contando o atual (N no tempo da troca). */
  readonly beatsUntilChange = computed(() => {
    const beat = this.currentBeat();
    const config = this.activeConfig();
    return beat?.kind === 'chord' && config ? config.beatsPerChord - beat.beatInChord : null;
  });

  /** Ciclo atual, a partir de 0. */
  readonly cycle = computed(() => {
    const beat = this.currentBeat();
    return beat?.kind === 'chord' ? beat.cycle : 0;
  });

  /** Tempo de treino no último clique (sem contagem nem pausas). */
  readonly elapsedSeconds = computed(() => {
    const beat = this.currentBeat();
    return beat?.kind === 'chord' ? beat.elapsedSeconds : 0;
  });

  constructor() {
    this.metronome.onBeat((beat) => this.plan(beat));

    // O tempo de chegada (RN4) encerra o treino quando soa.
    effect(() => {
      const beat = this.currentBeat();
      if (beat?.kind === 'end') untracked(() => this.finish(beat.summary));
    });
  }

  /**
   * Valida e começa um treino. Chame a partir de um gesto da pessoa (por causa do áudio).
   * Devolve os erros de validação; com erros, nada começa.
   */
  start(config: PracticeConfig): PracticeConfigError[] {
    const errors = validatePracticeConfig(config, this.library.ids());
    if (errors.length) return errors;

    this.metronome.stop();
    const chords = config.chordIds.map((id) => this.library.byId(id) as Chord);
    this.planner = new SessionPlanner(config, this.random);
    this.planned.clear();
    this.pausedSummary = null;
    this.activeConfig.set(config);
    this.activeChords.set(chords);
    this.upcomingIndex.set(this.planner.upcomingChordIndex);
    this.lastSummary.set(null);
    this.metronome.setBpm(config.bpm);
    this.phase.set('active');
    this.metronome.start();
    return [];
  }

  /** Pausa na hora. Ao continuar, volta ao tempo 1 do acorde atual. */
  pause(): void {
    if (this.phase() !== 'active' || !this.planner) return;
    const now = this.metronome.audioTime();
    const last = this.currentBeat();
    this.pausedSummary = this.planner.summaryAt(last, now);
    this.metronome.stop();
    this.planner.pause(last, now);
    this.planned.clear();
    this.upcomingIndex.set(this.planner.upcomingChordIndex);
    this.phase.set('paused');
  }

  /** Continua um treino pausado (com contagem, se ela estiver ligada). */
  resume(): void {
    if (this.phase() !== 'paused' || !this.planner) return;
    this.planned.clear();
    this.phase.set('active');
    this.metronome.start();
  }

  /** Para o treino e mostra o resumo, como no fim automático. */
  stop(): void {
    const phase = this.phase();
    if (!this.planner || (phase !== 'active' && phase !== 'paused')) return;
    const summary =
      phase === 'paused' && this.pausedSummary
        ? this.pausedSummary
        : this.planner.summaryAt(this.currentBeat(), this.metronome.audioTime());
    this.finish(summary);
  }

  /** Volta ao estado inicial, descartando o treino e o resumo. */
  reset(): void {
    this.metronome.stop();
    this.planner = null;
    this.planned.clear();
    this.pausedSummary = null;
    this.activeConfig.set(null);
    this.activeChords.set([]);
    this.lastSummary.set(null);
    this.phase.set('idle');
  }

  /** Muda o andamento ao vivo (30–240). Devolve o valor aplicado. */
  setBpm(bpm: number): number {
    return this.metronome.setBpm(bpm);
  }

  private plan(beat: ScheduledBeat): void {
    if (this.phase() !== 'active' || !this.planner) return;
    const planned = this.planner.next(beat.time, beat.duration);
    if (planned) this.planned.set(beat.index, planned);
  }

  private finish(summary: SessionSummary): void {
    this.metronome.stop();
    this.planned.clear();
    this.lastSummary.set(summary);
    this.phase.set('finished');
  }
}
