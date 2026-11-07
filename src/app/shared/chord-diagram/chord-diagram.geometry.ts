import { Chord, DIAGRAM_FRETS, STRING_COUNT } from '../../core/models';

/**
 * Geometria do diagrama de acorde, separada do template para ser testada sem DOM.
 * Coordenadas no viewBox do SVG. Corda de índice 0 = 6ª (Mi grave), à esquerda.
 */

const STRING_GAP = 20;
const FRET_GAP = 26;
const LEFT = 30;
const TOP = 32;
const DOT_RADIUS = 9;
const NOTES_GAP = 22;
const MARKER_Y = 16;

export const VIEWBOX_WIDTH = 160;

export const stringX = (index: number): number => LEFT + index * STRING_GAP;
export const fretY = (line: number): number => TOP + line * FRET_GAP;

export interface DiagramMarker {
  x: number;
  y: number;
  kind: 'muted' | 'open';
  /** Traço do "X" quando a corda é abafada. */
  path: string | null;
}

export interface DiagramDot {
  x: number;
  y: number;
  finger: number;
}

export interface DiagramBarre {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Centro da ponta mais grave, onde vai o número do dedo (1). */
  labelX: number;
  labelY: number;
}

export interface DiagramNote {
  x: number;
  y: number;
  name: string;
}

export interface DiagramGeometry {
  height: number;
  strings: { x: number; y1: number; y2: number; width: number }[];
  frets: { y: number; x1: number; x2: number }[];
  /** Capotraste desenhado quando o diagrama começa na 1ª casa. */
  nut: { y: number; x1: number; x2: number } | null;
  /** Número da casa inicial ("3ª") quando o diagrama não começa na 1ª. */
  baseFretLabel: { x: number; y: number; text: string } | null;
  markers: DiagramMarker[];
  barre: DiagramBarre | null;
  dots: DiagramDot[];
  notes: DiagramNote[];
}

export function diagramGeometry(chord: Chord, showNotes: boolean): DiagramGeometry {
  const base = chord.baseFret;
  const left = stringX(0);
  const right = stringX(STRING_COUNT - 1);
  /** Centro vertical da casa absoluta `fret` dentro da grade. */
  const fretCenterY = (fret: number) => (fretY(fret - base) + fretY(fret - base + 1)) / 2;

  const strings = Array.from({ length: STRING_COUNT }, (_, i) => ({
    x: stringX(i),
    y1: fretY(0),
    y2: fretY(DIAGRAM_FRETS),
    // Cordas graves um pouco mais grossas, como no violão.
    width: +(2.4 - i * 0.28).toFixed(2),
  }));

  const frets = Array.from({ length: DIAGRAM_FRETS + 1 }, (_, line) => ({
    y: fretY(line),
    x1: left,
    x2: right,
  })).filter((_, line) => !(line === 0 && base === 1));

  const markers: DiagramMarker[] = [];
  chord.strings.forEach((s, i) => {
    if (s.type === 'fretted') return;
    const x = stringX(i);
    const y = MARKER_Y;
    const r = 5;
    const path =
      s.type === 'muted'
        ? `M${x - r} ${y - r} L${x + r} ${y + r} M${x + r} ${y - r} L${x - r} ${y + r}`
        : null;
    markers.push({ x, y, kind: s.type, path });
  });

  const b = chord.barre;
  const barre: DiagramBarre | null = b
    ? (() => {
        const x1 = stringX(STRING_COUNT - b.fromString);
        const x2 = stringX(STRING_COUNT - b.toString);
        const y = fretCenterY(b.fret);
        return {
          x: x1 - DOT_RADIUS,
          y: y - DOT_RADIUS,
          width: x2 - x1 + 2 * DOT_RADIUS,
          height: 2 * DOT_RADIUS,
          labelX: x1,
          labelY: y,
        };
      })()
    : null;

  const dots: DiagramDot[] = [];
  chord.strings.forEach((s, i) => {
    if (s.type !== 'fretted') return;
    const stringNumber = STRING_COUNT - i;
    const coveredByBarre =
      b !== undefined &&
      s.fret === b.fret &&
      stringNumber <= b.fromString &&
      stringNumber >= b.toString;
    if (!coveredByBarre) dots.push({ x: stringX(i), y: fretCenterY(s.fret), finger: s.finger });
  });

  const notes: DiagramNote[] = [];
  if (showNotes) {
    let k = 0;
    chord.strings.forEach((s, i) => {
      if (s.type === 'muted') return;
      notes.push({ x: stringX(i), y: fretY(DIAGRAM_FRETS) + NOTES_GAP, name: chord.notes[k++] });
    });
  }

  return {
    height: showNotes ? 196 : 172,
    strings,
    frets,
    nut: base === 1 ? { y: fretY(0), x1: left, x2: right } : null,
    baseFretLabel:
      base === 1 ? null : { x: left - 9, y: (fretY(0) + fretY(1)) / 2, text: `${base}ª` },
    markers,
    barre,
    dots,
    notes,
  };
}

/** Texto para leitores de tela: nome do acorde e o que fazer em cada corda. */
export function describeChord(chord: Chord): string {
  const parts = chord.strings.map((s, i) => {
    const n = STRING_COUNT - i;
    if (s.type === 'muted') return `${n}ª abafada`;
    if (s.type === 'open') return `${n}ª solta`;
    return `${n}ª na casa ${s.fret} com o dedo ${s.finger}`;
  });
  const barre = chord.barre
    ? `; pestana na casa ${chord.barre.fret}, da ${chord.barre.fromString}ª à ${chord.barre.toString}ª corda`
    : '';
  return `${chord.labelPt} (${chord.labelCifra}): ${parts.join(', ')}${barre}`;
}
