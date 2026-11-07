import { TestBed } from '@angular/core/testing';
import { AUDIO_CONTEXT_FACTORY } from '../../core/audio/metronome.service';
import { SCHEDULER_TIMER } from '../../core/audio/scheduler-timer';
import { FakeAudioContext, FakeTimer, advanceTo } from '../../core/audio/testing/fake-audio';
import { createPracticeConfig } from '../../core/models';
import { PracticeSessionService } from '../../core/session/practice-session.service';
import { MetronomeVisualComponent } from './metronome-visual.component';

describe('MetronomeVisualComponent', () => {
  let ctx: FakeAudioContext;
  let timer: FakeTimer;

  function render() {
    const fixture = TestBed.createComponent(MetronomeVisualComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const component = fixture.componentInstance;
    /** Leva o relógio até `seconds`, atualiza a tela e desenha um quadro. */
    const frameAt = (seconds: number) => {
      advanceTo(ctx, timer, seconds);
      TestBed.tick();
      fixture.detectChanges();
      component.drawFrame();
    };
    const arm = () => host.querySelector<SVGGElement>('.arm')?.style.transform ?? '';
    const fill = () => host.querySelector<HTMLElement>('.bar span')?.style.width ?? '';
    const dots = () => [...host.querySelectorAll<HTMLElement>('.beat')];
    return { fixture, host, frameAt, arm, fill, dots };
  }

  beforeEach(() => {
    ctx = new FakeAudioContext();
    timer = new FakeTimer();
    TestBed.configureTestingModule({
      providers: [
        { provide: AUDIO_CONTEXT_FACTORY, useValue: () => ctx as unknown as AudioContext },
        { provide: SCHEDULER_TIMER, useValue: timer },
      ],
    });
  });

  it('em repouso antes do treino', () => {
    const { arm, fill, dots, host, fixture } = render();
    fixture.componentInstance.drawFrame();
    expect(arm()).toBe('rotate(0.00deg)');
    expect(fill()).toBe('0%');
    expect(dots()).toHaveLength(4);
    expect(dots()[0].classList.contains('accent')).toBe(true);
    expect(host.querySelector('.beats')?.getAttribute('aria-label')).toBe(
      'Aguardando o primeiro tempo',
    );
  });

  it('segue o relógio de áudio: pêndulo, pulso, ponto aceso e barra', () => {
    TestBed.inject(PracticeSessionService).start(createPracticeConfig({ countIn: false }));
    const { frameAt, arm, fill, dots, host } = render();

    frameAt(0.05); // clique do tempo 1 do C
    expect(arm()).toBe('rotate(22.00deg)');
    expect(dots()[0].classList.contains('on')).toBe(true);
    expect(dots()[0].style.transform).toBe('scale(1.320)');
    expect(fill()).toBe('0%');

    frameAt(1.55); // meio do tempo 2: pêndulo no centro
    expect(arm()).toMatch(/^rotate\(-?0\.00deg\)$/);
    expect(dots()[1].classList.contains('on')).toBe(true);
    expect(dots()[1].style.transform).toBe('');
    expect(fill()).toBe('37.5%');
    expect(host.querySelector('.beats')?.getAttribute('aria-label')).toBe('Tempo 2 de 4');

    frameAt(4.05); // troca para o D: barra recomeça
    expect(fill()).toBe('0%');
    expect(arm()).toBe('rotate(22.00deg)');
  });

  it('na contagem, o pêndulo anda e a barra fica vazia', () => {
    TestBed.inject(PracticeSessionService).start(createPracticeConfig());
    const { frameAt, arm, fill } = render();
    frameAt(1.3);
    expect(arm()).toMatch(/^rotate\(-/);
    expect(fill()).toBe('0%');
  });

  it('com movimento reduzido, não anima dentro do tempo', () => {
    const original = window.matchMedia;
    window.matchMedia = ((q: string) => ({
      matches: q.includes('reduce'),
    })) as typeof window.matchMedia;
    try {
      TestBed.inject(PracticeSessionService).start(createPracticeConfig({ countIn: false }));
      const { frameAt, arm, fill, dots } = render();
      frameAt(1.1);
      const first = [arm(), fill(), dots()[1].style.transform];
      frameAt(1.9);
      expect([arm(), fill(), dots()[1].style.transform]).toEqual(first);
      expect(first).toEqual(['rotate(-22.00deg)', '50%', '']);
    } finally {
      window.matchMedia = original;
    }
  });

  it('para o laço de quadros ao ser destruído', () => {
    const cancel = vi.spyOn(globalThis, 'cancelAnimationFrame');
    const { fixture } = render();
    fixture.destroy();
    if (typeof requestAnimationFrame === 'function') expect(cancel).toHaveBeenCalled();
    cancel.mockRestore();
  });
});
