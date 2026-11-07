import {
  PENDULUM_AMPLITUDE_DEG as A,
  PULSE_GROWTH,
  REST_FRAME,
  metronomeFrame,
} from './metronome-frame';

const beat = (beatInBar: number, beatInChord?: number) => ({
  time: 10,
  duration: 1,
  beatInBar,
  beatInChord,
});

describe('metronomeFrame', () => {
  it('sem tempo soando, fica em repouso', () => {
    expect(metronomeFrame(5, null, 4, false)).toEqual(REST_FRAME);
  });

  describe('pêndulo', () => {
    it('chega ao extremo exatamente no clique e alterna de lado a cada tempo', () => {
      expect(metronomeFrame(10, beat(0, 0), 4, false).pendulumDeg).toBeCloseTo(A, 9);
      expect(metronomeFrame(10, beat(1, 1), 4, false).pendulumDeg).toBeCloseTo(-A, 9);
    });

    it('cruza o centro no meio do tempo e chega ao outro lado no fim', () => {
      expect(metronomeFrame(10.5, beat(0, 0), 4, false).pendulumDeg).toBeCloseTo(0, 9);
      expect(metronomeFrame(11, beat(0, 0), 4, false).pendulumDeg).toBeCloseTo(-A, 9);
    });

    it('é contínuo na virada do tempo', () => {
      const end = metronomeFrame(10.999, beat(0, 0), 4, false).pendulumDeg;
      const start = metronomeFrame(11, { ...beat(1, 1), time: 11 }, 4, false).pendulumDeg;
      expect(Math.abs(end - start)).toBeLessThan(0.01);
    });

    it('não passa do extremo se o quadro atrasar', () => {
      expect(metronomeFrame(13, beat(0, 0), 4, false).pendulumDeg).toBeCloseTo(-A, 9);
      expect(metronomeFrame(9, beat(0, 0), 4, false).pendulumDeg).toBeCloseTo(A, 9);
    });
  });

  describe('pulso', () => {
    it('começa maior no clique e volta ao normal em 120 ms', () => {
      expect(metronomeFrame(10, beat(0, 0), 4, false).pulseScale).toBeCloseTo(1 + PULSE_GROWTH, 9);
      const mid = metronomeFrame(10.06, beat(0, 0), 4, false).pulseScale;
      expect(mid).toBeGreaterThan(1);
      expect(mid).toBeLessThan(1 + PULSE_GROWTH);
      expect(metronomeFrame(10.12, beat(0, 0), 4, false).pulseScale).toBe(1);
      expect(metronomeFrame(10.5, beat(0, 0), 4, false).pulseScale).toBe(1);
    });
  });

  describe('barra até a troca', () => {
    it('avança de forma contínua dentro do acorde', () => {
      expect(metronomeFrame(10, beat(0, 0), 4, false).progress).toBe(0);
      expect(metronomeFrame(10.5, beat(1, 1), 4, false).progress).toBeCloseTo(0.375, 9);
      expect(metronomeFrame(11, beat(3, 3), 4, false).progress).toBe(1);
    });

    it('fica vazia na contagem', () => {
      expect(metronomeFrame(10.5, beat(2), 4, false).progress).toBe(0);
    });

    it('com 1 tempo por acorde, enche a cada tempo', () => {
      expect(metronomeFrame(10.25, beat(0, 0), 1, false).progress).toBeCloseTo(0.25, 9);
    });
  });

  describe('com movimento reduzido', () => {
    it('só muda de estado a cada tempo, sem animar', () => {
      const a = metronomeFrame(10, beat(1, 1), 4, true);
      const b = metronomeFrame(10.7, beat(1, 1), 4, true);
      expect(a).toEqual(b);
      expect(a).toEqual({ pendulumDeg: -A, pulseScale: 1, progress: 0.5 });
      expect(metronomeFrame(10.3, beat(2), 4, true).progress).toBe(0);
    });
  });
});
