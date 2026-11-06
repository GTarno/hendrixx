/**
 * Modelo de acorde. Os diagramas são dados, não imagens: o componente de diagrama desenha
 * qualquer acorde a partir destes campos. Fonte: data/chords.json (ver docs/chord-catalog.md).
 */

export const CHORD_QUALITIES = ['maj', 'min', '7', 'm7', 'maj7'] as const;
export type ChordQuality = (typeof CHORD_QUALITIES)[number];

export type Finger = 1 | 2 | 3 | 4;
export type Difficulty = 1 | 2 | 3;
export type CatalogPhase = 1 | 2 | 3 | 4;

/** Número da corda no violão: 6 = Mi grave, 1 = Mi agudo. */
export type StringNumber = 1 | 2 | 3 | 4 | 5 | 6;

/** Estado de uma corda. `fret` é a casa absoluta no braço, não relativa ao `baseFret`. */
export type StringState =
  { type: 'muted' } | { type: 'open' } | { type: 'fretted'; fret: number; finger: Finger };

export interface Barre {
  fret: number;
  /** Corda mais grave coberta pela pestana (ex.: 6). */
  fromString: StringNumber;
  /** Corda mais aguda coberta pela pestana (ex.: 1). */
  toString: StringNumber;
}

export interface Chord {
  /** Identificador único: "C", "Am", "G7", "Cmaj7", "F-simples". */
  id: string;
  /** Tônica com acidente: "C", "F#", "Bb". */
  root: string;
  quality: ChordQuality;
  /** Nome em cifra: "C", "Am", "C7M". */
  labelCifra: string;
  /** Nome em português: "Dó", "Lá menor", "Dó 7M". */
  labelPt: string;
  /** Sempre 6 cordas, da 6ª (Mi grave) para a 1ª (Mi agudo). */
  strings: StringState[];
  barre?: Barre;
  /** Casa do topo do diagrama; 1 mostra o capotraste. */
  baseFret: number;
  /** Notas soando, da corda mais grave para a mais aguda. */
  notes: string[];
  difficulty: Difficulty;
  catalogPhase: CatalogPhase;
  /** Nomes enarmônicos aceitos na busca ("C#" para "Db"). */
  aliases: string[];
  /** Id do acorde principal, quando este é uma variação. */
  variantOf?: string;
  variantName?: string;
}

/** Modo de exibição dos nomes (RN8). É preferência de tela, não parte do treino. */
export type ChordNaming = 'cifra' | 'pt';

export const STRING_COUNT = 6;
/** Casas desenhadas no diagrama. */
export const DIAGRAM_FRETS = 5;

export function chordLabel(chord: Chord, naming: ChordNaming): string {
  return naming === 'cifra' ? chord.labelCifra : chord.labelPt;
}

// ---------- validação em tempo de execução ----------

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isPositiveInt = (v: unknown): v is number => Number.isInteger(v) && (v as number) > 0;
const isStringNumber = (v: unknown): v is StringNumber =>
  Number.isInteger(v) && (v as number) >= 1 && (v as number) <= STRING_COUNT;
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

function isStringState(v: unknown): v is StringState {
  if (!isObject(v)) return false;
  if (v['type'] === 'muted' || v['type'] === 'open') return true;
  return (
    v['type'] === 'fretted' &&
    isPositiveInt(v['fret']) &&
    [1, 2, 3, 4].includes(v['finger'] as number)
  );
}

function isBarre(v: unknown): v is Barre {
  return (
    isObject(v) &&
    isPositiveInt(v['fret']) &&
    isStringNumber(v['fromString']) &&
    isStringNumber(v['toString']) &&
    v['fromString'] > v['toString']
  );
}

/**
 * Confere a forma de um acorde vindo de JSON. Não valida teoria musical (isso é feito por
 * tools/build-chord-catalog.mjs); valida o que a interface precisa para desenhar o diagrama.
 */
export function isChord(v: unknown): v is Chord {
  if (!isObject(v)) return false;
  const strings = v['strings'];
  const notes = v['notes'];
  const aliases = v['aliases'];
  if (
    !isNonEmptyString(v['id']) ||
    !isNonEmptyString(v['root']) ||
    !CHORD_QUALITIES.includes(v['quality'] as ChordQuality) ||
    !isNonEmptyString(v['labelCifra']) ||
    !isNonEmptyString(v['labelPt']) ||
    !Array.isArray(strings) ||
    strings.length !== STRING_COUNT ||
    !strings.every(isStringState) ||
    !isPositiveInt(v['baseFret']) ||
    !Array.isArray(notes) ||
    !notes.every(isNonEmptyString) ||
    ![1, 2, 3].includes(v['difficulty'] as number) ||
    ![1, 2, 3, 4].includes(v['catalogPhase'] as number) ||
    !Array.isArray(aliases) ||
    !aliases.every(isNonEmptyString)
  ) {
    return false;
  }
  if (v['barre'] !== undefined && !isBarre(v['barre'])) return false;
  if (v['variantOf'] !== undefined && !isNonEmptyString(v['variantOf'])) return false;
  if (v['variantName'] !== undefined && !isNonEmptyString(v['variantName'])) return false;

  const sounding = (strings as StringState[]).filter((s) => s.type !== 'muted').length;
  if (notes.length !== sounding) return false;

  // Todas as casas pressionadas precisam caber nas 5 casas desenhadas a partir do baseFret.
  const baseFret = v['baseFret'] as number;
  return (strings as StringState[]).every(
    (s) => s.type !== 'fretted' || (s.fret >= baseFret && s.fret < baseFret + DIAGRAM_FRETS),
  );
}
