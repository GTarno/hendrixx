import {
  BPM_MAX,
  BPM_MIN,
  DEFAULT_PRACTICE_CONFIG,
  PracticeConfig,
  PracticeConfigErrorCode,
  chordDurationSeconds,
  clampBpm,
  createPracticeConfig,
  cycleDurationSeconds,
  isValidPracticeConfig,
  positionsPerCycle,
  progressionBpm,
  validatePracticeConfig,
} from './practice-config.model';

const codes = (config: PracticeConfig, known?: ReadonlySet<string>): PracticeConfigErrorCode[] =>
  validatePracticeConfig(config, known).map((e) => e.code);

describe('PracticeConfig', () => {
  describe('padrão', () => {
    it('é o quarteto C, D, E, F a 60 bpm, 4 tempos, sequencial, sem fim, com contagem', () => {
      expect(DEFAULT_PRACTICE_CONFIG).toEqual({
        chordIds: ['C', 'D', 'E', 'F'],
        bpm: 60,
        beatsPerChord: 4,
        beatsPerBar: 4,
        order: 'sequential',
        stop: { type: 'infinite' },
        countIn: true,
      });
      expect(isValidPracticeConfig(DEFAULT_PRACTICE_CONFIG)).toBe(true);
    });

    it('createPracticeConfig devolve cópias que não alteram o padrão', () => {
      const config = createPracticeConfig();
      config.chordIds.push('G');
      expect(DEFAULT_PRACTICE_CONFIG.chordIds).toEqual(['C', 'D', 'E', 'F']);
      expect(createPracticeConfig({ bpm: 90 }).bpm).toBe(90);
    });
  });

  describe('BPM (RN7)', () => {
    it.each([
      [29, ['bpm-out-of-range']],
      [30, []],
      [240, []],
      [241, ['bpm-out-of-range']],
      [60.5, ['bpm-not-integer']],
      [Number.NaN, ['bpm-not-integer', 'bpm-out-of-range']],
    ])('bpm %s → %j', (bpm, expected) => {
      expect(codes(createPracticeConfig({ bpm }))).toEqual(expected);
    });

    it('clampBpm limita e arredonda', () => {
      expect(clampBpm(10)).toBe(BPM_MIN);
      expect(clampBpm(300)).toBe(BPM_MAX);
      expect(clampBpm(72.6)).toBe(73);
      expect(clampBpm(Number.NaN)).toBe(60);
    });
  });

  describe('acordes (RN7)', () => {
    it('recusa 1 acorde e aceita 2', () => {
      expect(codes(createPracticeConfig({ chordIds: ['C'] }))).toEqual(['too-few-chords']);
      expect(codes(createPracticeConfig({ chordIds: ['C', 'G'] }))).toEqual([]);
    });

    it('recusa lista vazia', () => {
      expect(codes(createPracticeConfig({ chordIds: [] }))).toEqual(['too-few-chords']);
    });

    it('recusa acorde repetido', () => {
      expect(codes(createPracticeConfig({ chordIds: ['C', 'G', 'C'] }))).toEqual([
        'duplicate-chord',
      ]);
    });

    it('recusa acorde fora do catálogo quando o catálogo é informado', () => {
      const known = new Set(['C', 'D', 'E', 'F']);
      expect(codes(createPracticeConfig(), known)).toEqual([]);
      const errors = validatePracticeConfig(createPracticeConfig({ chordIds: ['C', 'X9'] }), known);
      expect(errors.map((e) => e.code)).toEqual(['unknown-chord']);
      expect(errors[0].message).toContain('X9');
    });
  });

  describe('tempos por acorde e compasso (D1, RN5)', () => {
    it.each([1, 2, 4, 8, 16])('aceita %i tempos', (n) => {
      expect(
        codes(createPracticeConfig({ beatsPerChord: n as PracticeConfig['beatsPerChord'] })),
      ).toEqual([]);
    });

    it.each([0, 3, 5, 6, 12])('recusa %i tempos', (n) => {
      const config = createPracticeConfig({ beatsPerChord: n as PracticeConfig['beatsPerChord'] });
      expect(codes(config)).toEqual(['invalid-beats-per-chord']);
    });

    it('recusa compasso diferente de 4/4', () => {
      const config = { ...createPracticeConfig(), beatsPerBar: 3 } as unknown as PracticeConfig;
      expect(codes(config)).toEqual(['invalid-beats-per-bar']);
    });
  });

  describe('parada (RN4)', () => {
    it.each([
      [{ type: 'infinite' }, []],
      [{ type: 'cycles', value: 1 }, []],
      [{ type: 'cycles', value: 99 }, []],
      [{ type: 'cycles', value: 0 }, ['stop-out-of-range']],
      [{ type: 'cycles', value: 100 }, ['stop-out-of-range']],
      [{ type: 'cycles', value: 2.5 }, ['stop-out-of-range']],
      [{ type: 'minutes', value: 1 }, []],
      [{ type: 'minutes', value: 60 }, []],
      [{ type: 'minutes', value: 61 }, ['stop-out-of-range']],
    ] as [PracticeConfig['stop'], PracticeConfigErrorCode[]][])('%j → %j', (stop, expected) => {
      expect(codes(createPracticeConfig({ stop }))).toEqual(expected);
    });
  });

  it('acumula vários erros', () => {
    const config = createPracticeConfig({
      bpm: 300,
      chordIds: ['C'],
      stop: { type: 'minutes', value: 0 },
    });
    expect(codes(config)).toEqual(['bpm-out-of-range', 'too-few-chords', 'stop-out-of-range']);
  });

  describe('durações (RN1, RN2, RN3)', () => {
    it('4 tempos a 60 bpm = 4 s; a 90 bpm ≈ 2,67 s', () => {
      expect(chordDurationSeconds({ bpm: 60, beatsPerChord: 4 })).toBe(4);
      expect(chordDurationSeconds({ bpm: 90, beatsPerChord: 4 })).toBeCloseTo(2.667, 3);
    });

    it('posições por ciclo conforme a ordem', () => {
      expect(positionsPerCycle(4, 'sequential')).toBe(4);
      expect(positionsPerCycle(4, 'random')).toBe(4);
      expect(positionsPerCycle(4, 'pingpong')).toBe(6); // C D E F E D
      expect(positionsPerCycle(2, 'pingpong')).toBe(2);
    });

    it('ciclo C → D → E → F a 60 bpm com 4 tempos dura 16 s', () => {
      expect(cycleDurationSeconds(DEFAULT_PRACTICE_CONFIG)).toBe(16);
      expect(cycleDurationSeconds({ ...DEFAULT_PRACTICE_CONFIG, order: 'pingpong' })).toBe(24);
    });
  });
});

