import { TestBed } from '@angular/core/testing';
import catalogData from '../../../../data/chords.json';
import { Chord, DIAGRAM_FRETS, isChord } from '../../core/models';
import { ChordDiagramComponent } from './chord-diagram.component';

/**
 * Testes de regressão dos 10 acordes iniciais (issue #10). Os snapshots ficam em
 * __snapshots__/ e foram conferidos contra as fontes de estudo. Se um diagrama mudar de
 * propósito, confira de novo e atualize com `npx ng test --update`.
 */

const PHASE_1 = (catalogData as { chords: unknown[] }).chords
  .filter(isChord)
  .filter((c) => c.catalogPhase === 1);

/** Desenha o acorde em texto, legível no arquivo de snapshot. */
function asciiDiagram(chord: Chord): string {
  const top = chord.strings
    .map((s) => (s.type === 'muted' ? 'x' : s.type === 'open' ? 'o' : ' '))
    .join(' ');
  const head = chord.baseFret === 1 ? '===========' : `----------- ${chord.baseFret}ª`;
  const rows: string[] = [];
  for (let row = 0; row < DIAGRAM_FRETS; row++) {
    const fret = chord.baseFret + row;
    rows.push(
      chord.strings
        .map((s) => (s.type === 'fretted' && s.fret === fret ? String(s.finger) : '|'))
        .join(' '),
    );
  }
  const notes: string[] = [];
  let k = 0;
  for (const s of chord.strings) notes.push(s.type === 'muted' ? ' ' : chord.notes[k++]);
  return [
    '',
    `${chord.labelCifra} · ${chord.labelPt}`,
    top,
    head,
    ...rows,
    notes.join(' '),
    '',
  ].join('\n');
}

/** SVG renderizado sem os comentários e atributos internos do Angular. */
function normalizedSvg(chord: Chord): string {
  const fixture = TestBed.createComponent(ChordDiagramComponent);
  fixture.componentRef.setInput('chord', chord);
  fixture.componentRef.setInput('size', 'lg');
  fixture.detectChanges();
  const svg = (fixture.nativeElement as HTMLElement).querySelector('svg');
  return (svg?.outerHTML ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s_ng(content|host)-[\w-]+=""/g, '')
    .replace(/></g, '>\n<');
}

describe('diagramas da fase 1 (regressão)', () => {
  it('tem os 10 acordes iniciais', () => {
    expect(PHASE_1.map((c) => c.id)).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Dm', 'Em', 'Am']);
  });

  for (const chord of PHASE_1) {
    it(`${chord.id}: formação conferida`, () => {
      expect(asciiDiagram(chord)).toMatchSnapshot();
    });

    it(`${chord.id}: SVG renderizado`, () => {
      expect(normalizedSvg(chord)).toMatchSnapshot();
    });
  }
});
