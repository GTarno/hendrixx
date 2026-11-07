import { SchedulerTimer } from '../scheduler-timer';

/**
 * Falsos de AudioContext e de timer para testes, com o relógio de áudio controlado pelo teste.
 * Use `provideFakeAudio()` nos providers do TestBed e `advanceTo()` para fazer o tempo andar.
 */

export class FakeParam {
  value = 0;
  setValueAtTime(): this {
    return this;
  }
  exponentialRampToValueAtTime(): this {
    return this;
  }
}

export class FakeNode {
  disconnected = false;
  connect<T>(node: T): T {
    return node;
  }
  disconnect(): void {
    this.disconnected = true;
  }
}

export class FakeGain extends FakeNode {
  gain = new FakeParam();
}

export class FakeOscillator extends FakeNode {
  type = 'sine';
  frequency = new FakeParam();
  startTime = Number.NaN;
  output: FakeGain | null = null;
  override connect<T>(node: T): T {
    this.output = node as unknown as FakeGain;
    return node;
  }
  start(time: number): void {
    this.startTime = time;
  }
  stop(): void {
    /* nada */
  }
}

export class FakeAudioContext {
  currentTime = 0;
  state: AudioContextState = 'running';
  destination = new FakeNode();
  oscillators: FakeOscillator[] = [];
  resumeCalls = 0;
  closeCalls = 0;

  async resume(): Promise<void> {
    this.resumeCalls++;
    this.state = 'running';
  }
  async close(): Promise<void> {
    this.closeCalls++;
    this.state = 'closed';
  }
  createOscillator(): FakeOscillator {
    const osc = new FakeOscillator();
    this.oscillators.push(osc);
    return osc;
  }
  createGain(): FakeGain {
    return new FakeGain();
  }
  /** Momentos de início de todos os cliques agendados. */
  clickTimes(): number[] {
    return this.oscillators.map((o) => o.startTime);
  }
}

export class FakeTimer implements SchedulerTimer {
  callback: (() => void) | null = null;
  intervalMs = 0;
  starts = 0;
  start(callback: () => void, intervalMs: number): void {
    this.callback = callback;
    this.intervalMs = intervalMs;
    this.starts++;
  }
  stop(): void {
    this.callback = null;
  }
  tick(): void {
    this.callback?.();
  }
}

/** Avança o relógio de áudio em passos de 25 ms, acordando o agendador a cada passo. */
export function advanceTo(ctx: FakeAudioContext, timer: FakeTimer, seconds: number): void {
  while (ctx.currentTime < seconds - 1e-9) {
    ctx.currentTime = Math.min(seconds, +(ctx.currentTime + 0.025).toFixed(6));
    timer.tick();
  }
}
