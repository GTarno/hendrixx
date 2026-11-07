import { BEATS_PER_BAR, PracticeConfig, PracticeOrder, positionsPerCycle } from '../models';

/**
 * Lógica pura da sessão de treino (docs/business-rules.md, RN2 a RN6 e "Durante o treino").
 * Não conhece áudio nem Angular: recebe o horário de cada tempo e diz o que ele significa.
 */

// ---------- sequência de acordes (RN2, RN3) ----------

export interface ChordSequence {
  /** Posições por ciclo: n (sequencial/aleatória) ou 2n − 2 (ping-pong). */
  readonly perCycle: number;
  /** Índice, na lista do treino, do acorde tocado na posição `position` (0, 1, 2…). */
  at(position: number): number;
}

export type RandomSource = () => number;

function shuffle<T>(items: T[], random: RandomSource): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export function createChordSequence(
  chordCount: number,
  order: PracticeOrder,
  random: RandomSource = Math.random,
): ChordSequence {
  const positions: number[] = [];

  const appendCycle = () => {
    const indices = Array.from({ length: chordCount }, (_, i) => i);
    if (order === 'sequential') {
      positions.push(...indices);
    } else if (order === 'pingpong') {
      // Ida e volta sem repetir as pontas: 0 1 2 3 2 1.
      positions.push(...indices, ...indices.slice(1, -1).reverse());
    } else {
      // Aleatória: uma permutação por ciclo, sem repetir o acorde da virada do ciclo.
      const cycle = shuffle(indices, random);
      const previous = positions[positions.length - 1];
      if (chordCount > 1 && cycle[0] === previous) {
        const j = 1 + Math.floor(random() * (chordCount - 1));
        [cycle[0], cycle[j]] = [cycle[j], cycle[0]];
      }
      positions.push(...cycle);
    }
  };

  return {
    perCycle: positionsPerCycle(chordCount, order),
    at(position: number): number {
      while (positions.length <= position) appendCycle();
      return positions[position];
    },
  };
}

// ---------- planejamento de cada tempo ----------

interface BeatTiming {
  /** Horário do clique no relógio de áudio, em segundos. */
  time: number;
  /** Duração prevista do tempo, em segundos. */
  duration: number;
}

/** Tempo da contagem inicial (RN6). */
export interface CountInBeat extends BeatTiming {
  kind: 'count-in';
  /** 1, 2, 3 ou 4. */
  count: number;
  beatInBar: number;
  /** Primeiro acorde que vai soar, para a pessoa posicionar a mão. */
  firstChordIndex: number;
}

/** Tempo com um acorde em destaque. */
export interface ChordBeat extends BeatTiming {
  kind: 'chord';
  /** Posição na sequência desde o início do treino (0, 1, 2…). */
  position: number;
  chordIndex: number;
  nextChordIndex: number;
  /** 0 a N − 1; o 0 é o tempo da troca. */
  beatInChord: number;
  /** 0 a 3; o 0 é o tempo 1 do compasso. */
  beatInBar: number;
  /** Ciclo atual, a partir de 0. */
  cycle: number;
  /** Tempo de treino tocado até este clique (sem contagem nem pausas). */
  elapsedSeconds: number;
}

export interface SessionSummary {
  /** Ciclos completos. */
  cycles: number;
  /** Trocas de acorde feitas. */
  changes: number;
  /** Tempo tocando, sem contagem nem pausas. */
  elapsedSeconds: number;
}

/** Tempo de chegada (RN4): clique acentuado final, sem acorde novo. */
export interface EndBeat extends BeatTiming {
  kind: 'end';
  summary: SessionSummary;
}

export type SessionBeat = CountInBeat | ChordBeat | EndBeat;

export class SessionPlanner {
  readonly sequence: ChordSequence;

  /** Tempo dentro do trecho atual; negativo durante a contagem. */
  private beat = 0;
  /** Posição em que o trecho atual começa (muda ao retomar de uma pausa). */
  private positionOffset = 0;
  private segmentStart: number | null = null;
  private elapsedBefore = 0;
  private ended = false;