describe('progressão de BPM', () => {
  const p = (stepBpm: number, everyCycles: number, targetBpm: number) =>
    createPracticeConfig({ bpm: 50, bpmProgression: { stepBpm, everyCycles, targetBpm } });

  it('sobe a cada N ciclos completos, sem passar da meta', () => {
    const config = p(5, 2, 62);
    expect([0, 1, 2, 3, 4, 5, 6, 20].map((c) => progressionBpm(config, c))).toEqual([
      50, 50, 55, 55, 60, 60, 62, 62,
    ]);
  });

  it('sem progressão, é sempre o BPM do treino', () => {
    expect(progressionBpm(createPracticeConfig({ bpm: 72 }), 10)).toBe(72);
  });

  it.each([
    [p(5, 2, 80), []],
    [p(0, 2, 80), ['invalid-progression']],
    [p(25, 2, 80), ['invalid-progression']],
    [p(5, 0, 80), ['invalid-progression']],
    [p(5, 11, 80), ['invalid-progression']],
    [p(5, 2, 50), ['invalid-progression']],
    [p(5, 2, 241), ['invalid-progression']],
  ] as [PracticeConfig, PracticeConfigErrorCode[]][])('%j → %j', (config, expected) => {
    expect(codes(config)).toEqual(expected);
  });
});
