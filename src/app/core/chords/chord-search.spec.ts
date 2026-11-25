import catalogData from '../../../../data/chords.json';
import { parseChordCatalog } from './chord-library.service';
import {
  ChordFilter,
  filterChords,
  groupByRoot,
  matchesQuery,
  normalize,
  variantShortName,
} from './chord-search';

const catalog = parseChordCatalog(catalogData);
const byId = (id: string) => {
  const chord = catalog.find((c) => c.id === id);
  if (!chord) throw new Error(`sem ${id}`);
  return chord;
};
const all: ChordFilter = { query: '', quality: null, difficulty: null };
const ids = (filter: Partial<ChordFilter>) =>
  filterChords(catalog, { ...all, ...filter }).map((c) => c.id);

describe('busca de acordes', () => {
  it('normaliza acentos, caixa e espaços', () => {
    expect(normalize('  Lá   Menor ')).toBe('la menor');
    expect(normalize('Fá#')).toBe('fa#');
  });

  it('acha pela cifra, sem confundir com outra nota', () => {
    expect(ids({ query: 'Am' })).toEqual(['Am', 'Am7']);
    expect(ids({ query: 'a' })).toEqual(['A', 'Am', 'A7', 'Am7', 'Amaj7']);
    expect(ids({ query: 'A' })).not.toContain('Ab');
    expect(ids({ query: 'C7M' })).toEqual(['Cmaj7']);
  });

  it('acha pelo nome em português, com ou sem acento', () => {
    expect(ids({ query: 'Lá' })).toEqual(ids({ query: 'la' }));
    expect(ids({ query: 'la menor' })).toEqual(['Am', 'Am7']);
    expect(ids({ query: 'Lá' })).not.toContain('Ab');
    expect(ids({ query: 'menor' })).toHaveLength(24);
    expect(ids({ query: '7M' })).toHaveLength(12);
  });

  it('acha pelos nomes enarmônicos', () => {
    expect(ids({ query: 'C#' })).toEqual(['Db', 'C#m', 'Db7', 'C#m7', 'Dbmaj7']);
    expect(ids({ query: 'Db' })).toEqual(ids({ query: 'C#' }));
    expect(ids({ query: 'Gbm' })).toEqual(['F#m', 'F#m7']);
  });

  it('acha o acorde principal pelo nome da variação', () => {
    expect(ids({ query: 'simplificado' })).toEqual(['F']);
    expect(matchesQuery(byId('F-simples'), 'Fá')).toBe(true);
  });

  it('filtra por tipo e dificuldade', () => {
    expect(ids({ quality: 'maj7' })).toHaveLength(12);
    expect(ids({ quality: 'min', query: 'si' })).toEqual(['Bm']);
    const easy = ids({ difficulty: 1 });
    expect(easy).toContain('C');
    expect(easy).not.toContain('B');
    // F tem pestana, mas o F simplificado é médio.
    expect(ids({ difficulty: 2 })).toContain('F');
  });

  it('sem filtro, lista só os acordes principais', () => {
    expect(ids({})).toHaveLength(60);
    expect(ids({}).some((id) => byId(id).variantOf)).toBe(false);
  });

  it('agrupa por tônica, juntando os enarmônicos', () => {
    const groups = groupByRoot(filterChords(catalog, all));
    expect(groups.map((g) => g.group.pt)).toEqual([
      'Dó',
      'Dó# / Réb',
      'Ré',
      'Ré# / Mib',
      'Mi',
      'Fá',
      'Fá# / Solb',
      'Sol',
      'Sol# / Láb',
      'Lá',
      'Lá# / Sib',
      'Si',
    ]);
    expect(groups[1].chords.map((c) => c.id)).toEqual(['Db', 'C#m', 'Db7', 'C#m7', 'Dbmaj7']);
    expect(groupByRoot(filterChords(catalog, { ...all, query: 'Am' }))).toHaveLength(1);
  });

  it('nome curto da variação', () => {
    expect(variantShortName(byId('F-simples'))).toBe('Simplificado');
    expect(variantShortName(byId('C-pestana3'))).toBe('Pestana na 3ª casa');
    expect(variantShortName(byId('F'))).toBeNull();
  });
});
