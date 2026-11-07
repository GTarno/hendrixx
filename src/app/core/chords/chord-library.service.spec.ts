import { TestBed } from '@angular/core/testing';
import catalogData from '../../../../data/chords.json';
import { Chord, DEFAULT_PRACTICE_CONFIG, validatePracticeConfig } from '../models';
import {
  CHORD_CATALOG,
  ChordLibraryService,
  UNLOCKED_CATALOG_PHASE,
  parseChordCatalog,
} from './chord-library.service';

// Na ordem do catálogo: maiores e depois menores.
const PHASE_1 = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Dm', 'Em', 'Am'];

describe('parseChordCatalog', () => {
  const valid = (catalogData as { chords: Chord[] }).chords;
  const withChords = (chords: unknown[]) => ({ chords });

  it('aceita o catálogo real de data/chords.json (71 acordes)', () => {
    expect(parseChordCatalog(catalogData)).toHaveLength(71);
  });

  it('recusa um arquivo sem a lista de acordes', () => {
    expect(() => parseChordCatalog({})).toThrow('sem a lista');
    expect(() => parseChordCatalog(null)).toThrow('sem a lista');
  });

  it('recusa acorde em formato inválido, citando o id', () => {
    const broken = { ...valid[0], strings: [] };
    expect(() => parseChordCatalog(withChords([broken, valid[1]]))).toThrow(
      /formato inválido: C\b/,
    );
  });

  it('recusa ids repetidos', () => {
    expect(() => parseChordCatalog(withChords([valid[0], valid[0]]))).toThrow('ids repetidos: C');
  });

  it('recusa variação sem o acorde principal', () => {
    const variant = valid.find((c) => c.id === 'F-simples');
    expect(() => parseChordCatalog(withChords([variant]))).toThrow(
      'variações sem acorde principal: F-simples',
    );
  });
});

describe('ChordLibraryService', () => {
  describe('com o catálogo real (MVP: só a fase 1)', () => {
    let library: ChordLibraryService;

    beforeEach(() => {
      library = TestBed.inject(ChordLibraryService);
    });

    it('libera só a fase 1', () => {
      expect(library.unlockedPhase()).toBe(1);
      expect(library.all().map((c) => c.id)).toEqual(PHASE_1);
      expect(library.main().map((c) => c.id)).toEqual(PHASE_1);
    });

    it('encontra acordes liberados pelo id', () => {
      expect(library.byId('Am')?.labelPt).toBe('Lá menor');
      expect(library.byId('F')?.barre).toEqual({ fret: 1, fromString: 6, toString: 1 });
    });

    it('não expõe acordes de fases ainda não liberadas', () => {
      expect(library.byId('C7')).toBeUndefined();
      expect(library.byPhase(3)).toEqual([]);
      expect(library.variantsOf('F')).toEqual([]);
    });

    it('fornece os ids liberados para validar o treino', () => {
      expect(validatePracticeConfig(DEFAULT_PRACTICE_CONFIG, library.ids())).toEqual([]);
      const locked = { ...DEFAULT_PRACTICE_CONFIG, chordIds: ['C', 'C7'] };
      expect(validatePracticeConfig(locked, library.ids()).map((e) => e.code)).toEqual([
        'unknown-chord',
      ]);
    });

    it('liberar fases atualiza todas as consultas', () => {
      library.unlockUpTo(4);
      expect(library.all()).toHaveLength(71);
      expect(library.main()).toHaveLength(60);
      expect(library.byPhase(2)).toHaveLength(14);
      expect(library.byPhase(3)).toHaveLength(36);
      expect(library.byId('C7')?.labelCifra).toBe('C7');
      expect(library.variantsOf('F').map((c) => c.id)).toEqual(['F-simples']);
      expect(library.ids().has('Bm7-aberto')).toBe(true);
    });
  });

  it('aceita outro catálogo e outra fase inicial por injeção', () => {
    const real = parseChordCatalog(catalogData);
    const mini = real.filter((c) => ['C', 'G', 'G7'].includes(c.id));
    TestBed.configureTestingModule({
      providers: [
        { provide: CHORD_CATALOG, useValue: mini },
        { provide: UNLOCKED_CATALOG_PHASE, useValue: 3 },
      ],
    });
    const library = TestBed.inject(ChordLibraryService);
    expect(library.all().map((c) => c.id)).toEqual(['C', 'G', 'G7']);
  });
});
