#!/usr/bin/env node
// Gera data/chords.json a partir das formações abaixo e valida cada uma.
// Uso: node tools/build-chord-catalog.mjs [--check]
//   --check  só valida e compara com o arquivo existente (útil no CI).
//
// Convenções:
// - Cordas da 6ª (Mi grave) para a 1ª (Mi agudo).
// - `fret` é a casa ABSOLUTA no braço; `baseFret` só diz a partir de qual casa desenhar.
// - Formações são conhecimento musical comum, cadastradas à mão; nada é extraído do PDF do curso.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../data/chords.json');

// ---------- teoria ----------
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const TUNING_PC = [4, 9, 2, 7, 11, 4]; // E A D G B E (6ª → 1ª)
const PT_LETTER = { C: 'Dó', D: 'Ré', E: 'Mi', F: 'Fá', G: 'Sol', A: 'Lá', B: 'Si' };

const QUALITIES = {
  maj: { intervals: [0, 4, 7], suffixCifra: '', suffixId: '', suffixPt: '' },
  min: { intervals: [0, 3, 7], suffixCifra: 'm', suffixId: 'm', suffixPt: ' menor' },
  '7': { intervals: [0, 4, 7, 10], suffixCifra: '7', suffixId: '7', suffixPt: ' 7' },
  m7: { intervals: [0, 3, 7, 10], suffixCifra: 'm7', suffixId: 'm7', suffixPt: ' menor 7' },
  maj7: { intervals: [0, 4, 7, 11], suffixCifra: '7M', suffixId: 'maj7', suffixPt: ' 7M' },
};
const DEGREE_OF_INTERVAL = { 0: 1, 3: 3, 4: 3, 7: 5, 10: 7, 11: 7 };

function pcOf(name) {
  const acc = name.slice(1);
  return (LETTER_PC[name[0]] + (acc === '#' ? 1 : acc === 'b' ? -1 : 0) + 12) % 12;
}
function spell(root, interval) {
  const degree = DEGREE_OF_INTERVAL[interval];
  const letter = LETTERS[(LETTERS.indexOf(root[0]) + degree - 1) % 7];
  const target = (pcOf(root) + interval) % 12;
  let diff = (target - LETTER_PC[letter] + 12) % 12;
  if (diff > 6) diff -= 12;
  const acc = { '-2': 'bb', '-1': 'b', 0: '', 1: '#', 2: '##' }[diff];
  if (acc === undefined) throw new Error(`não sei grafar ${root}+${interval}`);
  return letter + acc;
}
const ptRoot = (root) => PT_LETTER[root[0]] + root.slice(1);

// ---------- formas ----------
// frets: 6 itens, 'x' abafada, 0 solta, n casa. fingers: 6 itens, null quando não há dedo.
const X = 'x';
const shape = (frets, fingers, barre) => ({ frets, fingers, barre });
const n_ = null;

const SHAPES = {
  E: (n) => shape([n, n + 2, n + 2, n + 1, n, n], [1, 3, 4, 2, 1, 1], { fret: n, fromString: 6, toString: 1 }),
  A: (n) => shape([X, n, n + 2, n + 2, n + 2, n], [n_, 1, 2, 3, 4, 1], { fret: n, fromString: 5, toString: 1 }),
  Em: (n) => shape([n, n + 2, n + 2, n, n, n], [1, 3, 4, 1, 1, 1], { fret: n, fromString: 6, toString: 1 }),
  Am: (n) => shape([X, n, n + 2, n + 2, n + 1, n], [n_, 1, 3, 4, 2, 1], { fret: n, fromString: 5, toString: 1 }),
  E7: (n) => shape([n, n + 2, n, n + 1, n, n], [1, 3, 1, 2, 1, 1], { fret: n, fromString: 6, toString: 1 }),
  A7: (n) => shape([X, n, n + 2, n, n + 2, n], [n_, 1, 3, 1, 4, 1], { fret: n, fromString: 5, toString: 1 }),
  Em7: (n) => shape([n, n + 2, n, n, n, n], [1, 3, 1, 1, 1, 1], { fret: n, fromString: 6, toString: 1 }),
  Am7: (n) => shape([X, n, n + 2, n, n + 1, n], [n_, 1, 3, 1, 2, 1], { fret: n, fromString: 5, toString: 1 }),
  Amaj7: (n) => shape([X, n, n + 2, n + 1, n + 2, n], [n_, 1, 3, 2, 4, 1], { fret: n, fromString: 5, toString: 1 }),
  Emaj7: (n) => shape([n, X, n + 1, n + 1, n, X], [1, n_, 3, 4, 2, n_]),
};

