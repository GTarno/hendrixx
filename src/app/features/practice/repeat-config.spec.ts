import { createPracticeConfig } from '../../core/models';
import { repeatConfig } from './practice-runner.page';

describe('repeatConfig', () => {
  it('sem progressão, repete a partir do BPM em que terminou', () => {
    const config = createPracticeConfig({ bpm: 60 });
    expect(repeatConfig(config, 75, 0).bpm).toBe(75);
    expect(repeatConfig(config, 75, 5).bpm).toBe(80);
    expect(repeatConfig(config, 240, 5).bpm).toBe(240);
  });

  it('com progressão, recomeça do BPM inicial e o +5 sobe início e meta', () => {
    const config = createPracticeConfig({
      bpm: 50,
      bpmProgression: { stepBpm: 5, everyCycles: 2, targetBpm: 80 },
    });
    expect(repeatConfig(config, 80, 0)).toMatchObject({
      bpm: 50,
      bpmProgression: { targetBpm: 80 },
    });
    expect(repeatConfig(config, 80, 5)).toMatchObject({
      bpm: 55,
      bpmProgression: { targetBpm: 85 },
    });
  });

  it('sem espaço para subir, a progressão sai', () => {
    const config = createPracticeConfig({
      bpm: 235,
      bpmProgression: { stepBpm: 5, everyCycles: 1, targetBpm: 240 },
    });
    const next = repeatConfig(config, 240, 5);
    expect(next.bpm).toBe(240);
    expect(next.bpmProgression).toBeUndefined();
  });
});
