import { Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import catalogData from '../../../../data/chords.json';
import { CatalogPhase, Chord, isChord } from '../models';

/**
 * Lê e valida o catálogo de acordes (formato de data/chords.json). Lança um erro que lista
 * os problemas encontrados, para que um catálogo quebrado falhe logo nos testes e no build,
 * e não no meio de um treino.
 */
export function parseChordCatalog(data: unknown): Chord[] {
  const chords = (data as { chords?: unknown } | null)?.chords;
  if (!Array.isArray(chords)) throw new Error('Catálogo de acordes sem a lista "chords".');

  const problems: string[] = [];
  const invalid = chords.filter((c) => !isChord(c));
  if (invalid.length) {
    const ids = invalid.map((c) => (c as { id?: unknown } | null)?.id ?? '?');
    problems.push(`formato inválido: ${ids.join(', ')}`);
  }
  const valid = chords.filter(isChord);

  const seen = new Set<string>();
  const duplicates = valid.filter((c) => (seen.has(c.id) ? true : (seen.add(c.id), false)));
  if (duplicates.length) problems.push(`ids repetidos: ${duplicates.map((c) => c.id).join(', ')}`);

  const orphans = valid.filter((c) => c.variantOf !== undefined && !seen.has(c.variantOf));
  if (orphans.length) {
    problems.push(`variações sem acorde principal: ${orphans.map((c) => c.id).join(', ')}`);
  }

  if (problems.length) throw new Error(`Catálogo de acordes inválido: ${problems.join('; ')}.`);
  return valid;
}

/** Catálogo completo. Vai no bundle (sem chamada de rede), validado uma vez ao ser lido. */
export const CHORD_CATALOG = new InjectionToken<readonly Chord[]>('CHORD_CATALOG', {
  providedIn: 'root',
  factory: () => Object.freeze(parseChordCatalog(catalogData)),
});

/** Maior fase do catálogo liberada no app. No MVP, só os 10 acordes da fase 1. */
export const UNLOCKED_CATALOG_PHASE = new InjectionToken<CatalogPhase>('UNLOCKED_CATALOG_PHASE', {
  providedIn: 'root',
  factory: () => 1,
});

/**
 * Acesso ao catálogo de acordes. Todas as consultas consideram só as fases liberadas
 * (`unlockedPhase`), para que a interface nunca mostre um acorde ainda não disponível.
 */
@Injectable({ providedIn: 'root' })
export class ChordLibraryService {
  private readonly catalog = inject(CHORD_CATALOG);
  private readonly phase = signal<CatalogPhase>(inject(UNLOCKED_CATALOG_PHASE));

  /** Maior fase liberada. */
  readonly unlockedPhase = this.phase.asReadonly();

  /** Todos os acordes liberados, incluindo variações, na ordem do catálogo. */
  readonly all = computed(() => this.catalog.filter((c) => c.catalogPhase <= this.phase()));

  /** Acordes liberados que não são variações (o que aparece na grade de escolha). */
  readonly main = computed(() => this.all().filter((c) => c.variantOf === undefined));

  /** Ids liberados, para validar configurações de treino (`validatePracticeConfig`). */
  readonly ids = computed<ReadonlySet<string>>(() => new Set(this.all().map((c) => c.id)));

  private readonly byIdIndex = computed(() => new Map(this.all().map((c) => [c.id, c])));

  /** Acorde liberado com este id, ou `undefined`. */
  byId(id: string): Chord | undefined {
    return this.byIdIndex().get(id);
  }

  /** Acordes de uma fase do catálogo; vazio se a fase ainda não foi liberada. */
  byPhase(phase: CatalogPhase): Chord[] {
    return this.all().filter((c) => c.catalogPhase === phase);
  }

  /** Variações liberadas de um acorde principal (ex.: "F" → F simplificado). */
  variantsOf(id: string): Chord[] {
    return this.all().filter((c) => c.variantOf === id);
  }

  /** Libera as fases do catálogo até `phase` (usado pela biblioteca completa, fase 6). */
  unlockUpTo(phase: CatalogPhase): void {
    this.phase.set(phase);
  }
}
