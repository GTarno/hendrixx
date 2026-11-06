import catalog from '../../../../data/chords.json';
import { Chord, chordLabel, isChord } from './chord.model';

const C: Chord = {
  id: 'C',
  root: 'C',
  quality: 'maj',
  labelCifra: 'C',
  labelPt: 'Dó',
  strings: [
    { type: 'muted' },
    { type: 'fretted', fret: 3, finger: 3 },
    { type: 'fretted', fret: 2, finger: 2 },
    { type: 'open' },
    { type: 'fretted', fret: 1, finger: 1 },
    { type: 'open' },
  ],
  baseFret: 1,
  notes: ['C', 'E', 'G', 'C', 'E'],
  difficulty: 1,
  catalogPhase: 1,
  aliases: [],
};

const clone = (): Record<string, unknown> => JSON.parse(JSON.stringify(C));

describe('Chord', () => {
  describe('chordLabel', () => {
    it('mostra cifra ou português conforme a nomenclatura (RN8)', () => {
      expect(chordLabel(C, 'cifra')).toBe('C');
      expect(chordLabel(C, 'pt')).toBe('Dó');
    });
  });

  describe('isChord', () => {
    it('aceita um acorde válido', () => {
      expect(isChord(C)).toBe(true);
    });

    it('aceita pestana e baseFret maior que 1', () => {
      const cm = {
        ...clone(),
        id: 'Cm',
        quality: 'min',
        strings: [
          { type: 'muted' },
          { type: 'fretted', fret: 3, finger: 1 },
          { type: 'fretted', fret: 5, finger: 3 },
          { type: 'fretted', fret: 5, finger: 4 },
          { type: 'fretted', fret: 4, finger: 2 },
          { type: 'fretted', fret: 3, finger: 1 },
        ],
        barre: { fret: 3, fromString: 5, toString: 1 },
        baseFret: 3,
        notes: ['C', 'G', 'C', 'Eb', 'G'],
      };
      expect(isChord(cm)).toBe(true);
    });

    it.each([
      ['sem id', { id: '' }],
      ['qualidade desconhecida', { quality: 'sus4' }],
      ['menos de 6 cordas', { strings: C.strings.slice(0, 5) }],
      [
        'dedo inválido',
        { strings: [...C.strings.slice(0, 5), { type: 'fretted', fret: 1, finger: 5 }] },
      ],
      [
        'casa zero como pressionada',
        { strings: [...C.strings.slice(0, 5), { type: 'fretted', fret: 0, finger: 1 }] },
      ],
      ['notas não batem com as cordas soando', { notes: ['C', 'E', 'G'] }],
      ['dificuldade fora de 1 a 3', { difficulty: 4 }],
      ['fase do catálogo inválida', { catalogPhase: 5 }],
      ['pestana invertida', { barre: { fret: 1, fromString: 1, toString: 6 } }],
      ['casa fora das 5 desenhadas', { baseFret: 4 }],
      ['aliases ausente', { aliases: undefined }],
    ])('recusa: %s', (_, patch) => {
      expect(isChord({ ...clone(), ...patch })).toBe(false);
    });

    it('recusa valores que não são objetos', () => {
      expect(isChord(null)).toBe(false);
      expect(isChord('C')).toBe(false);
    });
  });

  describe('catálogo data/chords.json', () => {
    const chords: unknown[] = catalog.chords;

    it('tem todos os acordes no formato do modelo', () => {
      const invalid = chords.filter((c) => !isChord(c)).map((c) => (c as { id?: string }).id);
      expect(invalid).toEqual([]);
    });

    it('tem ids únicos', () => {
      const ids = (chords as Chord[]).map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('tem os 10 acordes da fase 1', () => {
      const phase1 = (chords as Chord[]).filter((c) => c.catalogPhase === 1).map((c) => c.id);
      expect(phase1.sort()).toEqual(['A', 'Am', 'B', 'C', 'D', 'Dm', 'E', 'Em', 'F', 'G']);
    });

    it('toda variação aponta para um acorde existente', () => {
      const ids = new Set((chords as Chord[]).map((c) => c.id));
      const orphans = (chords as Chord[]).filter((c) => c.variantOf && !ids.has(c.variantOf));
      expect(orphans).toEqual([]);
    });
  });
});
