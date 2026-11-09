import { TestBed } from '@angular/core/testing';
import { createPracticeConfig } from '../models';
import {
  PRACTICES_STORAGE_KEY,
  PRACTICE_STORAGE,
  PracticeStorageService,
  cleanName,
  parseStoredData,
} from './practice-storage.service';

/** Armazenamento em memória, com falhas simuláveis. */
class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  failWrites = false;
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    if (this.failWrites) throw new DOMException('cheio', 'QuotaExceededError');
    this.map.set(key, value);
  }
}

const config = createPracticeConfig();

describe('parseStoredData', () => {
  it('sem dados, começa vazio', () => {
    expect(parseStoredData(null)).toEqual({
      status: 'empty',
      data: { version: 1, practices: [], last: null },
    });
  });

  it('texto ilegível vira dados vazios, marcados como corrompidos', () => {
    expect(parseStoredData('{oops').status).toBe('corrupted');
    expect(parseStoredData('"texto"').status).toBe('corrupted');
  });

  it('descarta só os itens inválidos', () => {
    const valid = { id: 'a', name: 'Bom', config, createdAt: 'x', updatedAt: 'x' };
    const raw = JSON.stringify({
      version: 1,
      practices: [valid, { id: 'b', name: 'Ruim', config: { bpm: 'rápido' } }, null],
      last: { ...config, order: 'invertida' },
    });
    const result = parseStoredData(raw);
    expect(result.status).toBe('ok');
    expect(result.data.practices.map((p) => p.id)).toEqual(['a']);
    expect(result.data.last).toBeNull();
  });

  it('aceita treinos com progressão de BPM e recusa progressão malformada', () => {
    const withProgression = {
      ...config,
      bpmProgression: { stepBpm: 5, everyCycles: 2, targetBpm: 80 },
    };
    const raw = JSON.stringify({
      version: 1,
      practices: [
        { id: 'a', name: 'Sobe', config: withProgression, createdAt: 'x', updatedAt: 'x' },
        {
          id: 'b',
          name: 'Ruim',
          config: { ...config, bpmProgression: { stepBpm: 'muito' } },
          createdAt: 'x',
          updatedAt: 'x',
        },
      ],
      last: null,
    });
    const result = parseStoredData(raw);
    expect(result.data.practices.map((p) => p.id)).toEqual(['a']);
    expect(result.data.practices[0].config.bpmProgression?.targetBpm).toBe(80);
  });

  it('migra o formato antigo (lista sem versão)', () => {
    const raw = JSON.stringify([
      { id: 'a', name: 'Antigo', config, createdAt: 'x', updatedAt: 'x' },
    ]);
    const result = parseStoredData(raw);
    expect(result.status).toBe('ok');
    expect(result.data.practices[0].name).toBe('Antigo');
  });

  it('reconhece dados de uma versão mais nova do app', () => {
    expect(parseStoredData(JSON.stringify({ version: 9, practices: [] })).status).toBe('newer');
  });
});

describe('cleanName', () => {
  it('tira espaços extras e limita a 40 caracteres', () => {
    expect(cleanName('  Troca   lenta  ')).toBe('Troca lenta');
    expect(cleanName('x'.repeat(60))).toHaveLength(40);
    expect(cleanName('   ')).toBe('');
  });
});

describe('PracticeStorageService', () => {
  let storage: MemoryStorage;

  function service(initial?: unknown) {
    storage = new MemoryStorage();
    if (initial !== undefined) {
      storage.setItem(
        PRACTICES_STORAGE_KEY,
        typeof initial === 'string' ? initial : JSON.stringify(initial),
      );
    }
    TestBed.configureTestingModule({
      providers: [{ provide: PRACTICE_STORAGE, useValue: storage }],
    });
    return TestBed.inject(PracticeStorageService);
  }

  const stored = () => JSON.parse(storage.getItem(PRACTICES_STORAGE_KEY) ?? 'null');

  it('salva, renomeia e exclui treinos, guardando no navegador', () => {
    const s = service();
    const saved = s.save('  Quarteto básico ', config);
    expect(saved.name).toBe('Quarteto básico');
    expect(s.practices().map((p) => p.name)).toEqual(['Quarteto básico']);
    expect(stored().practices[0].config).toEqual(config);

    s.rename(saved.id, 'Quarteto');
    expect(s.get(saved.id)?.name).toBe('Quarteto');
    s.rename(saved.id, '   '); // nome vazio é ignorado
    expect(s.get(saved.id)?.name).toBe('Quarteto');

    s.remove(saved.id);
    expect(s.practices()).toEqual([]);
    expect(stored().practices).toEqual([]);
    expect(s.isPersistent()).toBe(true);
  });

  it('nome vazio vira "Treino sem nome"', () => {
    expect(service().save('', config).name).toBe('Treino sem nome');
  });

  it('guarda uma cópia: mudar a configuração depois não altera o salvo', () => {
    const s = service();
    const mutable = createPracticeConfig();
    const saved = s.save('A', mutable);
    mutable.chordIds.push('G');
    expect(s.get(saved.id)?.config.chordIds).toEqual(['C', 'D', 'E', 'F']);
  });

  it('lista do mais recente para o mais antigo', async () => {
    const s = service();
    s.save('Primeiro', config);
    await new Promise((r) => setTimeout(r, 5));
    s.save('Segundo', config);
    expect(s.practices().map((p) => p.name)).toEqual(['Segundo', 'Primeiro']);
  });

  it('lembra a última configuração iniciada', () => {
    const s = service();
    s.rememberLast(createPracticeConfig({ bpm: 90 }));
    expect(s.last()?.bpm).toBe(90);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: PRACTICE_STORAGE, useValue: storage }],
    });
    expect(TestBed.inject(PracticeStorageService).last()?.bpm).toBe(90);
  });

  it('carrega treinos já guardados', () => {
    const s = service({
      version: 1,
      practices: [{ id: 'x', name: 'Guardado', config, createdAt: 'a', updatedAt: 'b' }],
      last: null,
    });
    expect(s.get('x')?.name).toBe('Guardado');
  });

  it('com dados corrompidos, começa vazio e volta a salvar normalmente', () => {
    const s = service('{quebrado');
    expect(s.practices()).toEqual([]);
    s.save('Novo', config);
    expect(stored().practices).toHaveLength(1);
  });

  it('não sobrescreve dados de uma versão mais nova do app', () => {
    const newer = { version: 2, practices: ['formato novo'] };
    const s = service(newer);
    s.save('Teste', config);
    expect(stored()).toEqual(newer);
    expect(s.isPersistent()).toBe(false);
  });

  it('sem espaço para salvar, segue só na memória e avisa', () => {
    const s = service();
    storage.failWrites = true;
    s.save('Sem espaço', config);
    expect(s.practices()).toHaveLength(1);
    expect(s.isPersistent()).toBe(false);
  });

  it('sem armazenamento disponível, funciona só durante a visita', () => {
    TestBed.configureTestingModule({ providers: [{ provide: PRACTICE_STORAGE, useValue: null }] });
    const s = TestBed.inject(PracticeStorageService);
    s.save('Temporário', config);
    expect(s.practices()).toHaveLength(1);
    expect(s.isPersistent()).toBe(false);
  });
});
