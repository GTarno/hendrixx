/**
 * Cálculo de cada quadro da animação do metrônomo, a partir do relógio de áudio.
 * Função pura: recebe o horário atual e o tempo que está soando e diz onde cada coisa está.
 */

/** Amplitude do pêndulo, em graus, para cada lado. */
export const PENDULUM_AMPLITUDE_DEG = 22;
/** Duração do pulso do ponto do tempo atual, em segundos. */
export const PULSE_SECONDS = 0.12;
/** Quanto o ponto cresce no início do pulso (0,32 = 32%). */
export const PULSE_GROWTH = 0.32;

/** O que a animação precisa saber do tempo que está soando. */
export interface FrameBeat {
  /** Horário do clique no relógio de áudio, em segundos. */
  time: number;
  /** Duração do tempo, em segundos. */
  duration: number;
  /** 0 a 3; o 0 é o tempo 1 do compasso. */
  beatInBar: number;
  /** Posição no acorde (0 a N − 1); ausente na contagem. */
  beatInChord?: number;
}

export interface MetronomeFrame {
  /** Ângulo do pêndulo em graus (positivo = para a direita). */
  pendulumDeg: number;
  /** Escala do ponto do tempo atual (1 = tamanho normal). */
  pulseScale: number;
  /** Progresso até a troca de acorde, de 0 a 1. */
  progress: number;
}

export const REST_FRAME: MetronomeFrame = { pendulumDeg: 0, pulseScale: 1, progress: 0 };

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function metronomeFrame(
  now: number,
  beat: FrameBeat | null,
  beatsPerChord: number,
  reducedMotion: boolean,
): MetronomeFrame {
  if (!beat || beat.duration <= 0) return REST_FRAME;
  const phase = clamp01((now - beat.time) / beat.duration);
  const side = beat.beatInBar % 2 === 0 ? 1 : -1;

  if (reducedMotion) {
    // Sem animação: o pêndulo só muda de lado a cada tempo e a barra anda por tempo.
    return {
      pendulumDeg: side * PENDULUM_AMPLITUDE_DEG,
      pulseScale: 1,
      progress: beat.beatInChord === undefined ? 0 : (beat.beatInChord + 1) / beatsPerChord,
    };
  }

  // O pêndulo chega ao extremo exatamente no clique e cruza o centro no meio do tempo.
  const pendulumDeg = side * PENDULUM_AMPLITUDE_DEG * Math.cos(Math.PI * phase);
  const pulsePhase = clamp01((now - beat.time) / PULSE_SECONDS);
  const pulseScale = 1 + PULSE_GROWTH * (1 - pulsePhase) ** 3;
  const progress =
    beat.beatInChord === undefined ? 0 : clamp01((beat.beatInChord + phase) / beatsPerChord);

  return { pendulumDeg, pulseScale, progress };
}
