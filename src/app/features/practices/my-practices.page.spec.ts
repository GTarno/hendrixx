import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AUDIO_CONTEXT_FACTORY, MetronomeService } from '../../core/audio/metronome.service';
import { SCHEDULER_TIMER } from '../../core/audio/scheduler-timer';
import { FakeAudioContext, FakeTimer } from '../../core/audio/testing/fake-audio';
import { createPracticeConfig } from '../../core/models';
import { ChordNamingService } from '../../core/preferences/chord-naming.service';
import {
  PRACTICE_STORAGE,
  PracticeStorageService,
} from '../../core/presets/practice-storage.service';
import { PracticeSessionService } from '../../core/session/practice-session.service';
import { PracticeDraftService } from '../setup/practice-draft.service';
import { MyPracticesPage } from './my-practices.page';

describe('MyPracticesPage', () => {
  function setup(storage: Storage | null = localStorage) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PRACTICE_STORAGE, useValue: storage },
        {
          provide: AUDIO_CONTEXT_FACTORY,
          useValue: () => new FakeAudioContext() as unknown as AudioContext,
        },
        { provide: SCHEDULER_TIMER, useValue: new FakeTimer() },
      ],
    });
    return TestBed.inject(PracticeStorageService);
  }

  function render() {
    const fixture = TestBed.createComponent(MyPracticesPage);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const update = () => fixture.detectChanges();
    const button = (label: string) =>
      [...host.querySelectorAll<HTMLButtonElement>('button')].find(
        (b) => b.textContent?.trim() === label || b.getAttribute('aria-label') === label,
      );
    const names = () => [...host.querySelectorAll('.name')].map((e) => e.textContent?.trim());
    return { fixture, host, update, button, names };
  }

  it('sem treinos, convida a montar um', () => {
    setup();
    const { host } = render();
    expect(host.querySelector('.empty h2')?.textContent).toContain('Nenhum treino salvo ainda');
    expect(host.querySelector('.empty a')?.getAttribute('href')).toBe('/');
    expect(host.querySelector('app-practice-tabs')).not.toBeNull();
  });

  it('lista os treinos com resumo', () => {
    const storage = setup();
    storage.save('Troca lenta', createPracticeConfig({ chordIds: ['C', 'G'], bpm: 50 }));
    const { host, names } = render();
    expect(names()).toEqual(['Troca lenta']);
    expect(host.querySelector('.summary')?.textContent).toContain('C → G · 50 bpm · 4 tempos');
    expect(host.querySelector('.meta')?.textContent).toMatch(/^Salvo em \d{2}\/\d{2}\/\d{4}$/);
  });

  it('mostra os nomes em português quando escolhido', () => {
    const storage = setup();
    storage.save('A', createPracticeConfig({ chordIds: ['C', 'G'] }));
    TestBed.inject(ChordNamingService).set('pt');
    const { host } = render();
    expect(host.querySelector('.summary')?.textContent).toMatch(/^Dó → Sol/);
  });

  it('Iniciar começa o treino salvo e vai para a tela de treino', () => {
    const storage = setup();
    storage.save('Rápido', createPracticeConfig({ chordIds: ['A', 'E'], bpm: 100 }));
    const { button } = render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    button('Iniciar Rápido')?.click();
    expect(TestBed.inject(PracticeSessionService).config()?.chordIds).toEqual(['A', 'E']);
    expect(TestBed.inject(MetronomeService).bpm()).toBe(100);
    expect(TestBed.inject(PracticeDraftService).bpm()).toBe(100);
    expect(storage.last()?.chordIds).toEqual(['A', 'E']);
    expect(navigate).toHaveBeenCalledWith(['/treino']);
  });

  it('Editar abre o treino na tela de montar', () => {
    const storage = setup();
    storage.save('Ajustar', createPracticeConfig({ chordIds: ['Dm', 'Am'], order: 'random' }));
    const { button } = render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    button('Editar Ajustar')?.click();
    const draft = TestBed.inject(PracticeDraftService);
    expect(draft.chordIds()).toEqual(['Dm', 'Am']);
    expect(draft.order()).toBe('random');
    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('renomeia', () => {
    const storage = setup();
    storage.save('Velho', createPracticeConfig());
    const { host, update, button, names } = render();
    button('Renomear Velho')?.click();
    update();
    const input = host.querySelector<HTMLInputElement>('.rename input');
    if (input) input.value = 'Novo nome';
    button('Salvar')?.click();
    update();
    expect(names()).toEqual(['Novo nome']);
  });

  it('exclui só depois de confirmar', () => {
    const storage = setup();
    storage.save('Manter', createPracticeConfig());
    storage.save('Apagar', createPracticeConfig());
    const { update, button, names, host } = render();
    button('Excluir Apagar')?.click();
    update();
    expect(host.querySelector('.confirm')?.textContent).toContain('Excluir “Apagar”?');
    button('Cancelar')?.click();
    update();
    expect(names()).toHaveLength(2);
    button('Excluir Apagar')?.click();
    update();
    host.querySelector<HTMLButtonElement>('.confirm .danger')?.click();
    update();
    expect(names()).toEqual(['Manter']);
  });

  it('não deixa iniciar um treino com acorde fora do catálogo liberado', () => {
    const storage = setup();
    storage.save('Com C7', createPracticeConfig({ chordIds: ['C', 'C7'] }));
    const { host, button } = render();
    expect(button('Iniciar Com C7')?.disabled).toBe(true);
    expect(host.querySelector('.problem')?.textContent).toContain('Acorde fora do catálogo: C7.');
  });

  it('avisa quando o navegador não guarda dados', () => {
    setup(null);
    const { host } = render();
    expect(host.querySelector('.warn')?.textContent).toContain('não está guardando dados');
  });
});
