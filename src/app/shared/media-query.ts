import { DestroyRef, Signal, inject, signal } from '@angular/core';

/**
 * Signal que acompanha uma media query (ex.: layout de celular). Chame num contexto de
 * injeção (construtor ou inicializador de campo de componente). Sem `matchMedia`
 * (testes, servidor), vale `false`.
 */
export function mediaQuerySignal(query: string): Signal<boolean> {
  if (typeof matchMedia !== 'function') return signal(false).asReadonly();
  const mql = matchMedia(query);
  const matches = signal(mql.matches);
  const onChange = (event: MediaQueryListEvent) => matches.set(event.matches);
  mql.addEventListener?.('change', onChange);
  inject(DestroyRef).onDestroy(() => mql.removeEventListener?.('change', onChange));
  return matches.asReadonly();
}
