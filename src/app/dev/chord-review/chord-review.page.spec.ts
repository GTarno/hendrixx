import { TestBed } from '@angular/core/testing';
import { routes } from '../../app.routes';
import { ChordReviewPage, fingersText, shapeText } from './chord-review.page';

describe('ChordReviewPage', () => {
  function render() {
    const fixture = TestBed.createComponent(ChordReviewPage);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    return { fixture, host };
  }

  it('mostra os 10 acordes da fase 1 nos três tamanhos', () => {
    const { host } = render();
    const cards = host.querySelectorAll('li.card');
    expect(cards).toHaveLength(10);
    expect([...host.querySelectorAll('.cifra')].map((e) => e.textContent?.trim())).toEqual([
      'C',
      'D',
      'E',
      'F',
      'G',
      'A',
      'B',
      'Dm',
      'Em',
      'Am',
    ]);
    const sizes = [...cards[0].querySelectorAll('app-chord-diagram')].map((e) =>
      e.getAttribute('data-size'),
    );
    expect(sizes).toEqual(['lg', 'md', 'mini']);
  });

  it('mostra formação, dedos, pestana e notas em texto', () => {
    const { host } = render();
    const f = host.querySelectorAll('li.card')[3];
    const facts = [...f.querySelectorAll('dd')].map((e) => e.textContent?.trim());
    expect(facts).toEqual([
      '1 3 3 2 1 1',
      '1 3 4 2 1 1',
      'casa 1, 6ª → 1ª',
      'F C F A C F',
      '●●●',
      'F',
    ]);
  });

  it('troca de fase do catálogo', () => {
    const { fixture, host } = render();
    const buttons = host.querySelectorAll<HTMLButtonElement>('.phases button');
    buttons[1].click();
    fixture.detectChanges();
    expect(host.querySelectorAll('li.card')).toHaveLength(14);
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    buttons[3].click();
    fixture.detectChanges();
    expect(host.querySelectorAll('.variant')).toHaveLength(11);
  });

  it('formata formação e dedos', () => {
    const strings = [
      { type: 'muted' },
      { type: 'fretted', fret: 3, finger: 3 },
      { type: 'open' },
    ] as const;
    expect(shapeText([...strings])).toBe('x 3 0');
    expect(fingersText([...strings])).toBe('– 3 –');
  });

  it('a rota de conferência só existe em desenvolvimento', () => {
    // Os testes rodam em modo de desenvolvimento.
    expect(routes.map((r) => r.path)).toEqual(['dev/acordes']);
  });
});
