import { TapTempo } from './tap-tempo';

describe('TapTempo', () => {
  it('precisa de 2 toques para calcular', () => {
    const tap = new TapTempo();
    expect(tap.tap(0)).toBeNull();
    expect(tap.tap(1000)).toBe(60);
  });

  it('usa a média dos últimos 4 toques', () => {
    const tap = new TapTempo();
    [0, 500, 1000, 1500].forEach((t) => tap.tap(t));
    expect(tap.count).toBe(4);
    // Os 4 últimos: 1500, 2000, 2400, 2800 → média de 433 ms ≈ 138 bpm.
    tap.tap(2000);
    tap.tap(2400);
    expect(tap.tap(2800)).toBe(138);
    expect(tap.count).toBe(4);
  });

  it('recomeça depois de uma pausa longa', () => {
    const tap = new TapTempo();
    tap.tap(0);
    tap.tap(500);
    expect(tap.tap(10000)).toBeNull();
    expect(tap.tap(11000)).toBe(60);
  });

  it('limita o resultado a 30–240 bpm', () => {
    const fast = new TapTempo();
    fast.tap(0);
    expect(fast.tap(100)).toBe(240);
    const slow = new TapTempo(5000);
    slow.tap(0);
    expect(slow.tap(2400)).toBe(30);
  });

  it('reset apaga os toques', () => {
    const tap = new TapTempo();
    tap.tap(0);
    tap.reset();
    expect(tap.tap(1000)).toBeNull();
  });
});
