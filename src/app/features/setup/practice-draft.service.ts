import { Injectable, computed, inject, signal } from '@angular/core';
import { ChordLibraryService } from '../../core/chords/chord-library.service';
import {
  BeatsPerChord,
  DEFAULT_PRACTICE_CONFIG,
  PracticeConfig,
  PracticeOrder,
  STOP_CYCLES_MAX,
  STOP_CYCLES_MIN,
  STOP_MINUTES_MAX,
  STOP_MINUTES_MIN,
  StopCondition,
  clampBpm,
  cycleDurationSeconds,
  validatePracticeConfig,
} from '../../core/models';

/** Formata segundos como "16 s", "2,7 s", "1 min 4 s" ou "2 min". */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    const rounded = Math.round(seconds * 10) / 10;
    return `${String(rounded).replace('.', ',')} s`;
  }
  const total = Math.round(seconds);
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return sec ? `${min} min ${sec} s` : `${min} min`;
}

/** Texto da parada para o resumo. */
export function stopText(stop: StopCondition, cycleSeconds: number): string {
  if (stop.type === 'infinite') return 'sem fim';
  if (stop.type === 'cycles') {
    const word = stop.value === 1 ? 'ciclo' : 'ciclos';
    return `${stop.value} ${word} ≈ ${formatDuration(cycleSeconds * stop.value)}`;
  }
  return `${stop.value} min`;
}

const clampInt = (value: number, min: number, max: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : min;

/**
 * Rascunho do treino montado na tela 1. Fica num serviço para não se perder ao ir para o
 * treino e voltar. A validação e o resumo saem daqui, prontos para a tela.
 */
@Injectable({ providedIn: 'root' })
export class PracticeDraftService {
  private readonly library = inject(ChordLibraryService);

  readonly chordIds = signal<string[]>([...DEFAULT_PRACTICE_CONFIG.chordIds]);
  readonly bpm = signal(DEFAULT_PRACTICE_CONFIG.bpm);
  readonly beatsPerChord = signal<BeatsPerChord>(DEFAULT_PRACTICE_CONFIG.beatsPerChord);
  readonly order = signal<PracticeOrder>(DEFAULT_PRACTICE_CONFIG.order);
  readonly stopType = signal<StopCondition['type']>('infinite');
  readonly stopCycles = signal(3);
  readonly stopMinutes = signal(5);
  readonly countIn = signal(DEFAULT_PRACTICE_CONFIG.countIn);

  readonly stop = computed<StopCondition>(() => {
    const type = this.stopType();
    if (type === 'cycles') return { type, value: this.stopCycles() };
    if (type === 'minutes') return { type, value: this.stopMinutes() };
    return { type };
  });

  readonly config = computed<PracticeConfig>(() => ({
    chordIds: [...this.chordIds()],
    bpm: this.bpm(),
    beatsPerChord: this.beatsPerChord(),
    beatsPerBar: DEFAULT_PRACTICE_CONFIG.beatsPerBar,
    order: this.order(),
    stop: this.stop(),
    countIn: this.countIn(),
  }));

  readonly errors = computed(() => validatePracticeConfig(this.config(), this.library.ids()));
  readonly canStart = computed(() => this.errors().length === 0);

  /** Acordes escolhidos, na ordem do ciclo. */
  readonly chords = computed(() =>
    this.chordIds()
      .map((id) => this.library.byId(id))
      .filter((c) => c !== undefined),
  );

  /** Ciclo como a pessoa vai tocar: a ida e, no ping-pong, a volta (sem as pontas). */
  readonly cycle = computed(() => {
    const forward = this.chords();
    const back = this.order() === 'pingpong' ? forward.slice(1, -1).reverse() : [];
    return { forward, back };
  });

  readonly cycleSeconds = computed(() =>
    this.chordIds().length ? cycleDurationSeconds(this.config()) : 0,
  );

  isSelected(id: string): boolean {
    return this.chordIds().includes(id);
  }

  /** Adiciona ao fim do ciclo ou remove, se já estiver escolhido. */
  toggleChord(id: string): void {
    this.chordIds.update((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  removeChord(id: string): void {
    this.chordIds.update((ids) => ids.filter((x) => x !== id));
  }

  /** Move um acorde dentro do ciclo (−1 = para a esquerda, +1 = para a direita). */
  moveChord(id: string, delta: -1 | 1): void {
    this.chordIds.update((ids) => {
      const from = ids.indexOf(id);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= ids.length) return ids;
      const next = [...ids];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }

  clearChords(): void {
    this.chordIds.set([]);
  }

  resetChords(): void {
    this.chordIds.set([...DEFAULT_PRACTICE_CONFIG.chordIds]);
  }

  /** Aplica o BPM limitado a 30–240 e devolve o valor aplicado. */
  setBpm(bpm: number): number {
    const value = clampBpm(bpm);
    this.bpm.set(value);
    return value;
  }

  stepBpm(delta: number): number {
    return this.setBpm(this.bpm() + delta);
  }

  setStopCycles(value: number): void {
    this.stopCycles.set(clampInt(value, STOP_CYCLES_MIN, STOP_CYCLES_MAX));
  }

  setStopMinutes(value: number): void {
    this.stopMinutes.set(clampInt(value, STOP_MINUTES_MIN, STOP_MINUTES_MAX));
  }
}
