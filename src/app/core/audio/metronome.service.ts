import { DestroyRef, Injectable, InjectionToken, inject, signal } from '@angular/core';
import { BEATS_PER_BAR, DEFAULT_PRACTICE_CONFIG, clampBpm } from '../models';
import { SCHEDULER_TIMER } from './scheduler-timer';

/** Janela de agendamento: cliques que caem nos próximos 100 ms são agendados agora. */
export const LOOKAHEAD_S = 0.1;
/** De quanto em quanto tempo o timer acorda o agendador. */
export const SCHEDULER_TICK_MS = 25;
/** Atraso do primeiro clique, para dar tempo de o áudio começar sem cortar o tempo 1. */
export const START_DELAY_S = 0.05;
/** Tempo 1 mais agudo que os demais (RN5). */
export const ACCENT_FREQUENCY_HZ = 1760;
export const BEAT_FREQUENCY_HZ = 1046;
const CLICK_LENGTH_S = 0.07;

export interface ScheduledBeat {
  /** Posição do tempo desde o start(), começando em 0. */
  index: number;
  /** Posição no compasso, de 0 a beatsPerBar − 1. O 0 é o tempo 1. */
  beatInBar: number;
  accent: boolean;
  /** Momento do clique no relógio do AudioContext, em segundos. */
  time: number;
  /** Duração prevista deste tempo em segundos (60 / bpm no momento do agendamento). */
  duration: number;
}

export type BeatListener = (beat: ScheduledBeat) => void;

export const AUDIO_CONTEXT_FACTORY = new InjectionToken<() => AudioContext>(
  'AUDIO_CONTEXT_FACTORY',
  { providedIn: 'root', factory: () => () => new AudioContext() },
);

/**
 * Metrônomo com Web Audio API e agendamento com lookahead.
 *
 * - O clique é um oscilador curto agendado em `AudioContext.currentTime`. Nenhum timer de
 *   JavaScript dispara som.
 * - Um timer curto (SCHEDULER_TICK_MS) acorda o agendador, que agenda tudo o que cai nos
 *   próximos LOOKAHEAD_S segundos.
 * - O AudioContext só é criado no primeiro start(), que deve ser chamado a partir de um gesto
 *   da pessoa (política de autoplay, especialmente no iOS).
 */
@Injectable({ providedIn: 'root' })
export class MetronomeService {
  private readonly createAudioContext = inject(AUDIO_CONTEXT_FACTORY);
  private readonly timer = inject(SCHEDULER_TIMER);

  private readonly running = signal(false);
  private readonly tempo = signal(DEFAULT_PRACTICE_CONFIG.bpm);
  private readonly sounding = signal<ScheduledBeat | null>(null);

  /** Se o metrônomo está tocando. */
  readonly isRunning = this.running.asReadonly();
  /** BPM atual, sempre entre 30 e 240. */
  readonly bpm = this.tempo.asReadonly();
  /** Último tempo que já soou (atualizado a cada acordar do agendador). */
  readonly currentBeat = this.sounding.asReadonly();

  readonly beatsPerBar = BEATS_PER_BAR;

  private context: AudioContext | null = null;
  private output: GainNode | null = null;
  private nextIndex = 0;
  /** Horário do primeiro tempo, ou do último tempo agendado. */
  private anchorTime = 0;
  private upcoming: ScheduledBeat[] = [];
  private pendingClicks: { gain: GainNode; time: number }[] = [];
  private readonly listeners = new Set<BeatListener>();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.dispose());
  }

  /** Começa no tempo 1. Chame a partir de um gesto da pessoa (clique ou toque). */
  start(): void {
    if (this.running()) return;
    const context = this.ensureContext();
    if (context.state === 'suspended') void context.resume();

    this.nextIndex = 0;
    this.anchorTime = context.currentTime + START_DELAY_S;
    this.upcoming = [];
    this.sounding.set(null);
    this.running.set(true);
    this.timer.start(() => this.tick(), SCHEDULER_TICK_MS);
    this.tick();
  }

  /** Para na hora: cliques já agendados que ainda não soaram são cancelados. */
  stop(): void {
    if (!this.running()) return;
    this.running.set(false);
    this.timer.stop();
    this.cancelPendingClicks();
    this.upcoming = [];
    this.sounding.set(null);
  }

  /**
   * Muda o andamento, limitado a 30–240 (RN7). Com o metrônomo tocando, vale a partir do
   * próximo tempo ainda não agendado. Devolve o valor aplicado.
   */
  setBpm(bpm: number): number {
    const value = clampBpm(bpm);
    this.tempo.set(value);
    return value;
  }

  /** Avisa cada tempo no momento em que é agendado (antes de soar). Devolve o cancelamento. */
  onBeat(listener: BeatListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Relógio de áudio em segundos, para animações sincronizadas com o som. */
  audioTime(): number {
    return this.context?.currentTime ?? 0;
  }

  private tick(): void {
    const context = this.context;
    if (!this.running() || !context) return;
    const now = context.currentTime;

    let latest: ScheduledBeat | undefined;
    while (this.upcoming.length && this.upcoming[0].time <= now) latest = this.upcoming.shift();
    if (latest) this.sounding.set(latest);
    this.pendingClicks = this.pendingClicks.filter((click) => click.time > now);

    while (this.running() && this.nextBeatTime() < now + LOOKAHEAD_S) {
      this.scheduleNextBeat(context);
    }
  }

  /**
   * O próximo tempo é calculado com o BPM vigente na hora de agendá-lo. Assim, uma mudança de
   * BPM já vale para o intervalo seguinte ao último clique agendado.
   */
  private nextBeatTime(): number {
    return this.nextIndex === 0 ? this.anchorTime : this.anchorTime + 60 / this.tempo();
  }

  private scheduleNextBeat(context: AudioContext): void {
    const index = this.nextIndex;
    const beatInBar = index % this.beatsPerBar;
    const beat: ScheduledBeat = {
      index,
      beatInBar,
      accent: beatInBar === 0,
      time: this.nextBeatTime(),
      duration: 60 / this.tempo(),
    };
    this.playClick(context, beat.time, beat.accent);
    this.upcoming.push(beat);
    this.anchorTime = beat.time;
    this.nextIndex++;
    for (const listener of this.listeners) listener(beat);
  }

  private playClick(context: AudioContext, time: number, accent: boolean): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.value = accent ? ACCENT_FREQUENCY_HZ : BEAT_FREQUENCY_HZ;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(accent ? 1 : 0.6, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + CLICK_LENGTH_S);
    oscillator.connect(gain);
    gain.connect(this.output ?? context.destination);
    oscillator.start(time);
    oscillator.stop(time + CLICK_LENGTH_S + 0.01);
    this.pendingClicks.push({ gain, time });
  }

  private cancelPendingClicks(): void {
    const now = this.context?.currentTime ?? 0;
    for (const click of this.pendingClicks) if (click.time > now) click.gain.disconnect();
    this.pendingClicks = [];
  }

  private ensureContext(): AudioContext {
    if (!this.context) {
      this.context = this.createAudioContext();
      this.output = this.context.createGain();
      this.output.gain.value = 0.8;
      this.output.connect(this.context.destination);
    }
    return this.context;
  }

  private dispose(): void {
    this.stop();
    this.listeners.clear();
    if (this.context) void this.context.close();
    this.context = null;
    this.output = null;
  }
}
