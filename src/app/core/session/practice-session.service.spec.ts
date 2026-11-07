import { TestBed } from '@angular/core/testing';
import { AUDIO_CONTEXT_FACTORY, MetronomeService } from '../audio/metronome.service';
import { SCHEDULER_TIMER } from '../audio/scheduler-timer';
import { FakeAudioContext, FakeTimer, advanceTo } from '../audio/testing/fake-audio';
import { PracticeConfig, createPracticeConfig } from '../models';
import { PracticeSessionService, SESSION_RANDOM } from './practice-session.service';

describe('PracticeSessionService', () => {
  let ctx: FakeAudioContext;
  let timer: FakeTimer;
  let session: PracticeSessionService;
  let metronome: MetronomeService;

  /** Faz o relógio de áudio andar e roda os efeitos do Angular. */
  const at = (seconds: number) => {
    advanceTo(ctx, timer, seconds);
    TestBed.tick();
  };
  const names = () => [session.currentChord()?.id ?? null, session.nextChord()?.id ?? null];
  const config = (overrides: Partial<PracticeConfig> = {}) =>
    createPracticeConfig({ countIn: false, ...overrides });

  beforeEach(() => {
    ctx = new FakeAudioContext();
    timer = new FakeTimer();
    TestBed.configureTestingModule({
      providers: [
        { provide: AUDIO_CONTEXT_FACTORY, useValue: () => ctx as unknown as AudioContext },
        { provide: SCHEDULER_TIMER, useValue: timer },
        { provide: SESSION_RANDOM, useValue: () => 0.5 },
      ],
    });
    session = TestBed.inject(PracticeSessionService);
    metronome = TestBed.inject(MetronomeService);
  });

  it('começa parado', () => {
    expect(session.status()).toBe('idle');
    expect(names()).toEqual([null, null]);
  });

  it('não começa com configuração inválida e devolve os erros', () => {
    const errors = session.start(config({ chordIds: ['C'] }));
    expect(errors.map((e) => e.code)).toEqual(['too-few-chords']);
    expect(session.status()).toBe('idle');
    expect(metronome.isRunning()).toBe(false);
  });

  it('não aceita acordes de fases bloqueadas do catálogo', () => {
    const errors = session.start(config({ chordIds: ['C', 'C7'] }));
    expect(errors.map((e) => e.code)).toEqual(['unknown-chord']);
  });

  describe('C → D → E → F a 60 bpm com contagem', () => {
    beforeEach(() => {
      expect(session.start(createPracticeConfig())).toEqual([]);
    });

    it('começa na contagem, mostrando o primeiro acorde como próximo', () => {
      expect(session.status()).toBe('count-in');
      expect(metronome.isRunning()).toBe(true);
      expect(metronome.bpm()).toBe(60);
      expect(names()).toEqual([null, 'C']);
      at(0.1);
      expect(session.countInNumber()).toBe(1);
      at(3.1);
      expect(session.countInNumber()).toBe(4);
      expect(session.beatInBar()).toBe(3);
    });

    it('troca de acorde a cada 4 tempos, no tempo 1', () => {
      at(4.1);
      expect(session.status()).toBe('running');
      expect(names()).toEqual(['C', 'D']);
      expect(session.beatInBar()).toBe(0);
      expect(session.beatsUntilChange()).toBe(4);
      at(7.1);
      expect(names()).toEqual(['C', 'D']);
      expect(session.beatsUntilChange()).toBe(1);
      at(8.1);
      expect(names()).toEqual(['D', 'E']);
      at(12.1);
      expect(names()).toEqual(['E', 'F']);
      at(16.1);
      expect(names()).toEqual(['F', 'C']);
    });

    it('ciclo e tempo de treino seguem o relógio de áudio', () => {
      at(20.1);
      expect(names()).toEqual(['C', 'D']);
      expect(session.cycle()).toBe(1);
      expect(session.elapsedSeconds()).toBeCloseTo(16, 9);
    });

    it('pausa e retoma no tempo 1 do acorde atual, com nova contagem', () => {
      at(9.6); // D, segundo tempo
      session.pause();
      expect(session.status()).toBe('paused');
      expect(metronome.isRunning()).toBe(false);
      expect(names()).toEqual([null, 'D']);

      ctx.currentTime = 30;
      session.resume();
      expect(session.status()).toBe('count-in');
      at(30.1);
      expect(session.countInNumber()).toBe(1);
      at(34.1);
      expect(session.status()).toBe('running');
      expect(names()).toEqual(['D', 'E']);
      expect(session.beatsUntilChange()).toBe(4);
      // Tocou de 4,05 até a pausa em 9,6: 5,55 s.
      expect(session.elapsedSeconds()).toBeCloseTo(5.55, 5);
    });

    it('parar mostra o resumo, como no fim automático', () => {
      at(12.1); // E começou
      session.stop();
      expect(session.status()).toBe('finished');
      expect(metronome.isRunning()).toBe(false);
      expect(session.summary()).toMatchObject({ cycles: 0, changes: 2 });
      expect(session.summary()?.elapsedSeconds).toBeCloseTo(8.05, 9);
    });

    it('parar durante a pausa usa o tempo até a pausa', () => {
      at(9.6);
      session.pause();
      ctx.currentTime = 100;
      session.stop();
      expect(session.summary()?.elapsedSeconds).toBeCloseTo(5.55, 5);
    });

    it('muda o BPM ao vivo sem reiniciar o acorde', () => {
      at(5.1);
      expect(session.setBpm(120)).toBe(120);
      expect(session.bpm()).toBe(120);
      at(6.1);
      expect(names()).toEqual(['C', 'D']);
    });
  });

  it('termina sozinho após X ciclos, no tempo de chegada', () => {
    session.start(config({ beatsPerChord: 1, stop: { type: 'cycles', value: 1 } }));
    expect(session.status()).toBe('running');
    at(3.1);
    expect(names()).toEqual(['F', 'C']);
    at(4.1); // tempo de chegada em 4,05
    expect(session.status()).toBe('finished');
    expect(metronome.isRunning()).toBe(false);
    expect(session.summary()).toMatchObject({ cycles: 1, changes: 3 });
    expect(session.summary()?.elapsedSeconds).toBeCloseTo(4, 9);
    expect(names()).toEqual([null, null]);
  });

  it('sem contagem, o primeiro acorde soa no primeiro clique', () => {
    session.start(config());
    expect(session.status()).toBe('running');
    expect(names()).toEqual([null, 'C']);
    at(0.1);
    expect(names()).toEqual(['C', 'D']);
  });

  it('ping-pong mostra a volta como próximo acorde', () => {
    session.start(config({ order: 'pingpong', beatsPerChord: 1 }));
    at(3.1);
    expect(names()).toEqual(['F', 'E']);
    at(5.1);
    expect(names()).toEqual(['D', 'C']);
  });

  it('reset descarta o treino e o resumo', () => {
    session.start(config());
    at(2.1);
    session.stop();
    session.reset();
    expect(session.status()).toBe('idle');
    expect(session.summary()).toBeNull();
    expect(session.config()).toBeNull();
    expect(session.chords()).toEqual([]);
  });

  it('um novo start recomeça do zero', () => {
    session.start(config());
    at(6.1);
    session.start(config({ chordIds: ['G', 'Am'] }));
    expect(names()).toEqual([null, 'G']);
    at(6.2);
    expect(names()).toEqual(['G', 'Am']);
    expect(session.elapsedSeconds()).toBe(0);
  });
});