const OPEN = {
  C: shape([X, 3, 2, 0, 1, 0], [n_, 3, 2, n_, 1, n_]),
  D: shape([X, X, 0, 2, 3, 2], [n_, n_, n_, 1, 3, 2]),
  E: shape([0, 2, 2, 1, 0, 0], [n_, 2, 3, 1, n_, n_]),
  G: shape([3, 2, 0, 0, 0, 3], [2, 1, n_, n_, n_, 3]),
  A: shape([X, 0, 2, 2, 2, 0], [n_, n_, 1, 2, 3, n_]),
  Am: shape([X, 0, 2, 2, 1, 0], [n_, n_, 2, 3, 1, n_]),
  Dm: shape([X, X, 0, 2, 3, 1], [n_, n_, n_, 2, 3, 1]),
  Em: shape([0, 2, 2, 0, 0, 0], [n_, 2, 3, n_, n_, n_]),
  C7: shape([X, 3, 2, 3, 1, 0], [n_, 3, 2, 4, 1, n_]),
  D7: shape([X, X, 0, 2, 1, 2], [n_, n_, n_, 2, 1, 3]),
  E7: shape([0, 2, 0, 1, 0, 0], [n_, 2, n_, 1, n_, n_]),
  G7: shape([3, 2, 0, 0, 0, 1], [3, 2, n_, n_, n_, 1]),
  A7: shape([X, 0, 2, 0, 2, 0], [n_, n_, 2, n_, 3, n_]),
  B7: shape([X, 2, 1, 2, 0, 2], [n_, 2, 1, 3, n_, 4]),
  Am7: shape([X, 0, 2, 0, 1, 0], [n_, n_, 2, n_, 1, n_]),
  Dm7: shape([X, X, 0, 2, 1, 1], [n_, n_, n_, 2, 1, 1], { fret: 1, fromString: 2, toString: 1 }),
  Em7: shape([0, 2, 0, 0, 0, 0], [n_, 2, n_, n_, n_, n_]),
  Cmaj7: shape([X, 3, 2, 0, 0, 0], [n_, 3, 2, n_, n_, n_]),
  Dmaj7: shape([X, X, 0, 2, 2, 2], [n_, n_, n_, 1, 2, 3]),
  Emaj7: shape([0, 2, 1, 1, 0, 0], [n_, 3, 1, 2, n_, n_]),
  Fmaj7: shape([X, X, 3, 2, 1, 0], [n_, n_, 3, 2, 1, n_]),
  Gmaj7: shape([3, 2, 0, 0, 0, 2], [3, 2, n_, n_, n_, 1]),
  Amaj7: shape([X, 0, 2, 1, 2, 0], [n_, n_, 2, 1, 3, n_]),
};

