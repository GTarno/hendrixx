import { TestBed } from '@angular/core/testing';
import { ChordLibraryService } from '../chords/chord-library.service';
import { validatePracticeConfig } from '../models';
import { SUGGESTED_PRACTICES } from './suggested-practices';

describe('SUGGESTED_PRACTICES', () => {
  it('traz os 7 treinos do plano', () => {
    expect(SUGGESTED_PRACTICES.map((p) => p.name)).toEqual([
      'Troca lenta',
      'Quarteto básico',
      'Progressão clássica',
      'Troca rápida',
      'Progressão de BPM',
      'Modo aleatório',
      'Foco nos difíceis',
    ]);
    expect(new Set(SUGGESTED_PRACTICES.map((p) => p.id)).size).toBe(7);
  });

  it('todos são treinos válidos com os acordes liberados no MVP', () => {
    const ids = TestBed.inject(ChordLibraryService).ids();
    for (const p of SUGGESTED_PRACTICES) {
      expect(validatePracticeConfig(p.config, ids), p.name).toEqual([]);
    }
  });

  it('seguem o plano nos pontos principais', () => {
    const byId = Object.fromEntries(SUGGESTED_PRACTICES.map((p) => [p.id, p.config]));
    expect(byId['troca-lenta']).toMatchObject({ chordIds: ['C', 'G'], bpm: 50, beatsPerChord: 4 });
    expect(byId['progressao-classica']).toMatchObject({ chordIds: ['C', 'G', 'Am', 'F'], bpm: 70 });
    expect(byId['troca-rapida'].beatsPerChord).toBe(1);
    expect(byId['progressao-de-bpm']).toMatchObject({
      bpm: 50,
      bpmProgression: { stepBpm: 5, everyCycles: 2, targetBpm: 80 },
    });
    expect(byId['modo-aleatorio'].order).toBe('random');
    expect(byId['foco-nos-dificeis']).toMatchObject({ chordIds: ['F', 'B'], beatsPerChord: 8 });
  });
});
