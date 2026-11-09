import { Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import {
  BEATS_PER_BAR,
  PracticeConfig,
  PracticeOrder,
  StopCondition,
  isBeatsPerChord,
} from '../models';

/** Treino salvo pela pessoa (tela "Meus treinos"). */
export interface SavedPractice {
  id: string;
  name: string;
  config: PracticeConfig;
  /** ISO 8601. */
  createdAt: string;
  /** ISO 8601. */
  updatedAt: string;
}

/** Formato guardado no navegador. A versão permite migrar dados de versões antigas do app. */
interface StoredDataV1 {
  version: 1;
  practices: SavedPractice[];
  /** Última configuração iniciada, para reabrir a tela de montar treino como estava. */
  last: PracticeConfig | null;
}

export const STORAGE_VERSION = 1;
export const PRACTICES_STORAGE_KEY = 'hendrixx.practices';
export const NAME_MAX_LENGTH = 40;

/** Onde os dados ficam (localStorage do navegador; injetável para testes). */
export const PRACTICE_STORAGE = new InjectionToken<Storage | null>('PRACTICE_STORAGE', {
  providedIn: 'root',
  factory: () => {
    try {
      return typeof localStorage === 'undefined' ? null : localStorage;
    } catch {
      return null; // acesso bloqueado pelo navegador
    }
  },
});

// ---------- validação do que vem do armazenamento ----------

const ORDERS: PracticeOrder[] = ['sequential', 'random', 'pingpong'];
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isInt = (v: unknown): v is number => Number.isInteger(v);

function isStop(v: unknown): v is StopCondition {
  if (!isObject(v)) return false;
  if (v['type'] === 'infinite') return true;
  return (v['type'] === 'cycles' || v['type'] === 'minutes') && isInt(v['value']);
}

function isProgression(v: unknown): boolean {
  return isObject(v) && isInt(v['stepBpm']) && isInt(v['everyCycles']) && isInt(v['targetBpm']);
}

/** Confere a forma de uma configuração guardada (a validação de regras vem ao usar). */
export function isStoredConfig(v: unknown): v is PracticeConfig {
  return (
    isObject(v) &&
    Array.isArray(v['chordIds']) &&
    v['chordIds'].every((id) => typeof id === 'string') &&
    isInt(v['bpm']) &&
    isInt(v['beatsPerChord']) &&
    isBeatsPerChord(v['beatsPerChord'] as number) &&
    v['beatsPerBar'] === BEATS_PER_BAR &&
    ORDERS.includes(v['order'] as PracticeOrder) &&
    isStop(v['stop']) &&
    typeof v['countIn'] === 'boolean' &&
    (v['bpmProgression'] === undefined || isProgression(v['bpmProgression']))
  );
}

function isSavedPractice(v: unknown): v is SavedPractice {
  return (
    isObject(v) &&
    typeof v['id'] === 'string' &&
    typeof v['name'] === 'string' &&
    typeof v['createdAt'] === 'string' &&
    typeof v['updatedAt'] === 'string' &&
    isStoredConfig(v['config'])
  );
}

export type ParseResult =
  | { status: 'empty' | 'ok' | 'corrupted'; data: StoredDataV1 }
  | { status: 'newer'; data: StoredDataV1 };

const EMPTY: StoredDataV1 = { version: 1, practices: [], last: null };

/**
 * Lê o texto guardado. Itens inválidos são descartados um a um; um texto ilegível vira
 * "corrompido" (dados vazios). Dados de uma versão mais nova do app são marcados como
 * `newer`, para não serem sobrescritos por esta versão.
 */
export function parseStoredData(raw: string | null): ParseResult {
  if (raw === null) return { status: 'empty', data: { ...EMPTY, practices: [] } };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { status: 'corrupted', data: { ...EMPTY, practices: [] } };
  }
  // Versão 0 (sem envelope): só a lista de treinos.
  if (Array.isArray(value)) value = { version: 1, practices: value, last: null };
  if (!isObject(value) || !isInt(value['version'])) {
    return { status: 'corrupted', data: { ...EMPTY, practices: [] } };
  }
  if (value['version'] > STORAGE_VERSION) {
    return { status: 'newer', data: { ...EMPTY, practices: [] } };
  }
  const practices = Array.isArray(value['practices'])
    ? value['practices'].filter(isSavedPractice)
    : [];
  const last = isStoredConfig(value['last']) ? value['last'] : null;
  return { status: 'ok', data: { version: 1, practices, last } };
}

