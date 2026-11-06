/**
 * Configuração de um treino. As regras estão em docs/business-rules.md (RN1 a RN7 e D1).
 */

export const BPM_MIN = 30;
export const BPM_MAX = 240;
export const MIN_CHORDS = 2;
/** Compasso fixo 4/4 no MVP (RN5). */
export const BEATS_PER_BAR = 4;
/** Tempos por acorde oferecidos no MVP (decisão D1). */
export const BEATS_PER_CHORD_OPTIONS = [1, 2, 4, 8, 16] as const;
export const STOP_CYCLES_MIN = 1;
export const STOP_CYCLES_MAX = 99;
export const STOP_MINUTES_MIN = 1;
export const STOP_MINUTES_MAX = 60;

export type BeatsPerChord = (typeof BEATS_PER_CHORD_OPTIONS)[number];
export type PracticeOrder = 'sequential' | 'random' | 'pingpong';

export type StopCondition =
  { type: 'infinite' } | { type: 'cycles'; value: number } | { type: 'minutes'; value: number };

export interface PracticeConfig {
  /** Ids do catálogo, na ordem do ciclo. Sem repetição; mínimo de 2. */
  chordIds: string[];
  /** Inteiro de 30 a 240. */
  bpm: number;
  beatsPerChord: BeatsPerChord;
  /** Fixo em 4 no MVP. */
  beatsPerBar: typeof BEATS_PER_BAR;
  order: PracticeOrder;
  stop: StopCondition;
  /** Compasso de contagem antes do primeiro acorde (RN6). */
  countIn: boolean;
}

/** Treino padrão: o "Quarteto básico" do plano. */
export const DEFAULT_PRACTICE_CONFIG: Readonly<PracticeConfig> = Object.freeze<PracticeConfig>({
  chordIds: ['C', 'D', 'E', 'F'],
  bpm: 60,
  beatsPerChord: 4,
  beatsPerBar: BEATS_PER_BAR,
  order: 'sequential',
  stop: { type: 'infinite' },
  countIn: true,
});

export function createPracticeConfig(overrides: Partial<PracticeConfig> = {}): PracticeConfig {
  return {
    ...DEFAULT_PRACTICE_CONFIG,
    chordIds: [...DEFAULT_PRACTICE_CONFIG.chordIds],
    stop: { ...DEFAULT_PRACTICE_CONFIG.stop },
    ...overrides,
  };
}

// ---------- validação ----------

export type PracticeConfigErrorCode =
  | 'bpm-out-of-range'
  | 'bpm-not-integer'
  | 'too-few-chords'
  | 'duplicate-chord'
  | 'unknown-chord'
  | 'invalid-beats-per-chord'
  | 'invalid-beats-per-bar'
  | 'stop-out-of-range';

export interface PracticeConfigError {
  field: keyof PracticeConfig;
  code: PracticeConfigErrorCode;
  message: string;
}

export function isBeatsPerChord(n: number): n is BeatsPerChord {
  return (BEATS_PER_CHORD_OPTIONS as readonly number[]).includes(n);
}

/** Limita e arredonda o BPM para a faixa permitida (RN7). */
export function clampBpm(bpm: number): number {
  if (!Number.isFinite(bpm)) return DEFAULT_PRACTICE_CONFIG.bpm;
  return Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(bpm)));
}

/**
 * Valida uma configuração e devolve todos os erros encontrados (lista vazia = válida).
 * Com `knownChordIds`, também recusa ids que não existem no catálogo.
 */
export function validatePracticeConfig(
  config: PracticeConfig,
  knownChordIds?: ReadonlySet<string>,
): PracticeConfigError[] {
  const errors: PracticeConfigError[] = [];
  const add = (field: keyof PracticeConfig, code: PracticeConfigErrorCode, message: string) =>
    errors.push({ field, code, message });

  if (!Number.isInteger(config.bpm)) {
    add('bpm', 'bpm-not-integer', 'O BPM precisa ser um número inteiro.');
  }
  if (!(config.bpm >= BPM_MIN && config.bpm <= BPM_MAX)) {
    add('bpm', 'bpm-out-of-range', `Use um BPM entre ${BPM_MIN} e ${BPM_MAX}.`);
  }

  if (config.chordIds.length < MIN_CHORDS) {
    add('chordIds', 'too-few-chords', `Escolha pelo menos ${MIN_CHORDS} acordes.`);
  }
  if (new Set(config.chordIds).size !== config.chordIds.length) {
    add('chordIds', 'duplicate-chord', 'Cada acorde entra no treino uma vez só.');
  }
  if (knownChordIds) {
    const unknown = config.chordIds.filter((id) => !knownChordIds.has(id));
    if (unknown.length) {
      add('chordIds', 'unknown-chord', `Acorde fora do catálogo: ${unknown.join(', ')}.`);
    }
  }

  if (!isBeatsPerChord(config.beatsPerChord)) {
    add(
      'beatsPerChord',
      'invalid-beats-per-chord',
      `Tempos por acorde: ${BEATS_PER_CHORD_OPTIONS.join(', ')}.`,
    );
  }
  if (config.beatsPerBar !== BEATS_PER_BAR) {
    add('beatsPerBar', 'invalid-beats-per-bar', 'O compasso é 4/4.');
  }

  const { stop } = config;
  if (stop.type === 'cycles' && !inRange(stop.value, STOP_CYCLES_MIN, STOP_CYCLES_MAX)) {
    add('stop', 'stop-out-of-range', `Parar após ${STOP_CYCLES_MIN} a ${STOP_CYCLES_MAX} ciclos.`);
  }
  if (stop.type === 'minutes' && !inRange(stop.value, STOP_MINUTES_MIN, STOP_MINUTES_MAX)) {
    add(
      'stop',
      'stop-out-of-range',
      `Parar após ${STOP_MINUTES_MIN} a ${STOP_MINUTES_MAX} minutos.`,
    );
  }

  return errors;
}

export function isValidPracticeConfig(
  config: PracticeConfig,
  knownChordIds?: ReadonlySet<string>,
): boolean {
  return validatePracticeConfig(config, knownChordIds).length === 0;
}

function inRange(n: number, min: number, max: number): boolean {
  return Number.isInteger(n) && n >= min && n <= max;
}

// ---------- durações (RN1, RN2, RN3) ----------

/** Duração de um tempo em segundos. */
export function beatDurationSeconds(bpm: number): number {
  return 60 / bpm;
}

/** RN1: a duração do acorde é N tempos; em segundos, depende do BPM. */
export function chordDurationSeconds(
  config: Pick<PracticeConfig, 'bpm' | 'beatsPerChord'>,
): number {
  return config.beatsPerChord * beatDurationSeconds(config.bpm);
}

/** RN3: posições por ciclo. Ping-pong não repete as pontas (2n − 2, mínimo n). */
export function positionsPerCycle(chordCount: number, order: PracticeOrder): number {
  if (order === 'pingpong') return Math.max(chordCount, 2 * chordCount - 2);
  return chordCount;
}

/** RN2: duração de um ciclo completo em segundos. */
export function cycleDurationSeconds(
  config: Pick<PracticeConfig, 'bpm' | 'beatsPerChord' | 'order' | 'chordIds'>,
): number {
  return positionsPerCycle(config.chordIds.length, config.order) * chordDurationSeconds(config);
}