  constructor(
    private readonly config: PracticeConfig,
    random: RandomSource = Math.random,
  ) {
    this.sequence = createChordSequence(config.chordIds.length, config.order, random);
    this.beginSegment();
  }

  get isFinished(): boolean {
    return this.ended;
  }

  /** Índice do primeiro acorde do trecho atual (para mostrar como "Próximo" antes de tocar). */
  get upcomingChordIndex(): number {
    return this.sequence.at(this.positionOffset);
  }

  /** Planeja o tempo que soa em `time`. Depois do fim, devolve `null`. */
  next(time: number, duration: number): SessionBeat | null {
    if (this.ended) return null;
    const k = this.beat++;

    if (k < 0) {
      return {
        kind: 'count-in',
        time,
        duration,
        count: BEATS_PER_BAR + k + 1,
        beatInBar: BEATS_PER_BAR + k,
        firstChordIndex: this.sequence.at(this.positionOffset),
      };
    }

    if (this.segmentStart === null) this.segmentStart = time;
    const n = this.config.beatsPerChord;
    const position = this.positionOffset + Math.floor(k / n);
    const beatInChord = k % n;
    const beatInBar = k % BEATS_PER_BAR;
    const elapsedSeconds = this.elapsedBefore + (time - this.segmentStart);

    if (beatInChord === 0 && this.shouldStop(position, beatInBar, elapsedSeconds)) {
      this.ended = true;
      return {
        kind: 'end',
        time,
        duration,
        summary: this.summarize(position, elapsedSeconds),
      };
    }

    return {
      kind: 'chord',
      time,
      duration,
      position,
      chordIndex: this.sequence.at(position),
      nextChordIndex: this.sequence.at(position + 1),
      beatInChord,
      beatInBar,
      cycle: Math.floor(position / this.sequence.perCycle),
      elapsedSeconds,
    };
  }

  /**
   * Pausa no momento `now`. A retomada começa no tempo 1 do acorde atual, alinhado ao início
   * do compasso quando N < 4, com nova contagem se ela estiver ligada.
   */
  pause(lastSounded: SessionBeat | null, now: number): void {
    if (lastSounded?.kind === 'chord') {
      this.elapsedBefore = this.elapsedAt(lastSounded, now);
      const n = this.config.beatsPerChord;
      const positionsPerBar = n < BEATS_PER_BAR ? BEATS_PER_BAR / n : 1;
      this.positionOffset = Math.floor(lastSounded.position / positionsPerBar) * positionsPerBar;
    }
    this.beginSegment();
  }

  /** Resumo para uma parada manual, a partir do último tempo que soou. */
  summaryAt(lastSounded: SessionBeat | null, now: number): SessionSummary {
    if (lastSounded?.kind === 'end') return lastSounded.summary;
    if (lastSounded?.kind !== 'chord') {
      return this.summarize(this.positionOffset, this.elapsedBefore);
    }
    return this.summarize(lastSounded.position + 1, this.elapsedAt(lastSounded, now));
  }

  private elapsedAt(beat: ChordBeat, now: number): number {
    return beat.elapsedSeconds + Math.min(Math.max(0, now - beat.time), beat.duration);
  }

  /** `positionsPlayed` posições tocadas (completas ou começadas). */
  private summarize(positionsPlayed: number, elapsedSeconds: number): SessionSummary {
    return {
      cycles: Math.floor(positionsPlayed / this.sequence.perCycle),
      changes: Math.max(0, positionsPlayed - 1),
      elapsedSeconds,
    };
  }

  private shouldStop(position: number, beatInBar: number, elapsedSeconds: number): boolean {
    const { stop } = this.config;
    if (stop.type === 'cycles') {
      // No tempo 1 em que começaria o ciclo X + 1.
      return position > 0 && position % this.sequence.perCycle === 0
        ? position / this.sequence.perCycle >= stop.value
        : false;
    }
    if (stop.type === 'minutes') {
      // No primeiro tempo 1 de troca depois de X minutos tocados.
      return beatInBar === 0 && elapsedSeconds >= stop.value * 60;
    }
    return false;
  }

  private beginSegment(): void {
    this.beat = this.config.countIn ? -BEATS_PER_BAR : 0;
    this.segmentStart = null;
  }
}
