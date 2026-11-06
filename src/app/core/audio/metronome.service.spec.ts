import { TestBed } from '@angular/core/testing';
import {
  ACCENT_FREQUENCY_HZ,
  AUDIO_CONTEXT_FACTORY,
  BEAT_FREQUENCY_HZ,
  MetronomeService,
  ScheduledBeat,
} from './metronome.service';
import { SCHEDULER_TIMER, SchedulerTimer, WorkerSchedulerTimer } from './scheduler-timer';

// ---------- AudioContext falso, com relógio controlado pelo teste ----------

class FakeParam {
  value = 0;
  setValueAtTime(): this {
    return this;
  }
  exponentialRampToValueAtTime(): this {
    return this;
  }
}

class FakeNode {
  disconnected = false;
  connect<T>(node: T): T {
    return node;
  }
  disconnect(): void {
    this.disconnected = true;
  }
}

class FakeGain extends FakeNode {
  gain = new FakeParam();
}

class FakeOscillator extends FakeNode {
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

class FakeAudioContext {
  currentTime = 0;
  state: AudioContextState = 'running';
  destination = new FakeNode();
  oscillators: FakeOscillator[] = [];
  resume = vi.fn(async () => {
    this.state = 'running';
  });
  close = vi.fn(async () => {
    this.state = 'closed';
  });
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

class FakeTimer implements SchedulerTimer {
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

describe('MetronomeService', () => {
  let ctx: FakeAudioContext;
  let timer: FakeTimer;
  let factory: ReturnType<typeof vi.fn>;
  let metronome: MetronomeService;

  /** Avança o relógio de áudio em passos de 25 ms, acordando o agendador a cada passo. */
  function advanceTo(seconds: number): void {
    while (ctx.currentTime < seconds - 1e-9) {
      ctx.currentTime = Math.min(seconds, +(ctx.currentTime + 0.025).toFixed(6));
      timer.tick();
    }
  }

  const diffs = (times: number[]) => times.slice(1).map((t, i) => t - times[i]);

  beforeEach(() => {
    ctx = new FakeAudioContext();
    timer = new FakeTimer();
    factory = vi.fn(() => ctx as unknown as AudioContext);
    TestBed.configureTestingModule({
      providers: [
        { provide: AUDIO_CONTEXT_FACTORY, useValue: factory },
        { provide: SCHEDULER_TIMER, useValue: timer },
      ],
    });
    metronome = TestBed.inject(MetronomeService);
  });

  it('só cria o AudioContext no start (política de autoplay)', () => {
    expect(factory).not.toHaveBeenCalled();
    metronome.start();
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('retoma um AudioContext suspenso ao iniciar', () => {
    ctx.state = 'suspended';
    metronome.start();
    expect(ctx.resume).toHaveBeenCalled();
  });

  it('agenda o primeiro clique 50 ms à frente e só o que cabe na janela de 100 ms', () => {
    ctx.currentTime = 10;
    metronome.start();
    expect(ctx.clickTimes()).toEqual([10.05]);
    expect(timer.intervalMs).toBe(25);

    advanceTo(10.9);
    expect(ctx.clickTimes()).toHaveLength(1);
    advanceTo(10.975);
    expect(ctx.clickTimes()).toHaveLength(2);
    expect(ctx.clickTimes()[1]).toBeCloseTo(11.05, 9);
  });

  it.each([30, 60, 120, 240])('a %i bpm, os cliques ficam a 60/bpm segundos', (bpm) => {
    metronome.setBpm(bpm);
    metronome.start();
    advanceTo(8);
    const intervals = diffs(ctx.clickTimes());
    expect(intervals.length).toBeGreaterThan(2);
    for (const interval of intervals) expect(interval).toBeCloseTo(60 / bpm, 9);
  });

  it('acentua só o tempo 1 de cada compasso 4/4', () => {
    metronome.setBpm(120);
    metronome.start();
    advanceTo(3.9);
    const frequencies = ctx.oscillators.slice(0, 8).map((o) => o.frequency.value);
    const A = ACCENT_FREQUENCY_HZ;
    const b = BEAT_FREQUENCY_HZ;
    expect(frequencies).toEqual([A, b, b, b, A, b, b, b]);
  });

  describe('BPM', () => {
    it('começa em 60', () => {
      expect(metronome.bpm()).toBe(60);
    });

    it.each([
      [10, 30],
      [29, 30],
      [30, 30],
      [240, 240],
      [241, 240],
      [500, 240],
      [72.4, 72],
    ])('setBpm(%s) aplica %s', (input, expected) => {
      expect(metronome.setBpm(input)).toBe(expected);
      expect(metronome.bpm()).toBe(expected);
    });

    it('mudança em andamento vale a partir do próximo tempo agendado', () => {
      metronome.start(); // 60 bpm
      advanceTo(2); // agendados: 0.05, 1.05, 2.05
      expect(ctx.clickTimes()).toHaveLength(3);
      metronome.setBpm(120);
      advanceTo(4);
      const intervals = diffs(ctx.clickTimes());
      expect(intervals.slice(0, 2).every((d) => Math.abs(d - 1) < 1e-9)).toBe(true);
      expect(intervals.slice(2).every((d) => Math.abs(d - 0.5) < 1e-9)).toBe(true);
      expect(ctx.clickTimes()[3]).toBeCloseTo(2.55, 9);
    });
  });

  describe('stop', () => {
    it('cancela cliques agendados que ainda não soaram', () => {
      metronome.start();
      advanceTo(1); // o clique de 1.05 já está agendado
      const future = ctx.oscillators.find((o) => o.startTime > 1);
      const past = ctx.oscillators.find((o) => o.startTime < 1);
      metronome.stop();
      expect(future?.output?.disconnected).toBe(true);
      expect(past?.output?.disconnected).toBe(false);
    });

    it('não agenda mais nada depois de parar', () => {
      metronome.start();
      advanceTo(2);
      metronome.stop();
      const count = ctx.clickTimes().length;
      timer.tick();
      advanceTo(10);
      expect(ctx.clickTimes()).toHaveLength(count);
      expect(timer.callback).toBeNull();
      expect(metronome.isRunning()).toBe(false);
      expect(metronome.currentBeat()).toBeNull();
    });

    it('um novo start recomeça no tempo 1', () => {
      const beats: ScheduledBeat[] = [];
      metronome.onBeat((b) => beats.push(b));
      metronome.start();
      advanceTo(2.5);
      metronome.stop();
      beats.length = 0;
      metronome.start();
      expect(beats[0]).toMatchObject({ index: 0, beatInBar: 0, accent: true });
      expect(beats[0].time).toBeCloseTo(2.55, 9);
    });
  });

  it('start repetido não duplica o agendador', () => {
    metronome.start();
    metronome.start();
    expect(timer.starts).toBe(1);
    expect(ctx.clickTimes()).toHaveLength(1);
    expect(metronome.isRunning()).toBe(true);
  });

  it('currentBeat acompanha o relógio de áudio', () => {
    metronome.start();
    expect(metronome.currentBeat()).toBeNull();
    advanceTo(0.075);
    expect(metronome.currentBeat()).toMatchObject({ index: 0, beatInBar: 0 });
    advanceTo(1.075);
    expect(metronome.currentBeat()).toMatchObject({ index: 1, beatInBar: 1, accent: false });
    advanceTo(4.075);
    expect(metronome.currentBeat()).toMatchObject({ index: 4, beatInBar: 0, accent: true });
  });

  it('onBeat avisa cada tempo agendado, com horário e duração, e pode ser cancelado', () => {
    const beats: ScheduledBeat[] = [];
    const unsubscribe = metronome.onBeat((b) => beats.push(b));
    metronome.start();
    advanceTo(1);
    expect(beats.map((b) => b.index)).toEqual([0, 1]);
    expect(beats[1]).toMatchObject({ beatInBar: 1, accent: false, duration: 1 });
    expect(beats[1].time).toBeCloseTo(1.05, 9);
    unsubscribe();
    advanceTo(3);
    expect(beats).toHaveLength(2);
  });

  it('um ouvinte pode parar o metrônomo no meio do agendamento', () => {
    metronome.onBeat((b) => {
      if (b.index === 2) metronome.stop();
    });
    metronome.start();
    advanceTo(5);
    expect(ctx.clickTimes()).toHaveLength(3);
    expect(metronome.isRunning()).toBe(false);
  });

  it('nunca usa setInterval', () => {
    const spy = vi.spyOn(globalThis, 'setInterval');
    metronome.start();
    advanceTo(5);
    metronome.stop();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('expõe o relógio de áudio para animações', () => {
    expect(metronome.audioTime()).toBe(0);
    ctx.currentTime = 3.2;
    metronome.start();
    expect(metronome.audioTime()).toBe(3.2);
  });

  it('fecha o AudioContext quando o injetor é destruído', () => {
    metronome.start();
    TestBed.resetTestingModule();
    expect(ctx.close).toHaveBeenCalled();
    expect(timer.callback).toBeNull();
  });
});

describe('WorkerSchedulerTimer', () => {
  afterEach(() => vi.useRealTimers());

  it('sem Web Worker, acorda o agendador com setTimeout até ser parado', () => {
    vi.useFakeTimers();
    const timer = new WorkerSchedulerTimer();
    const callback = vi.fn();
    timer.start(callback, 25);
    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledTimes(4);
    timer.stop();
    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledTimes(4);
  });
});
