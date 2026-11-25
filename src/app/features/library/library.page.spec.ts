import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ChordNamingService } from '../../core/preferences/chord-naming.service';
import { PracticeDraftService } from '../setup/practice-draft.service';
import { LibraryPage } from './library.page';

describe('LibraryPage', () => {
  function render() {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(LibraryPage);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const update = () => fixture.detectChanges();
    const names = () => [...host.querySelectorAll('.card .name')].map((e) => e.textContent?.trim());
    const groups = () => [...host.querySelectorAll('.group h2')].map((e) => e.textContent?.trim());
    const button = (label: string) =>
      [...host.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
        b.textContent?.includes(label),
      );
    const search = (text: string) => {
      const input = host.querySelector<HTMLInputElement>('input[type=search]');
      if (!input) throw new Error('sem busca');
      input.value = text;
      input.dispatchEvent(new Event('input'));
      update();
    };
    return { host, update, names, groups, button, search };
  }

  it('mostra os 60 acordes agrupados por tônica', () => {
    const { host, names, groups } = render();
    expect(names()).toHaveLength(60);
    expect(groups()).toHaveLength(12);
    expect(groups()[1]).toBe('C# / Db');
    expect(host.querySelector('[role=status]')?.textContent).toContain('60 acordes');
  });

  it('busca por cifra, português e nome enarmônico', () => {
    const { names, search, groups } = render();
    search('Am');
    expect(names()).toEqual(['Am', 'Am7']);
    search('lá menor');
    expect(names()).toEqual(['Am', 'Am7']);
    search('Gb');
    expect(groups()).toEqual(['F# / Gb']);
  });

  it('filtra por tipo e dificuldade, e limpa os filtros', () => {
    const { names, button, update, host } = render();
    button('7M')?.click();
    update();
    expect(names()).toHaveLength(12);
    expect(button('7M')?.getAttribute('aria-pressed')).toBe('true');
    button('Fácil')?.click();
    update();
    expect(names()).toEqual(['C7M', 'D7M', 'E7M', 'F7M', 'G7M', 'A7M']);
    button('Limpar filtros')?.click();
    update();
    expect(names()).toHaveLength(60);
    expect(host.querySelector('[role=status]')?.textContent).not.toContain('Limpar');
  });

  it('sem resultado, explica como buscar', () => {
    const { host, search } = render();
    search('xyz');
    expect(host.querySelector('.empty')?.textContent).toContain('Nenhum acorde encontrado');
  });

  it('mostra variações, acordes do treino e o nome em português', () => {
    const { host, update } = render();
    const card = (name: string) =>
      [...host.querySelectorAll('.card')].find(
        (c) => c.querySelector('.name')?.textContent?.trim() === name,
      );
    expect(card('F')?.textContent).toContain('+ 1 variação');
    expect(card('C')?.textContent).toContain('+ 1 variação');
    expect(card('C')?.textContent).toContain('no treino');
    expect(card('G')?.textContent).not.toContain('no treino');
    expect(card('F')?.getAttribute('href')).toBe('/biblioteca/F');

    TestBed.inject(PracticeDraftService).swapVariant('F');
    TestBed.inject(ChordNamingService).set('pt');
    update();
    expect(card('Fá')?.textContent).toContain('no treino');
    expect(host.querySelector('.group h2')?.textContent?.trim()).toBe('Dó');
  });
});
