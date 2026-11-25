import { Chord, ChordQuality, Difficulty } from '../models';

/** Tônicas na ordem do braço, com os nomes enarmônicos juntos (C# e Db no mesmo grupo). */
export const ROOT_GROUPS = [
  { roots: ['C'], cifra: 'C', pt: 'Dó' },
  { roots: ['C#', 'Db'], cifra: 'C# / Db', pt: 'Dó# / Réb' },
  { roots: ['D'], cifra: 'D', pt: 'Ré' },
  { roots: ['D#', 'Eb'], cifra: 'D# / Eb', pt: 'Ré# / Mib' },
  { roots: ['E'], cifra: 'E', pt: 'Mi' },
  { roots: ['F'], cifra: 'F', pt: 'Fá' },
  { roots: ['F#', 'Gb'], cifra: 'F# / Gb', pt: 'Fá# / Solb' },
  { roots: ['G'], cifra: 'G', pt: 'Sol' },
  { roots: ['G#', 'Ab'], cifra: 'G# / Ab', pt: 'Sol# / Láb' },
  { roots: ['A'], cifra: 'A', pt: 'Lá' },
  { roots: ['A#', 'Bb'], cifra: 'A# / Bb', pt: 'Lá# / Sib' },
  { roots: ['B'], cifra: 'B', pt: 'Si' },
] as const;

export type RootGroup = (typeof ROOT_GROUPS)[number];

export const QUALITY_LABELS: Record<ChordQuality, string> = {
  maj: 'Maior',
  min: 'Menor',
  '7': '7',
  m7: 'm7',
  maj7: '7M',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: 'Fácil',
  2: 'Médio',
  3: 'Com pestana',
};

export interface ChordFilter {
  /** Texto da busca: cifra, português ou nome enarmônico ("Am", "Lá", "C#", "Db"). */
  query: string;
  quality: ChordQuality | null;
  difficulty: Difficulty | null;
}

/** Minúsculas, sem acentos e com espaços simples: "Lá  Menor" → "la menor". */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * `key` começa com `query` sem pegar outra nota: "a" acha "am" e "a7", mas não "ab";
 * "la" acha "la menor", mas não "lab". O que vem depois não pode ser um acidente.
 */
function startsWithNote(key: string, query: string): boolean {
  if (!key.startsWith(query)) return false;
  const next = key.charAt(query.length);
  // "am" não deve achar "amaj7" (A7M) cortando o "maj" no meio.
  if (query.endsWith('m') && key.startsWith('aj', query.length)) return false;
  return next !== '#' && next !== 'b';
}

/** Se o acorde corresponde ao texto buscado (vazio corresponde a tudo). */
export function matchesQuery(chord: Chord, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  const cifra = [chord.labelCifra, chord.id, ...chord.aliases].map(normalize);
  if (cifra.some((key) => startsWithNote(key, q))) return true;
  // Português: a partir do início de qualquer palavra ("menor", "7m", "sol menor").
  const pt = normalize(`${chord.labelPt} ${chord.variantName ?? ''}`);
  const words = pt.split(' ').map((_, i, all) => all.slice(i).join(' '));
  return words.some((key) => startsWithNote(key, q));
}

function matchesFilter(chord: Chord, filter: ChordFilter): boolean {
  return (
    (filter.quality === null || chord.quality === filter.quality) &&
    (filter.difficulty === null || chord.difficulty === filter.difficulty) &&
    matchesQuery(chord, filter.query)
  );
}

/**
 * Acordes principais que passam no filtro. Um acorde também aparece quando uma variação dele
 * passa (ex.: F, que tem pestana, aparece em "Médio" por causa do F simplificado).
 */
export function filterChords(chords: readonly Chord[], filter: ChordFilter): Chord[] {
  const matching = new Set(
    chords.filter((c) => matchesFilter(c, filter)).map((c) => c.variantOf ?? c.id),
  );
  return chords.filter((c) => c.variantOf === undefined && matching.has(c.id));
}

export interface ChordGroup {
  group: RootGroup;
  chords: Chord[];
}

/** Agrupa por tônica, na ordem do braço; grupos vazios ficam de fora. */
export function groupByRoot(chords: readonly Chord[]): ChordGroup[] {
  return ROOT_GROUPS.map((group) => ({
    group,
    chords: chords.filter((c) => (group.roots as readonly string[]).includes(c.root)),
  })).filter((g) => g.chords.length > 0);
}

/** Nome curto da variação: "Simplificado (sem pestana inteira)" → "Simplificado". */
export function variantShortName(chord: Chord): string | null {
  return chord.variantName ? chord.variantName.replace(/\s*\(.*\)$/, '') : null;
}
