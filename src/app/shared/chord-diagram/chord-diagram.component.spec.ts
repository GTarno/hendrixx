import { TestBed } from '@angular/core/testing';
import catalogData from '../../../../data/chords.json';
import { Chord, isChord } from '../../core/models';
import { ChordDiagramComponent, ChordDiagramSize } from './chord-diagram.component';
import { describeChord, diagramGeometry, fretY, stringX } from './chord-diagram.geometry';

const catalog = (catalogData as { chords: unknown[] }).chords.filter(isChord);
const chord = (id: string): Chord => {
  const found = catalog.find((c) => c.id === id);
  if (!found) throw new Error(`acorde ${id} não está no catálogo`);
  return found;
};

describe('diagramGeometry', () => {
  it('C: capotraste, X na 6ª, ○ na 4ª e 1ª, três dedos', () => {
    const g = diagramGeometry(chord('C'), true);
    expect(g.nut).not.toBeNull();
    expect(g.baseFretLabel).toBeNull();
    expect(g.markers.map((m) => [m.x, m.kind])).toEqual([
      [stringX(0), 'muted'],
      [stringX(3), 'open'],
      [stringX(5), 'open'],
    ]);
    expect(g.dots.map((d) => [d.x, d.finger])).toEqual([
      [stringX(1), 3],
      [stringX(2), 2],
      [stringX(4), 1],
    ]);
    // Casa 3 da 5ª corda: centro da terceira casa da grade.
    expect(g.dots[0].y).toBe((fretY(2) + fretY(3)) / 2);
    expect(g.notes.map((n) => n.name)).toEqual(['C', 'E', 'G', 'C', 'E']);
    expect(g.barre).toBeNull();
  });

  it('F: pestana de 6 cordas na 1ª casa e só os dedos fora dela', () => {
    const g = diagramGeometry(chord('F'), false);
    expect(g.barre).toMatchObject({ x: stringX(0) - 9, width: stringX(5) - stringX(0) + 18 });
    expect(g.barre?.labelY).toBe((fretY(0) + fretY(1)) / 2);
    expect(g.dots.map((d) => d.finger)).toEqual([3, 4, 2]);
    expect(g.markers).toEqual([]);
  });

  it('Cm: começa na 3ª casa, sem capotraste e com o número da casa', () => {
    const g = diagramGeometry(chord('Cm'), false);
    expect(g.nut).toBeNull();
    expect(g.frets).toHaveLength(6);
    expect(g.baseFretLabel?.text).toBe('3ª');
    // Pestana na casa 3 = primeira casa da grade.
    expect(g.barre?.labelY).toBe((fretY(0) + fretY(1)) / 2);
    expect(g.barre?.x).toBe(stringX(1) - 9);
  });

  it('notas só aparecem quando pedidas, e o diagrama fica mais baixo sem elas', () => {
    expect(diagramGeometry(chord('D'), false).notes).toEqual([]);
    expect(diagramGeometry(chord('D'), false).height).toBeLessThan(
      diagramGeometry(chord('D'), true).height,
    );
  });

  it('todos os 71 acordes cabem na grade de 5 casas', () => {
    expect(catalog).toHaveLength(71);
    for (const c of catalog) {
      const g = diagramGeometry(c, true);
      for (const d of g.dots) {
        expect(d.y, c.id).toBeGreaterThan(fretY(0));
        expect(d.y, c.id).toBeLessThan(fretY(5));
      }
      expect(g.notes, c.id).toHaveLength(c.notes.length);
    }
  });
});

describe('describeChord', () => {
  it('descreve cada corda para leitores de tela', () => {
    expect(describeChord(chord('D'))).toBe(
      'Ré (D): 6ª abafada, 5ª abafada, 4ª solta, 3ª na casa 2 com o dedo 1, ' +
        '2ª na casa 3 com o dedo 3, 1ª na casa 2 com o dedo 2',
    );
  });

  it('inclui a pestana', () => {
    expect(describeChord(chord('Bm'))).toContain('pestana na casa 2, da 5ª à 1ª corda');
  });
});

describe('ChordDiagramComponent', () => {
  function render(
    c: Chord,
    inputs: { size?: ChordDiagramSize; showFingers?: boolean; showNotes?: boolean } = {},
  ) {
    const fixture = TestBed.createComponent(ChordDiagramComponent);
    fixture.componentRef.setInput('chord', c);
    for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const texts = (cls: string) =>
      [...host.querySelectorAll(`text.${cls}`)].map((t) => t.textContent?.trim());
    return { fixture, host, texts };
  }

  it('desenha o SVG acessível do acorde', () => {
    const { host } = render(chord('C'));
    const svg = host.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toContain('Dó (C): 6ª abafada');
    expect(host.querySelectorAll('line.string')).toHaveLength(6);
    expect(host.querySelectorAll('line.nut')).toHaveLength(1);
    expect(host.querySelectorAll('path.muted')).toHaveLength(1);
    expect(host.querySelectorAll('circle.open')).toHaveLength(2);
    expect(host.querySelectorAll('circle.dot')).toHaveLength(3);
  });

  it('tamanho md (padrão): dedos sim, notas não', () => {
    const { host, texts } = render(chord('C'));
    expect(host.getAttribute('data-size')).toBe('md');
    expect(texts('finger')).toEqual(['3', '2', '1']);
    expect(texts('note')).toEqual([]);
  });

  it('tamanho lg: dedos e notas', () => {
    const { texts } = render(chord('E'), { size: 'lg' });
    expect(texts('finger')).toEqual(['2', '3', '1']);
    expect(texts('note')).toEqual(['E', 'B', 'E', 'G#', 'B', 'E']);
  });

  it('tamanho mini: só a forma', () => {
    const { host, texts } = render(chord('F'), { size: 'mini' });
    expect(host.getAttribute('data-size')).toBe('mini');
    expect(texts('finger')).toEqual([]);
    expect(texts('note')).toEqual([]);
    expect(host.querySelectorAll('rect.barre')).toHaveLength(1);
  });

  it('showFingers e showNotes explícitos vencem o padrão do tamanho', () => {
    const { texts } = render(chord('Am'), { size: 'mini', showFingers: true, showNotes: true });
    expect(texts('finger')).toEqual(['2', '3', '1']);
    expect(texts('note')).toEqual(['A', 'E', 'A', 'C', 'E']);
  });

  it('pestana com o dedo 1 e casa inicial fora da 1ª', () => {
    const { host, texts } = render(chord('Cm'));
    expect(host.querySelectorAll('rect.barre')).toHaveLength(1);
    expect(host.querySelectorAll('line.nut')).toHaveLength(0);
    expect(texts('base-fret')).toEqual(['3ª']);
    expect(texts('finger')).toEqual(['1', '3', '4', '2']);
  });

  it('atualiza quando o acorde muda', () => {
    const { fixture, host } = render(chord('C'));
    fixture.componentRef.setInput('chord', chord('G'));
    fixture.detectChanges();
    expect(host.querySelector('svg')?.getAttribute('aria-label')).toMatch(/^Sol \(G\)/);
    expect(host.querySelectorAll('path.muted')).toHaveLength(0);
  });

  it('renderiza todos os 71 acordes do catálogo', () => {
    for (const c of catalog) {
      const { host } = render(c, { size: 'lg' });
      expect(host.querySelectorAll('line.string'), c.id).toHaveLength(6);
    }
  });
});
