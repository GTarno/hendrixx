import { Injectable, computed, inject, signal } from '@angular/core';
import { ChordLibraryService } from '../../core/chords/chord-library.service';
import { PracticeStorageService } from '../../core/presets/practice-storage.service';
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
  isBeatsPerChord,
  BPM_MAX,
  BPM_MIN,
  PROGRESSION_EVERY_MAX,
  PROGRESSION_EVERY_MIN,
  PROGRESSION_STEP_MAX,
  PROGRESSION_STEP_MIN,
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

export const ORDER_LABELS: Record<PracticeOrder, string> = {
  sequential: 'Sequencial',
  random: 'Aleatória',
  pingpong: 'Ping-pong',
};

/**
 * Resumo do treino em uma linha: "C → D → E → F · 60 bpm · 4 tempos · sequencial ·
 * ≈ 16 s por ciclo · sem fim". `labels` são os nomes dos acordes no modo escolhido.
 */
export function practiceSummary(config: PracticeConfig, labels: string[]): string {
  if (!labels.length) return 'Nenhum acorde escolhido';
  const n = config.beatsPerChord;
  const cycle = cycleDurationSeconds(config);
  return [
    labels.join(' → '),
    `${config.bpm} bpm`,
    `${n} ${n === 1 ? 'tempo' : 'tempos'}`,
    ORDER_LABELS[config.order].toLowerCase(),
    `≈ ${formatDuration(cycle)} por ciclo`,
    stopText(config.stop, cycle),
    ...(config.bpmProgression
      ? [
          `sobe ${config.bpmProgression.stepBpm} bpm a cada ${config.bpmProgression.everyCycles} ${
            config.bpmProgression.everyCycles === 1 ? 'ciclo' : 'ciclos'
          } até ${config.bpmProgression.targetBpm}`,
        ]
      : []),
  ].join(' · ');
}

/** Nome sugerido ao salvar: "C D E F · 60 bpm". */
export function suggestedName(config: PracticeConfig, labels: string[]): string {
  return `${labels.join(' ')} · ${config.bpm} bpm`;
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
  private readonly storage = inject(PracticeStorageService);

  readonly chordIds = signal<string[]>([...DEFAULT_PRACTICE_CONFIG.chordIds]);
  readonly bpm = signal(DEFAULT_PRACTICE_CONFIG.bpm);
  readonly beatsPerChord = signal<BeatsPerChord>(DEFAULT_PRACTICE_CONFIG.beatsPerChord);
  readonly order = signal<PracticeOrder>(DEFAULT_PRACTICE_CONFIG.order);
  readonly stopType = signal<StopCondition['type']>('infinite');
  readonly stopCycles = signal(3);
  readonly stopMinutes = signal(5);
  readonly countIn = signal(DEFAULT_PRACTICE_CONFIG.countIn);
  /** Progressão de BPM (desligada por padrão). */
  readonly progressionOn = signal(false);
  readonly progressionStep = signal(5);
  readonly progressionEvery = signal(2);
  readonly progressionTarget = signal(80);

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
    ...(this.progressionOn()
      ? {
          bpmProgression: {
            stepBpm: this.progressionStep(),
            everyCycles: this.progressionEvery(),
            targetBpm: this.progressionTarget(),
          },
        }
      : {}),
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

  constructor() {
    // Abre como estava no último treino iniciado, se ele ainda for válido.
    const last = this.storage.last();
    if (last && !validatePracticeConfig(last, this.library.ids()).length) this.load(last);
  }

  /**
   * Preenche o rascunho com uma configuração (treino salvo ou sugerido). Acordes que não
   * estão no catálogo liberado ficam de fora; o resto é limitado às faixas válidas.
   */
  load(config: PracticeConfig): void {
    const known = this.library.ids();
    this.chordIds.set(
      config.chordIds.filter((id, i, all) => known.has(id) && all.indexOf(id) === i),
    );
    this.setBpm(config.bpm);
    this.beatsPerChord.set(
      isBeatsPerChord(config.beatsPerChord)
        ? config.beatsPerChord
        : DEFAULT_PRACTICE_CONFIG.beatsPerChord,
    );
    this.order.set(config.order);
    this.stopType.set(config.stop.type);
    if (config.stop.type === 'cycles') this.setStopCycles(config.stop.value);
    if (config.stop.type === 'minutes') this.setStopMinutes(config.stop.value);
    this.countIn.set(config.countIn);
    const p = config.bpmProgression;
    this.progressionOn.set(!!p);
    if (p) {
      this.setProgressionStep(p.stepBpm);
      this.setProgressionEvery(p.everyCycles);
      this.setProgressionTarget(p.targetBpm);
    }
  }

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

  /** Liga a progressão com uma meta acima do BPM atual (+20, até 240). */
  setProgressionOn(on: boolean): void {
    if (on && this.progressionTarget() <= this.bpm()) {
      this.progressionTarget.set(Math.min(BPM_MAX, this.bpm() + 20));
    }
    this.progressionOn.set(on);
  }

  setProgressionStep(value: number): void {
    this.progressionStep.set(clampInt(value, PROGRESSION_STEP_MIN, PROGRESSION_STEP_MAX));
  }

  setProgressionEvery(value: number): void {
    this.progressionEvery.set(clampInt(value, PROGRESSION_EVERY_MIN, PROGRESSION_EVERY_MAX));
  }

  setProgressionTarget(value: number): void {
    this.progressionTarget.set(clampInt(value, BPM_MIN, BPM_MAX));
  }

  setStopMinutes(value: number): void {
    this.stopMinutes.set(clampInt(value, STOP_MINUTES_MIN, STOP_MINUTES_MAX));
  }
}
