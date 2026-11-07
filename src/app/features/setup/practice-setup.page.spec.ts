import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AUDIO_CONTEXT_FACTORY, MetronomeService } from '../../core/audio/metronome.service';
import { SCHEDULER_TIMER } from '../../core/audio/scheduler-timer';
import { FakeAudioContext, FakeTimer } from '../../core/audio/testing/fake-audio';
import { ChordNamingService } from '../../core/preferences/chord-naming.service';
import { PracticeSessionService } from '../../core/session/practice-session.service';
import { PracticeSetupPage } from './practice-setup.page';

describe('PracticeSetupPage', () => {
  let ctx: FakeAudioContext;

  function render() {
    const fixture = TestBed.createComponent(PracticeSetupPage);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const $ = <T extends Element = HTMLElement>(sel: string) => host.querySelector<T>(sel);
    const $$ = <T extends Element = HTMLElement>(sel: string) => [...host.querySelectorAll<T>(sel)];
    const text = (sel: string) => $(sel)?.textContent?.trim() ?? '';
    const update = () => fixture.detectChanges();
    const chip = (name: string) =>
      $$('.chip').find((c) => c.querySelector('.chip-name')?.textContent?.trim() === name);
    const button = (label: string) =>
      $$<HTMLButtonElement>('button').find(
        (b) => b.textContent?.trim() === label || b.getAttribute('aria-label') === label,
      );
    const radio = (name: string, value: string) =>
      $<HTMLInputElement>(`input[name="${name}"][value="${value}"]`);
    return { fixture, host, $, $$, text, update, chip, button, radio };
  }

  beforeEach(() => {
    ctx = new FakeAudioContext();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AUDIO_CONTEXT_FACTORY, useValue: () => ctx as unknown as AudioContext },
        { provide: SCHEDULER_TIMER, useValue: new FakeTimer() },
      ],
    });
  });

  it('abre com o treino padrão e o resumo', () => {
    const { $$, text } = render();
    expect($$('.chip')).toHaveLength(10);
    const selected = $$('.chip[aria-pressed="true"]').map((c) =>
      c.querySelector('.chip-name')?.textContent?.trim(),
    );
    expect(selected).toEqual(['C', 'D', 'E', 'F']);
    expect($$('.cycle-name').map((e) => e.textContent?.trim())).toEqual(['C', 'D', 'E', 'F']);
    expect(text('.summary')).toBe(
      'C → D → E → F · 60 bpm · 4 tempos · sequencial · ≈ 16 s por ciclo · sem fim',
    );
  });

  it('marca os acordes com pestana', () => {
    const { chip } = render();
    expect(chip('F')?.querySelector('.chip-hard')).not.toBeNull();
    expect(chip('C')?.querySelector('.chip-hard')).toBeNull();
    expect(chip('B')?.textContent).toContain('com pestana');
  });

  it('tocar num acorde adiciona ao fim do ciclo, e de novo remove', () => {
    const { chip, update, $$ } = render();
    chip('G')?.click();
    update();
    expect($$('.cycle-name').map((e) => e.textContent?.trim())).toEqual(['C', 'D', 'E', 'F', 'G']);
    expect(chip('G')?.querySelector('.chip-order')?.textContent).toBe('5');
    chip('C')?.click();
    update();
    expect($$('.cycle-name').map((e) => e.textContent?.trim())).toEqual(['D', 'E', 'F', 'G']);
  });

  it('reordena e remove pela faixa do ciclo', () => {
    const { button, update, $$ } = render();
    button('Mover C para depois')?.click();
    update();
    expect($$('.cycle-name').map((e) => e.textContent?.trim())).toEqual(['D', 'C', 'E', 'F']);
    expect(button('Mover D para antes')?.disabled).toBe(true);
    button('Remover E')?.click();
    update();
    expect($$('.cycle-name').map((e) => e.textContent?.trim())).toEqual(['D', 'C', 'F']);
  });

  it('com menos de 2 acordes, desabilita Iniciar e mostra o motivo', () => {
    const { button, update, text, chip } = render();
    button('Limpar')?.click();
    update();
    expect(text('.empty')).toContain('Toque nos acordes');
    chip('Am')?.click();
    update();
    expect(button('▶ Iniciar')?.disabled).toBe(true);
    expect(text('.blocker')).toBe('Escolha pelo menos 2 acordes.');
    expect(text('.summary')).toMatch(/^Am · 60 bpm/);
  });

  it('ajusta o BPM por botões, campo e limites', () => {
    const { button, update, $, text } = render();
    button('Aumentar 5 bpm')?.click();
    update();
    expect(text('.summary')).toContain('65 bpm');

    const input = $<HTMLInputElement>('#bpm');
    if (!input) throw new Error('campo de BPM ausente');
    input.value = '300';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    update();
    expect(input.value).toBe('240');
    expect(text('.summary')).toContain('240 bpm');

    const range = $<HTMLInputElement>('#bpm-range');
    if (!range) throw new Error('slider ausente');
    range.value = '90';
    range.dispatchEvent(new Event('input'));
    update();
    expect(text('.summary')).toContain('90 bpm · 4 tempos · sequencial · ≈ 10,7 s por ciclo');
  });

  it('tap tempo define o BPM pelo ritmo dos toques', () => {
    const { button, update, text } = render();
    const now = vi.spyOn(performance, 'now');
    for (const t of [1000, 1500, 2000]) {
      now.mockReturnValue(t);
      button('Tap tempo')?.click();
    }
    update();
    expect(text('.summary')).toContain('120 bpm');
    expect(text('#tap-hint')).toBe('Tap tempo: 120 bpm (3 toques).');
    now.mockRestore();
  });

  it('tempos por acorde, ordem e parada entram no resumo', () => {
    const { radio, update, text, $$, $ } = render();
    radio('beats', '8')?.click();
    update();
    expect(text('.summary')).toContain('8 tempos · sequencial · ≈ 32 s por ciclo');

    radio('order', 'pingpong')?.click();
    update();
    expect($$('.cycle-item.back .cycle-name').map((e) => e.textContent?.trim())).toEqual([
      'E',
      'D',
    ]);
    expect(text('.summary')).toContain('ping-pong · ≈ 48 s por ciclo');

    const cycles = $<HTMLInputElement>('input[aria-label="Número de ciclos"]');
    expect(cycles?.disabled).toBe(true);
    radio('stop', 'cycles')?.click();
    update();
    expect(cycles?.disabled).toBe(false);
    expect(text('.summary')).toContain('3 ciclos ≈ 2 min 24 s');
  });

  it('mostra os nomes em português quando escolhido', () => {
    const { update, text, chip } = render();
    TestBed.inject(ChordNamingService).set('pt');
    update();
    expect(chip('Lá menor')).toBeDefined();
    expect(text('.summary')).toMatch(/^Dó → Ré → Mi → Fá/);
  });

  it('Iniciar começa o treino no próprio clique e vai para a tela de treino', () => {
    const { button, update } = render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    button('▶ Iniciar')?.click();
    update();
    const session = TestBed.inject(PracticeSessionService);
    expect(session.status()).toBe('count-in');
    expect(session.config()?.chordIds).toEqual(['C', 'D', 'E', 'F']);
    expect(TestBed.inject(MetronomeService).isRunning()).toBe(true);
    expect(navigate).toHaveBeenCalledWith(['/treino']);
  });
});
