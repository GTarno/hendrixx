import { PracticeConfig, createPracticeConfig } from '../models';
import { ChordBeat, SessionBeat, SessionPlanner, createChordSequence } from './session-planner';

/** Gerador pseudoaleatório determinístico (mulberry32) para testar a ordem aleatória. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LETTERS = ['C', 'D', 'E', 'F'];

function config(overrides: Partial<PracticeConfig> = {}): PracticeConfig {
  return createPracticeConfig({ countIn: false, ...overrides });
}

/** Planeja `count` tempos a partir de `start`, a `bpm` constante. */
function run(planner: SessionPlanner, count: number, bpm = 60, start = 0): SessionBeat[] {
  const duration = 60 / bpm;
  const beats: SessionBeat[] = [];
  for (let i = 0; i < count; i++) {
    const beat = planner.next(start + i * duration, duration);
    if (beat) beats.push(beat);
  }
  return beats;
}

const chordBeats = (beats: SessionBeat[]) =>
  beats.filter((b): b is ChordBeat => b.kind === 'chord');
/** Acorde de cada posição, como letras, a partir dos tempos de troca. */
const changes = (beats: SessionBeat[]) =>
  chordBeats(beats)
    .filter((b) => b.beatInChord === 0)
    .map((b) => LETTERS[b.chordIndex])
    .join(' ');

describe('createChordSequence (RN3)', () => {
  const take = (n: number, at: (i: number) => number) =>
    Array.from({ length: n }, (_, i) => LETTERS[at(i)]).join(' ');

  it('sequencial: C D E F C D E F', () => {
    const seq = createChordSequence(4, 'sequential');
    expect(seq.perCycle).toBe(4);
    expect(take(8, seq.at)).toBe('C D E F C D E F');
  });

  it('ping-pong sem repetir as pontas: C D E F E D C D…', () => {
    const seq = createChordSequence(4, 'pingpong');
    expect(seq.perCycle).toBe(6);
    expect(take(13, seq.at)).toBe('C D E F E D C D E F E D C');
  });

  it('ping-pong com 2 acordes é alternância', () => {
    const seq = createChordSequence(2, 'pingpong');
    expect(seq.perCycle).toBe(2);
    expect(take(6, seq.at)).toBe('C D C D C D');
  });

  it('aleatória: cada ciclo é uma permutação e nunca repete o acorde seguido', () => {
    for (const seed of [1, 2, 3, 42, 1234]) {
      const seq = createChordSequence(4, 'random', seeded(seed));
      const all = Array.from({ length: 400 }, (_, i) => seq.at(i));
      for (let c = 0; c < 100; c++) {
        expect([...all.slice(c * 4, c * 4 + 4)].sort()).toEqual([0, 1, 2, 3]);
      }
      for (let i = 1; i < all.length; i++) expect(all[i]).not.toBe(all[i - 1]);
    }
  });

  it('aleatória com 2 acordes vira alternância', () => {
    const seq = createChordSequence(2, 'random', seeded(7));
    const all = Array.from({ length: 20 }, (_, i) => seq.at(i));
    for (let i = 1; i < all.length; i++) expect(all[i]).not.toBe(all[i - 1]);
  });

  it('é estável: a mesma posição devolve sempre o mesmo acorde', () => {
    const seq = createChordSequence(4, 'random', seeded(9));
    const first = Array.from({ length: 20 }, (_, i) => seq.at(i));
    expect(Array.from({ length: 20 }, (_, i) => seq.at(i))).toEqual(first);
  });
});

