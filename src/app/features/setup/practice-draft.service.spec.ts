import { TestBed } from '@angular/core/testing';
import { PracticeDraftService, formatDuration, stopText } from './practice-draft.service';

describe('formatDuration', () => {
  it.each([
    [16, '16 s'],
    [2.667, '2,7 s'],
    [64, '1 min 4 s'],
    [120, '2 min'],
    [59.96, '60 s'],
  ])('%s s → %s', (seconds, text) => {
    expect(formatDuration(seconds)).toBe(text);
  });
});

describe('stopText', () => {
  it('descreve cada parada', () => {
    expect(stopText({ type: 'infinite' }, 16)).toBe('sem fim');
    expect(stopText({ type: 'cycles', value: 3 }, 16)).toBe('3 ciclos ≈ 48 s');
    expect(stopText({ type: 'cycles', value: 1 }, 16)).toBe('1 ciclo ≈ 16 s');
    expect(stopText({ type: 'minutes', value: 5 }, 16)).toBe('5 min');
  });
});

describe('PracticeDraftService', () => {
  let draft: PracticeDraftService;

  beforeEach(() => {
    draft = TestBed.inject(PracticeDraftService);
  });

  it('começa com o treino padrão, pronto para iniciar', () => {
    expect(draft.config()).toEqual({
      chordIds: ['C', 'D', 'E', 'F'],
      bpm: 60,
      beatsPerChord: 4,
      beatsPerBar: 4,
      order: 'sequential',
      stop: { type: 'infinite' },
      countIn: true,
    });
    expect(draft.canStart()).toBe(true);
    expect(draft.cycleSeconds()).toBe(16);
  });

  it('escolher acordes monta o ciclo na ordem dos toques', () => {
    draft.clearChords();
    draft.toggleChord('G');
    draft.toggleChord('C');
    draft.toggleChord('Am');
    expect(draft.chordIds()).toEqual(['G', 'C', 'Am']);
    draft.toggleChord('C');
    expect(draft.chordIds()).toEqual(['G', 'Am']);
    expect(draft.isSelected('Am')).toBe(true);
  });

  it('move e remove acordes do ciclo', () => {
    draft.moveChord('C', 1);
    expect(draft.chordIds()).toEqual(['D', 'C', 'E', 'F']);
    draft.moveChord('D', -1); // já é o primeiro
    draft.moveChord('F', 1); // já é o último
    expect(draft.chordIds()).toEqual(['D', 'C', 'E', 'F']);
    draft.removeChord('E');
    expect(draft.chordIds()).toEqual(['D', 'C', 'F']);
    draft.resetChords();
    expect(draft.chordIds()).toEqual(['C', 'D', 'E', 'F']);
  });

  it('com menos de 2 acordes não pode começar e diz por quê (RN7)', () => {
    draft.clearChords();
    draft.toggleChord('C');
    expect(draft.canStart()).toBe(false);
    expect(draft.errors().map((e) => e.message)).toEqual(['Escolha pelo menos 2 acordes.']);
  });

  it('ping-pong mostra a volta sem as pontas', () => {
    draft.order.set('pingpong');
    const { forward, back } = draft.cycle();
    expect(forward.map((c) => c.id)).toEqual(['C', 'D', 'E', 'F']);
    expect(back.map((c) => c.id)).toEqual(['E', 'D']);
    expect(draft.cycleSeconds()).toBe(24);
  });

  it('limita BPM, ciclos e minutos', () => {
    expect(draft.setBpm(500)).toBe(240);
    expect(draft.stepBpm(5)).toBe(240);
    expect(draft.setBpm(12)).toBe(30);
    expect(draft.stepBpm(-5)).toBe(30);
    draft.setStopCycles(0);
    expect(draft.stopCycles()).toBe(1);
    draft.setStopCycles(250);
    expect(draft.stopCycles()).toBe(99);
    draft.setStopMinutes(Number.NaN);
    expect(draft.stopMinutes()).toBe(1);
    draft.setStopMinutes(90);
    expect(draft.stopMinutes()).toBe(60);
  });

  it('a parada usa o valor do tipo escolhido', () => {
    draft.stopType.set('cycles');
    draft.setStopCycles(2);
    expect(draft.config().stop).toEqual({ type: 'cycles', value: 2 });
    draft.stopType.set('minutes');
    expect(draft.config().stop).toEqual({ type: 'minutes', value: 5 });
  });
});