// ---------- catálogo ----------
// [raiz, qualidade, forma, fase do catálogo, apelidos enarmônicos]
const PHASE1 = new Set(['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Am', 'Dm', 'Em']);
const MAIN = [
  // maiores
  ['C', 'maj', OPEN.C], ['Db', 'maj', SHAPES.A(4), ['C#']], ['D', 'maj', OPEN.D],
  ['Eb', 'maj', SHAPES.A(6), ['D#']], ['E', 'maj', OPEN.E], ['F', 'maj', SHAPES.E(1)],
  ['F#', 'maj', SHAPES.E(2), ['Gb']], ['G', 'maj', OPEN.G], ['Ab', 'maj', SHAPES.E(4), ['G#']],
  ['A', 'maj', OPEN.A], ['Bb', 'maj', SHAPES.A(1), ['A#']], ['B', 'maj', SHAPES.A(2)],
  // menores
  ['C', 'min', SHAPES.Am(3)], ['C#', 'min', SHAPES.Am(4), ['Db']], ['D', 'min', OPEN.Dm],
  ['Eb', 'min', SHAPES.Am(6), ['D#']], ['E', 'min', OPEN.Em], ['F', 'min', SHAPES.Em(1)],
  ['F#', 'min', SHAPES.Em(2), ['Gb']], ['G', 'min', SHAPES.Em(3)], ['G#', 'min', SHAPES.Em(4), ['Ab']],
  ['A', 'min', OPEN.Am], ['Bb', 'min', SHAPES.Am(1), ['A#']], ['B', 'min', SHAPES.Am(2)],
  // sétima
  ['C', '7', OPEN.C7], ['Db', '7', SHAPES.A7(4), ['C#']], ['D', '7', OPEN.D7],
  ['Eb', '7', SHAPES.A7(6), ['D#']], ['E', '7', OPEN.E7], ['F', '7', SHAPES.E7(1)],
  ['F#', '7', SHAPES.E7(2), ['Gb']], ['G', '7', OPEN.G7], ['Ab', '7', SHAPES.E7(4), ['G#']],
  ['A', '7', OPEN.A7], ['Bb', '7', SHAPES.A7(1), ['A#']], ['B', '7', OPEN.B7],
  // menor com sétima
  ['C', 'm7', SHAPES.Am7(3)], ['C#', 'm7', SHAPES.Am7(4), ['Db']], ['D', 'm7', OPEN.Dm7],
  ['Eb', 'm7', SHAPES.Am7(6), ['D#']], ['E', 'm7', OPEN.Em7], ['F', 'm7', SHAPES.Em7(1)],
  ['F#', 'm7', SHAPES.Em7(2), ['Gb']], ['G', 'm7', SHAPES.Em7(3)], ['G#', 'm7', SHAPES.Em7(4), ['Ab']],
  ['A', 'm7', OPEN.Am7], ['Bb', 'm7', SHAPES.Am7(1), ['A#']], ['B', 'm7', SHAPES.Am7(2)],
  // sétima maior
  ['C', 'maj7', OPEN.Cmaj7], ['Db', 'maj7', SHAPES.Amaj7(4), ['C#']], ['D', 'maj7', OPEN.Dmaj7],
  ['Eb', 'maj7', SHAPES.Amaj7(6), ['D#']], ['E', 'maj7', OPEN.Emaj7], ['F', 'maj7', OPEN.Fmaj7],
  ['F#', 'maj7', SHAPES.Emaj7(2), ['Gb']], ['G', 'maj7', OPEN.Gmaj7], ['Ab', 'maj7', SHAPES.Emaj7(4), ['G#']],
  ['A', 'maj7', OPEN.Amaj7], ['Bb', 'maj7', SHAPES.Amaj7(1), ['A#']], ['B', 'maj7', SHAPES.Amaj7(2)],
];

// Fase 4: variações (outra digitação ou posição do mesmo acorde).
// [id da variação, raiz, qualidade, forma, nome da variação]
const VARIANTS = [
  ['F-simples', 'F', 'maj', shape([X, X, 3, 2, 1, 1], [n_, n_, 3, 2, 1, 1], { fret: 1, fromString: 2, toString: 1 }), 'Simplificado (sem pestana inteira)'],
  ['G-4dedos', 'G', 'maj', shape([3, 2, 0, 0, 3, 3], [2, 1, n_, n_, 3, 4]), 'Com 4 dedos'],
  ['C-pestana3', 'C', 'maj', SHAPES.A(3), 'Pestana na 3ª casa'],
  ['D-pestana5', 'D', 'maj', SHAPES.A(5), 'Pestana na 5ª casa'],
  ['E-pestana7', 'E', 'maj', SHAPES.A(7), 'Pestana na 7ª casa'],
  ['G-pestana3', 'G', 'maj', SHAPES.E(3), 'Pestana na 3ª casa'],
  ['A-pestana5', 'A', 'maj', SHAPES.E(5), 'Pestana na 5ª casa'],
  ['Am-pestana5', 'A', 'min', SHAPES.Em(5), 'Pestana na 5ª casa'],
  ['Dm-pestana5', 'D', 'min', SHAPES.Am(5), 'Pestana na 5ª casa'],
  ['Em-pestana7', 'E', 'min', SHAPES.Am(7), 'Pestana na 7ª casa'],
  ['Bm7-aberto', 'B', 'm7', shape([X, 2, 0, 2, 0, 2], [n_, 1, n_, 2, n_, 3]), 'Aberto, sem pestana'],
];

