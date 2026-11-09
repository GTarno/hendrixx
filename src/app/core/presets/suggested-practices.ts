import { PracticeConfig, createPracticeConfig } from '../models';

/** Treino sugerido do plano (seção 8): preenche a tela de montar treino, sem iniciar. */
export interface SuggestedPractice {
  id: string;
  name: string;
  /** Para quem ou para quê. */
  description: string;
  config: PracticeConfig;
}

export const SUGGESTED_PRACTICES: readonly SuggestedPractice[] = [
  {
    id: 'troca-lenta',
    name: 'Troca lenta',
    description: 'Para começar: dois acordes, bem devagar.',
    config: createPracticeConfig({ chordIds: ['C', 'G'], bpm: 50, beatsPerChord: 4 }),
  },
  {
    id: 'quarteto-basico',
    name: 'Quarteto básico',
    description: 'C, D, E e F em sequência.',
    config: createPracticeConfig({ chordIds: ['C', 'D', 'E', 'F'], bpm: 60, beatsPerChord: 4 }),
  },
  {
    id: 'progressao-classica',
    name: 'Progressão clássica',
    description: 'A sequência de muitas músicas pop.',
    config: createPracticeConfig({ chordIds: ['C', 'G', 'Am', 'F'], bpm: 70, beatsPerChord: 4 }),
  },
  {
    id: 'troca-rapida',
    name: 'Troca rápida',
    description: 'Um tempo por acorde: troca a cada clique.',
    config: createPracticeConfig({ chordIds: ['G', 'D'], bpm: 60, beatsPerChord: 1 }),
  },
  {
    id: 'progressao-de-bpm',
    name: 'Progressão de BPM',
    description: 'Começa em 50 e sobe 5 bpm a cada 2 ciclos, até 80.',
    config: createPracticeConfig({
      chordIds: ['C', 'G', 'Am', 'F'],
      bpm: 50,
      beatsPerChord: 4,
      bpmProgression: { stepBpm: 5, everyCycles: 2, targetBpm: 80 },
    }),
  },
  {
    id: 'modo-aleatorio',
    name: 'Modo aleatório',
    description: 'Treina a reação, sem decorar a ordem.',
    config: createPracticeConfig({
      chordIds: ['C', 'D', 'G', 'Am', 'Em'],
      bpm: 60,
      beatsPerChord: 4,
      order: 'random',
    }),
  },
  {
    id: 'foco-nos-dificeis',
    name: 'Foco nos difíceis',
    description: 'F e B com pestana, com mais tempo em cada um.',
    config: createPracticeConfig({ chordIds: ['F', 'B'], bpm: 50, beatsPerChord: 8 }),
  },
];