describe('SessionPlanner', () => {
  describe('ciclo C → D → E → F, 4 tempos, 60 bpm (RN1, RN2)', () => {
    it('cada acorde dura 4 tempos e o ciclo recomeça', () => {
      const beats = run(new SessionPlanner(config()), 32);
      expect(changes(beats)).toBe('C D E F C D E F');
      expect(beats[0]).toMatchObject({
        kind: 'chord',
        chordIndex: 0,
        nextChordIndex: 1,
        beatInChord: 0,
        cycle: 0,
      });
      expect(beats[3]).toMatchObject({ beatInChord: 3, beatInBar: 3 });
      expect(beats[4]).toMatchObject({
        chordIndex: 1,
        nextChordIndex: 2,
        beatInChord: 0,
        beatInBar: 0,
      });
      expect(beats[16]).toMatchObject({ chordIndex: 0, cycle: 1 });
    });

    it('a troca cai sempre no tempo 1 com N múltiplo de 4 (RN5)', () => {
      for (const n of [4, 8, 16] as const) {
        const beats = chordBeats(run(new SessionPlanner(config({ beatsPerChord: n })), 64));
        for (const b of beats.filter((x) => x.beatInChord === 0)) expect(b.beatInBar).toBe(0);
      }
    });

    it('com N = 2, troca nos tempos 1 e 3 (D1)', () => {
      const beats = chordBeats(run(new SessionPlanner(config({ beatsPerChord: 2 })), 8));
      expect(beats.filter((b) => b.beatInChord === 0).map((b) => b.beatInBar)).toEqual([
        0, 2, 0, 2,
      ]);
    });

    it('conta o tempo de treino pelo relógio', () => {
      const beats = chordBeats(run(new SessionPlanner(config()), 10, 60, 100));
      expect(beats.map((b) => b.elapsedSeconds).slice(0, 4)).toEqual([0, 1, 2, 3]);
    });
  });

  describe('contagem inicial (RN6)', () => {
    it('4 tempos numerados antes do primeiro acorde, sem contar como treino', () => {
      const beats = run(new SessionPlanner(config({ countIn: true })), 6);
      expect(beats.slice(0, 4).map((b) => b.kind === 'count-in' && b.count)).toEqual([1, 2, 3, 4]);
      expect(beats[0]).toMatchObject({ kind: 'count-in', beatInBar: 0, firstChordIndex: 0 });
      expect(beats[4]).toMatchObject({
        kind: 'chord',
        chordIndex: 0,
        beatInBar: 0,
        elapsedSeconds: 0,
      });
      expect(beats[5]).toMatchObject({ elapsedSeconds: 1 });
    });
  });

  describe('parada (RN4)', () => {
    it('infinito não termina', () => {
      const planner = new SessionPlanner(config());
      expect(run(planner, 1000).every((b) => b.kind === 'chord')).toBe(true);
      expect(planner.isFinished).toBe(false);
    });

    it('X ciclos: termina no tempo 1 em que começaria o ciclo X + 1', () => {
      const planner = new SessionPlanner(config({ stop: { type: 'cycles', value: 2 } }));
      const beats = run(planner, 40);
      expect(beats).toHaveLength(33); // 32 tempos de acorde + o tempo de chegada
      expect(beats[32]).toEqual({
        kind: 'end',
        time: 32,
        duration: 1,
        summary: { cycles: 2, changes: 7, elapsedSeconds: 32 },
      });
      expect(planner.isFinished).toBe(true);
      expect(planner.next(40, 1)).toBeNull();
    });

    it('X ciclos em ping-pong conta a volta', () => {
      const planner = new SessionPlanner(
        config({ order: 'pingpong', beatsPerChord: 1, stop: { type: 'cycles', value: 1 } }),
      );
      const beats = run(planner, 10);
      expect(changes(beats)).toBe('C D E F E D');
      expect(beats.at(-1)).toMatchObject({ kind: 'end', summary: { cycles: 1, changes: 5 } });
    });

    it('X minutos: termina no primeiro tempo 1 de troca depois do tempo', () => {
      const planner = new SessionPlanner(config({ stop: { type: 'minutes', value: 1 } }));
      const beats = run(planner, 100);
      expect(beats.at(-1)).toEqual({
        kind: 'end',
        time: 60,
        duration: 1,
        summary: { cycles: 3, changes: 14, elapsedSeconds: 60 },
      });
    });

    it('X minutos nunca corta um acorde no meio', () => {
      // Com 8 tempos por acorde, aos 60 s o acorde está na metade: termina aos 64 s.
      const planner = new SessionPlanner(
        config({ beatsPerChord: 8, stop: { type: 'minutes', value: 1 } }),
      );
      expect(run(planner, 100).at(-1)).toMatchObject({ kind: 'end', time: 64 });
    });

    it('X minutos não conta a contagem inicial', () => {
      const planner = new SessionPlanner(
        config({ countIn: true, stop: { type: 'minutes', value: 1 } }),
      );
      expect(run(planner, 100).at(-1)).toMatchObject({ kind: 'end', time: 64 });
    });
  });

  describe('pausa', () => {
    it('retoma no tempo 1 do acorde atual, com contagem, sem contar o tempo parado', () => {
      const planner = new SessionPlanner(config({ countIn: true }));
      const before = run(planner, 10); // contagem + C (4) + 2 tempos de D
      const last = before.at(-1) as ChordBeat;
      expect(last).toMatchObject({ chordIndex: 1, beatInChord: 1, elapsedSeconds: 5 });

      planner.pause(last, 9.5);
      expect(planner.upcomingChordIndex).toBe(1);
      const after = run(planner, 6, 60, 100);
      expect(after[0]).toMatchObject({ kind: 'count-in', count: 1, firstChordIndex: 1 });
      expect(after[4]).toMatchObject({ kind: 'chord', chordIndex: 1, beatInChord: 0, position: 1 });
      // 5 s até o último clique + 0,5 s até a pausa.
      expect((after[4] as ChordBeat).elapsedSeconds).toBe(5.5);
    });

    it('com N = 2, retoma alinhado ao início do compasso', () => {
      const planner = new SessionPlanner(config({ beatsPerChord: 2 }));
      const before = chordBeats(run(planner, 7)); // posições 0, 1, 2, 3 (meio)
      const last = before.at(-1) as ChordBeat;
      expect(last.position).toBe(3);
      planner.pause(last, 6.5);
      const after = chordBeats(run(planner, 2, 60, 50));
      expect(after[0]).toMatchObject({ position: 2, beatInBar: 0 });
    });

    it('pausar durante a contagem não muda nada', () => {
      const planner = new SessionPlanner(config({ countIn: true }));
      const before = run(planner, 2);
      planner.pause(before.at(-1) ?? null, 1.5);
      const after = run(planner, 5, 60, 10);
      expect(after[0]).toMatchObject({ kind: 'count-in', count: 1 });
      expect(after[4]).toMatchObject({ kind: 'chord', position: 0, elapsedSeconds: 0 });
    });
  });

  describe('resumo de parada manual', () => {
    it('conta posições, trocas, ciclos e tempo até o momento da parada', () => {
      const planner = new SessionPlanner(config());
      const beats = run(planner, 18); // C D E F e 2 tempos do C do ciclo 2
      expect(planner.summaryAt(beats.at(-1) ?? null, 17.4)).toEqual({
        cycles: 1,
        changes: 4,
        elapsedSeconds: 17.4,
      });
    });

    it('antes do primeiro acorde, o resumo é vazio', () => {
      const planner = new SessionPlanner(config({ countIn: true }));
      expect(planner.summaryAt(null, 0)).toEqual({ cycles: 0, changes: 0, elapsedSeconds: 0 });
    });
  });
});
