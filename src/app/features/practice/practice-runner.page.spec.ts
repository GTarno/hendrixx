import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AUDIO_CONTEXT_FACTORY, MetronomeService } from '../../core/audio/metronome.service';
import { SCHEDULER_TIMER } from '../../core/audio/scheduler-timer';
import { FakeAudioContext, FakeTimer, advanceTo } from '../../core/audio/testing/fake-audio';
import { WakeLockService } from '../../core/display/wake-lock.service';
import { PracticeConfig, createPracticeConfig } from '../../core/models';
import { ChordNamingService } from '../../core/preferences/chord-naming.service';
import { PracticeSessionService } from '../../core/session/practice-session.service';
import { PracticeDraftService } from '../setup/practice-draft.service';
import { PracticeRunnerPage } from './practice-runner.page';

describe('PracticeRunnerPage', () => {
  let ctx: FakeAudioContext;
  let timer: FakeTimer;
  let session: PracticeSessionService;

  function render(config?: Partial<PracticeConfig>) {
    if (config) session.start(createPracticeConfig(config));
    const fixture = TestBed.createComponent(PracticeRunnerPage);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const text = (sel: string) => host.querySelector(sel)?.textContent?.trim() ?? '';
    const button = (label: string) =>
      [...host.querySelectorAll<HTMLButtonElement>('button')].find(
        (b) => b.textContent?.trim().startsWith(label) || b.getAttribute('aria-label') === label,
      );
    const at = (seconds: number) => {
      advanceTo(ctx, timer, seconds);
      TestBed.tick();
      fixture.detectChanges();
    };
    const update = () => {
      TestBed.tick();
      fixture.detectChanges();
    };
    const activeBeat = () =>
      [...host.querySelectorAll('.beat')].findIndex((b) => b.classList.contains('on'));
    return { fixture, host, text, button, at, update, activeBeat };
  }

  beforeEach(() => {
    ctx = new FakeAudioContext();
    timer = new FakeTimer();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AUDIO_CONTEXT_FACTORY, useValue: () => ctx as unknown as AudioContext },
        { provide: SCHEDULER_TIMER, useValue: timer },
      ],
    });
    session = TestBed.inject(PracticeSessionService);
  });

  it('sem treino, oferece montar um', () => {
    const { text, button } = render();
    expect(text('h2')).toBe('Nenhum treino em andamento');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    button('Montar treino')?.click();
    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('na contagem mostra os números e o primeiro acorde esmaecido', () => {
    const { text, at, host } = render({});
    expect(text('.pill')).toBe('Contagem');
    expect(text('.stage-label')).toBe('Posicione a mão');
    expect(text('.next-name')).toBe('C');
    expect(host.querySelector('.big-diagram')?.classList.contains('dim')).toBe(true);
    at(0.1);
    expect(text('.big')).toBe('1');
    expect(text('.big-alt')).toBe('Contagem');
    at(2.1);
    expect(text('.big')).toBe('3');
    expect(host.querySelector('.next')?.classList.contains('soon')).toBe(true);
  });

  it('mostra o acorde atual grande, o próximo e o tempo no compasso', () => {
    const { text, at, host, activeBeat } = render({});
    at(4.1);
    expect(text('.pill')).toBe('Tocando');
    expect(text('.stage-label')).toBe('Acorde atual');
    expect(text('.big')).toBe('C');
    expect(text('.big-alt')).toBe('Dó');
    expect(host.querySelector('.big-diagram svg')?.getAttribute('aria-label')).toMatch(/^Dó \(C\)/);
    expect(host.querySelector('.big-diagram')?.classList.contains('dim')).toBe(false);
    expect(text('.next-name')).toBe('D');
    expect(activeBeat()).toBe(0);
    expect(text('.caption')).toBe('Troca em 4 tempos');
    expect(host.querySelector('.next')?.classList.contains('soon')).toBe(false);
    expect(text('[aria-live="polite"]')).toBe('Acorde: Dó');

    at(6.1);
    expect(activeBeat()).toBe(2);
    expect(text('.caption')).toBe('Troca em 2 tempos');
    expect(host.querySelector('.next')?.classList.contains('soon')).toBe(true);

    at(8.1);
    expect(text('.big')).toBe('D');
    expect(text('.next-name')).toBe('E');
    expect(text('[aria-live="polite"]')).toBe('Acorde: Ré');
  });

  it('mostra ciclo e tempo, com o limite da parada', () => {
    const { text, at } = render({ countIn: false, stop: { type: 'cycles', value: 3 } });
    at(17.1);
    expect(text('.status-bar')).toContain('Ciclo 2 de 3');
    expect(text('.clock')).toBe('00:17');
    session.reset();
    const minutes = render({ countIn: false, stop: { type: 'minutes', value: 5 } });
    minutes.at(30);
    expect(minutes.text('.clock')).toBe('00:12 / 05:00');
  });

  it('respeita a nomenclatura escolhida', () => {
    const { text, at, update } = render({ countIn: false });
    at(0.1);
    TestBed.inject(ChordNamingService).set('pt');
    update();
    expect(text('.big')).toBe('Dó');
    expect(text('.big-alt')).toBe('C');
    expect(text('.next-name')).toBe('Ré');
  });

  it('pausa e continua', () => {
    const { text, at, button, update } = render({});
    at(9.1);
    button('❚❚ Pausar')?.click();
    update();
    expect(text('.pill')).toBe('Pausado');
    expect(text('.big')).toBe('Pausado');
    expect(text('.big-alt')).toBe('Volta em D');
    expect(button('▶ Continuar')).toBeDefined();
    expect(TestBed.inject(MetronomeService).isRunning()).toBe(false);

    button('▶ Continuar')?.click();
    update();
    expect(text('.pill')).toBe('Contagem');
    expect(TestBed.inject(MetronomeService).isRunning()).toBe(true);
  });

  it('ajusta o BPM sem sair do treino', () => {
    const { text, at, button, update } = render({});
    at(4.1);
    button('Aumentar 5 bpm')?.click();
    update();
    expect(text('.bpm')).toBe('65bpm');
    button('Diminuir 5 bpm')?.click();
    button('Diminuir 5 bpm')?.click();
    update();
    expect(text('.bpm')).toBe('55bpm');
    expect(text('.big')).toBe('C');
  });

  describe('resumo', () => {
    it('Parar mostra o resumo', () => {
      const { text, at, button, update } = render({ countIn: false });
      at(9.1);
      button('■ Parar')?.click();
      update();
      expect(text('h2')).toBe('Treino concluído');
      expect(text('.done-stats')).toBe('0 ciclos · 2 trocas · 00:09');
      expect(text('.done-config')).toBe('C → D → E → F · 60 bpm');
    });

    it('fim automático mostra o resumo', () => {
      const { text, at } = render({
        countIn: false,
        beatsPerChord: 1,
        stop: { type: 'cycles', value: 1 },
      });
      at(4.1);
      expect(text('h2')).toBe('Treino concluído');
      expect(text('.done-stats')).toBe('1 ciclo · 3 trocas · 00:04');
    });

    it('Treinar de novo repete o mesmo treino', () => {
      const { at, button, update, text } = render({ countIn: false, chordIds: ['G', 'Am'] });
      at(2.1);
      button('■ Parar')?.click();
      update();
      button('↻ Treinar de novo')?.click();
      update();
      expect(session.status()).toBe('running');
      expect(session.config()?.chordIds).toEqual(['G', 'Am']);
      at(2.2);
      expect(text('.big')).toBe('G');
    });

    it('+5 bpm e de novo sobe o andamento e guarda no treino montado', () => {
      const { at, button, update } = render({ countIn: false });
      at(1.1);
      button('■ Parar')?.click();
      update();
      expect(button('+5 bpm e de novo')?.textContent).toContain('(65)');
      button('+5 bpm e de novo')?.click();
      update();
      expect(session.bpm()).toBe(65);
      expect(session.config()?.bpm).toBe(65);
      expect(TestBed.inject(PracticeDraftService).bpm()).toBe(65);
    });

    it('oferece salvar o treino no resumo', () => {
      const { at, button, update, host } = render({ countIn: false, chordIds: ['G', 'C'] });
      at(1.1);
      button('■ Parar')?.click();
      update();
      button('Salvar como treino')?.click();
      update();
      expect(host.querySelector<HTMLInputElement>('app-save-practice input')?.value).toBe(
        'G C · 60 bpm',
      );
    });

    it('Ajustar treino volta para a tela 1', () => {
      const { at, button, update } = render({ countIn: false });
      at(1.1);
      button('■ Parar')?.click();
      update();
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      button('Ajustar treino')?.click();
      expect(navigate).toHaveBeenCalledWith(['/']);
      expect(session.status()).toBe('idle');
    });
  });

  describe('tema, tela acesa e tela cheia', () => {
    it('usa o tema escuro por padrão e o retira ao sair', () => {
      const { fixture, update } = render({});
      update();
      expect(document.documentElement.classList.contains('stage-dark')).toBe(true);
      fixture.destroy();
      expect(document.documentElement.classList.contains('stage-dark')).toBe(false);
    });

    it('alterna o tema pelo botão', () => {
      const { button, update } = render({});
      update();
      button('Usar tema claro')?.click();
      update();
      expect(document.documentElement.classList.contains('stage-light')).toBe(true);
      expect(button('Usar tema escuro')).toBeDefined();
      button('Usar tema escuro')?.click();
      update();
    });

    it('mantém a tela acesa só enquanto toca', () => {
      const wakeLock = TestBed.inject(WakeLockService);
      const request = vi.spyOn(wakeLock, 'request').mockResolvedValue();
      const release = vi.spyOn(wakeLock, 'release');
      const { at, button, update } = render({});
      update();
      expect(request).toHaveBeenCalled();
      at(5.1);
      button('❚❚ Pausar')?.click();
      update();
      expect(release).toHaveBeenCalled();
    });

    it('sem suporte a tela cheia, não mostra o botão', () => {
      const { button } = render({});
      expect(button('Tela cheia')).toBeUndefined();
    });
  });

  describe('atalhos de teclado', () => {
    const press = (key: string, target: EventTarget = document.body) => {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      target.dispatchEvent(event);
      return event;
    };

    it('Espaço pausa e continua, sem rolar a página', () => {
      const { at, update, text } = render({});
      at(5.1);
      const event = press(' ');
      update();
      expect(event.defaultPrevented).toBe(true);
      expect(text('.pill')).toBe('Pausado');
      press(' ');
      update();
      expect(text('.pill')).toBe('Contagem');
    });

    it('↑ e ↓ mudam o BPM em 5', () => {
      const { at, update, text } = render({});
      at(5.1);
      press('ArrowUp');
      press('ArrowUp');
      press('ArrowDown');
      update();
      expect(text('.bpm')).toBe('65bpm');
    });

    it('N troca a nomenclatura', () => {
      const { at, update, text } = render({ countIn: false });
      at(0.1);
      press('n');
      update();
      expect(text('.big')).toBe('Dó');
      press('N');
      update();
      expect(text('.big')).toBe('C');
    });

    it('Esc para e mostra o resumo', () => {
      const { at, update, text } = render({ countIn: false });
      at(2.1);
      press('Escape');
      update();
      expect(text('h2')).toBe('Treino concluído');
    });

    it('F não faz nada sem suporte a tela cheia, e o atalho não é consumido', () => {
      const { at } = render({});
      at(1.1);
      expect(press('f').defaultPrevented).toBe(false);
    });

    it('sem treino em andamento, só N vale', () => {
      const { update } = render();
      expect(press(' ').defaultPrevented).toBe(false);
      expect(press('ArrowUp').defaultPrevented).toBe(false);
      expect(press('n').defaultPrevented).toBe(true);
      update();
      expect(TestBed.inject(ChordNamingService).naming()).toBe('pt');
    });

    it('com um botão focado, o Espaço aciona o botão e não pausa de novo', () => {
      const { at, update, text, button } = render({});
      at(5.1);
      const pause = button('❚❚ Pausar');
      if (!pause) throw new Error('botão Pausar ausente');
      press(' ', pause);
      update();
      expect(text('.pill')).toBe('Tocando');
    });

    it('mostra a legenda dos atalhos', () => {
      const { at, host } = render({});
      at(1.1);
      const keys = [...host.querySelectorAll('.kbd-hint kbd')].map((k) => k.textContent?.trim());
      expect(keys).toEqual(['Espaço', 'Esc', '↑', '↓', 'F', 'N']);
    });
  });

  it('mostra a progressão de BPM durante o treino', () => {
    const { text, at } = render({
      bpm: 50,
      bpmProgression: { stepBpm: 5, everyCycles: 2, targetBpm: 80 },
    });
    at(1.1);
    expect(text('.tempo + .caption')).toBe('Subindo 5 bpm a cada 2 ciclos até 80');
  });

  it('sair da tela encerra o treino em andamento', () => {
    const { fixture, at } = render({});
    at(5.1);
    fixture.destroy();
    expect(session.status()).toBe('idle');
    expect(TestBed.inject(MetronomeService).isRunning()).toBe(false);
  });
});
