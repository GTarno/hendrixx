import { DOCUMENT, Injectable, inject, signal } from '@angular/core';

export type StageTheme = 'dark' | 'light';

const STORAGE_KEY = 'hendrixx.stageTheme';
const CLASSES: Record<StageTheme, string> = { dark: 'stage-dark', light: 'stage-light' };

/**
 * Tema da tela de treino: escuro por padrão (ofusca menos com o celular na estante), com a
 * escolha da pessoa guardada no navegador. As outras telas seguem o tema do sistema.
 */
@Injectable({ providedIn: 'root' })
export class StageThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly current = signal<StageTheme>(this.read());

  readonly theme = this.current.asReadonly();

  set(theme: StageTheme): void {
    this.current.set(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Sem armazenamento (aba privada, bloqueio): a escolha vale só nesta visita.
    }
  }

  toggle(): void {
    this.set(this.current() === 'dark' ? 'light' : 'dark');
  }

  /** Aplica o tema na página (classe no <html>), vencendo o tema do sistema. */
  apply(theme: StageTheme = this.current()): void {
    const root = this.doc.documentElement;
    root.classList.remove(CLASSES.dark, CLASSES.light);
    root.classList.add(CLASSES[theme]);
  }

  /** Volta ao tema do sistema (ao sair da tela de treino). */
  clear(): void {
    this.doc.documentElement.classList.remove(CLASSES.dark, CLASSES.light);
  }

  private read(): StageTheme {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  }
}