/** Nome limpo: sem espaços nas pontas e com no máximo 40 caracteres. */
export function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, NAME_MAX_LENGTH).trim();
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

const copyConfig = (c: PracticeConfig): PracticeConfig => ({
  ...c,
  chordIds: [...c.chordIds],
  stop: { ...c.stop },
  ...(c.bpmProgression ? { bpmProgression: { ...c.bpmProgression } } : {}),
});

/**
 * Treinos salvos e a última configuração usada, guardados no navegador (sem backend).
 * Sem armazenamento disponível (aba privada, bloqueio), tudo funciona só durante a visita.
 */
@Injectable({ providedIn: 'root' })
export class PracticeStorageService {
  private readonly storage = inject(PRACTICE_STORAGE);
  private readonly data = signal<StoredDataV1>({ ...EMPTY, practices: [] });
  private readonly writable = signal(true);
  private readonly persistent = signal(false);

  /** Treinos salvos, do mais recente para o mais antigo. */
  readonly practices = computed(() =>
    [...this.data().practices].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  );
  /** Última configuração iniciada, se houver. */
  readonly last = computed(() => this.data().last);
  /** Se o que for salvo sobrevive a fechar o navegador. */
  readonly isPersistent = this.persistent.asReadonly();

  constructor() {
    this.load();
  }

  get(id: string): SavedPractice | undefined {
    return this.data().practices.find((p) => p.id === id);
  }

  /** Salva um treino novo. Nome vazio vira "Treino sem nome". */
  save(name: string, config: PracticeConfig): SavedPractice {
    const now = new Date().toISOString();
    const practice: SavedPractice = {
      id: newId(),
      name: cleanName(name) || 'Treino sem nome',
      config: copyConfig(config),
      createdAt: now,
      updatedAt: now,
    };
    this.update((d) => ({ ...d, practices: [...d.practices, practice] }));
    return practice;
  }

  rename(id: string, name: string): void {
    const clean = cleanName(name);
    if (!clean) return;
    this.update((d) => ({
      ...d,
      practices: d.practices.map((p) =>
        p.id === id ? { ...p, name: clean, updatedAt: new Date().toISOString() } : p,
      ),
    }));
  }

  remove(id: string): void {
    this.update((d) => ({ ...d, practices: d.practices.filter((p) => p.id !== id) }));
  }

  /** Guarda a configuração iniciada por último. */
  rememberLast(config: PracticeConfig): void {
    this.update((d) => ({ ...d, last: copyConfig(config) }));
  }

  private load(): void {
    let raw: string | null = null;
    try {
      raw = this.storage?.getItem(PRACTICES_STORAGE_KEY) ?? null;
      this.persistent.set(this.storage !== null);
    } catch {
      this.persistent.set(false);
    }
    const result = parseStoredData(raw);
    this.data.set(result.data);
    // Dados de uma versão mais nova do app: lê nada e não sobrescreve.
    this.writable.set(result.status !== 'newer');
    if (result.status === 'newer') this.persistent.set(false);
  }

  private update(change: (d: StoredDataV1) => StoredDataV1): void {
    this.data.update(change);
    if (!this.writable() || !this.storage) return;
    try {
      this.storage.setItem(PRACTICES_STORAGE_KEY, JSON.stringify(this.data()));
      this.persistent.set(true);
    } catch {
      // Cota cheia ou armazenamento bloqueado: segue só na memória desta visita.
      this.persistent.set(false);
    }
  }
}
