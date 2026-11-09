import { TestBed } from '@angular/core/testing';
import { createPracticeConfig } from '../../core/models';
import { PracticeStorageService } from '../../core/presets/practice-storage.service';
import {
  PracticeDraftService,
  formatDuration,
  practiceSummary,
  stopText,
  suggestedName,
} from './practice-draft.service';

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

describe('PracticeDraftService: carregar treinos', () => {
  it('carrega uma configuração salva', () => {
    const draft = TestBed.inject(PracticeDraftService);
    draft.load({
      chordIds: ['G', 'Am'],
      bpm: 72,
      beatsPerChord: 8,
      beatsPerBar: 4,
      order: 'pingpong',
      stop: { type: 'cycles', value: 5 },
      countIn: false,
    });
    expect(draft.config()).toEqual({
      chordIds: ['G', 'Am'],
      bpm: 72,
      beatsPerChord: 8,
      beatsPerBar: 4,
      order: 'pingpong',
      stop: { type: 'cycles', value: 5 },
      countIn: false,
    });
  });

  it('descarta acordes fora do catálogo liberado e repetidos, e limita valores', () => {
    const draft = TestBed.inject(PracticeDraftService);
    draft.load({
      chordIds: ['C', 'C7', 'C', 'G'],
      bpm: 400,
      beatsPerChord: 4,
      beatsPerBar: 4,
      order: 'sequential',
      stop: { type: 'minutes', value: 500 },
      countIn: true,
    });
    expect(draft.chordIds()).toEqual(['C', 'G']);
    expect(draft.bpm()).toBe(240);
    expect(draft.stop()).toEqual({ type: 'minutes', value: 60 });
  });

  it('abre com a última configuração iniciada, se ela ainda for válida', () => {
    TestBed.inject(PracticeStorageService).rememberLast(
      createPracticeConfig({ chordIds: ['A', 'D'], bpm: 88 }),
    );
    const draft = TestBed.inject(PracticeDraftService);
    expect(draft.chordIds()).toEqual(['A', 'D']);
    expect(draft.bpm()).toBe(88);
  });

  it('ignora a última configuração se ela não for mais válida', () => {
    TestBed.inject(PracticeStorageService).rememberLast(
      createPracticeConfig({ chordIds: ['C', 'C7'] }),
    );
    expect(TestBed.inject(PracticeDraftService).chordIds()).toEqual(['C', 'D', 'E', 'F']);
  });
});

describe('practiceSummary e suggestedName', () => {
  it('descrevem o treino', () => {
    const config = createPracticeConfig();
    expect(practiceSummary(config, ['C', 'D', 'E', 'F'])).toBe(
      'C → D → E → F · 60 bpm · 4 tempos · sequencial · ≈ 16 s por ciclo · sem fim',
    );
    expect(practiceSummary(config, [])).toBe('Nenhum acorde escolhido');
    expect(suggestedName(config, ['C', 'D', 'E', 'F'])).toBe('C D E F · 60 bpm');
  });
});

describe('PracticeDraftService: progressão de BPM', () => {
  it('fica fora da configuração até ser ligada', () => {
    const draft = TestBed.inject(PracticeDraftService);
    expect(draft.config().bpmProgression).toBeUndefined();
    draft.setProgressionOn(true);
    expect(draft.config().bpmProgression).toEqual({ stepBpm: 5, everyCycles: 2, targetBpm: 80 });
    expect(draft.canStart()).toBe(true);
  });

  it('ao ligar com o BPM acima da meta, sugere uma meta 20 acima', () => {
    const draft = TestBed.inject(PracticeDraftService);
    draft.setBpm(100);
    draft.setProgressionOn(true);
    expect(draft.progressionTarget()).toBe(120);
  });

  it('limita passo, intervalo e meta', () => {
    const draft = TestBed.inject(PracticeDraftService);
    draft.setProgressionStep(99);
    draft.setProgressionEvery(0);
    draft.setProgressionTarget(999);
    expect([draft.progressionStep(), draft.progressionEvery(), draft.progressionTarget()]).toEqual([
      20, 1, 240,
    ]);
  });

  it('meta abaixo do BPM impede de começar, com o motivo', () => {
    const draft = TestBed.inject(PracticeDraftService);
    draft.setProgressionOn(true);
    draft.setProgressionTarget(40);
    expect(draft.canStart()).toBe(false);
    expect(draft.errors()[0].message).toContain('A meta precisa ser maior');
  });

  it('carrega e desliga a progressão conforme a configuração', () => {
    const draft = TestBed.inject(PracticeDraftService);
    draft.load(
      createPracticeConfig({
        bpm: 50,
        bpmProgression: { stepBpm: 10, everyCycles: 3, targetBpm: 90 },
      }),
    );
    expect(draft.config().bpmProgression).toEqual({ stepBpm: 10, everyCycles: 3, targetBpm: 90 });
    draft.load(createPracticeConfig());
    expect(draft.config().bpmProgression).toBeUndefined();
  });

  it('entra no resumo', () => {
    const config = createPracticeConfig({
      bpm: 50,
      bpmProgression: { stepBpm: 5, everyCycles: 2, targetBpm: 80 },
    });
    expect(practiceSummary(config, ['C', 'D', 'E', 'F'])).toContain(
      'sem fim · sobe 5 bpm a cada 2 ciclos até 80',
    );
  });
});