// ---------- montagem ----------
function toStrings({ frets, fingers }) {
  return frets.map((f, i) => {
    if (f === X) return { type: 'muted' };
    if (f === 0) return { type: 'open' };
    return { type: 'fretted', fret: f, finger: fingers[i] };
  });
}
function baseFretOf(frets) {
  const fretted = frets.filter((f) => typeof f === 'number' && f > 0);
  return Math.max(...fretted) <= 4 ? 1 : Math.min(...fretted);
}
function difficultyOf({ fingers, barre }) {
  if (barre && barre.fromString - barre.toString >= 4) return 3;
  const used = new Set(fingers.filter((f) => f !== null)).size;
  if (barre || used >= 4) return 2;
  return 1;
}
function buildChord(id, root, quality, sh, extra = {}) {
  const q = QUALITIES[quality];
  const notes = sh.frets
    .map((f, i) => (f === X ? null : (TUNING_PC[i] + f) % 12))
    .filter((pc) => pc !== null)
    .map((pc) => spell(root, (pc - pcOf(root) + 12) % 12));
  const chord = {
    id,
    root,
    quality,
    labelCifra: root + q.suffixCifra,
    labelPt: ptRoot(root) + q.suffixPt,
    strings: toStrings(sh),
    ...(sh.barre ? { barre: sh.barre } : {}),
    baseFret: baseFretOf(sh.frets),
    notes,
    difficulty: difficultyOf(sh),
    ...extra,
  };
  validate(chord, sh);
  return chord;
}

// ---------- validação ----------
function validate(chord, sh) {
  const where = `[${chord.id}]`;
  const q = QUALITIES[chord.quality];
  const rootPc = pcOf(chord.root);
  const tones = new Set(q.intervals.map((i) => (rootPc + i) % 12));
  const sounding = sh.frets.map((f, i) => (f === X ? null : (TUNING_PC[i] + f) % 12)).filter((p) => p !== null);
  if (sh.frets.length !== 6 || sh.fingers.length !== 6) throw new Error(`${where} precisa de 6 cordas`);
  if (sounding.length < 4) throw new Error(`${where} menos de 4 cordas soando`);
  for (const pc of sounding) if (!tones.has(pc)) throw new Error(`${where} nota fora do acorde: ${pc}`);
  for (const i of q.intervals) {
    if (i === 7) continue; // a quinta pode ser omitida
    if (!sounding.includes((rootPc + i) % 12)) throw new Error(`${where} falta o intervalo ${i}`);
  }
  if (sounding[0] !== rootPc) throw new Error(`${where} o baixo não é a tônica`);
  sh.frets.forEach((f, i) => {
    const hasFinger = sh.fingers[i] !== null;
    if (typeof f === 'number' && f > 0 && !hasFinger) throw new Error(`${where} corda ${6 - i} sem dedo`);
    if ((f === X || f === 0) && hasFinger) throw new Error(`${where} corda ${6 - i} solta/abafada com dedo`);
  });
  const frets = sh.frets.filter((f) => typeof f === 'number' && f > 0);
  if (frets.length && Math.max(...frets) - Math.min(...frets) > 4) throw new Error(`${where} abertura maior que 5 casas`);
  if (sh.barre) {
    const { fret, fromString, toString } = sh.barre;
    for (let s = fromString; s >= toString; s--) {
      const f = sh.frets[6 - s];
      if (f === X || f === 0 || f < fret) throw new Error(`${where} pestana não cobre a corda ${s}`);
    }
  }
  if (chord.notes.length !== sounding.length) throw new Error(`${where} notas inconsistentes`);
}

// ---------- saída ----------
const chords = [];
const seen = new Set();
for (const [root, quality, sh, aliases = []] of MAIN) {
  const q = QUALITIES[quality];
  const id = root + q.suffixId;
  if (seen.has(id)) throw new Error(`id repetido: ${id}`);
  seen.add(id);
  const phase = PHASE1.has(id) ? 1 : quality === 'maj' || quality === 'min' ? 2 : 3;
  chords.push(buildChord(id, root, quality, sh, { catalogPhase: phase, aliases: aliases.map((a) => a + q.suffixCifra) }));
}
for (const [id, root, quality, sh, variantName] of VARIANTS) {
  const parent = root + QUALITIES[quality].suffixId;
  if (!seen.has(parent)) throw new Error(`variação ${id} sem acorde principal ${parent}`);
  if (seen.has(id)) throw new Error(`id repetido: ${id}`);
  seen.add(id);
  chords.push(buildChord(id, root, quality, sh, { catalogPhase: 4, variantOf: parent, variantName, aliases: [] }));
}

const json = JSON.stringify({ version: 1, tuning: ['E', 'A', 'D', 'G', 'B', 'E'], chords }, null, 2) + '\n';
if (process.argv.includes('--check')) {
  const current = readFileSync(OUT, 'utf8');
  if (current !== json) {
    console.error('data/chords.json está desatualizado. Rode: node tools/build-chord-catalog.mjs');
    process.exit(1);
  }
  console.log(`ok: ${chords.length} acordes válidos e arquivo em dia`);
} else {
  writeFileSync(OUT, json);
  console.log(`gerado ${OUT}: ${chords.length} acordes`);
}
