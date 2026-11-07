import { DOCUMENT, Injectable, inject, signal } from '@angular/core';

/** Tela cheia, quando o navegador permite (celulares e alguns apps não permitem). */
@Injectable({ providedIn: 'root' })
export class FullscreenService {
  private readonly doc = inject(DOCUMENT);
  private readonly on = signal(
    this.doc.fullscreenElement !== null && this.doc.fullscreenElement !== undefined,
  );

  /** Se o navegador oferece tela cheia. */
  readonly supported = this.doc.fullscreenEnabled === true;
  /** Se algo está em tela cheia agora. */
  readonly active = this.on.asReadonly();

  constructor() {
    this.doc.addEventListener('fullscreenchange', () => this.on.set(!!this.doc.fullscreenElement));
  }

  /** Coloca `element` em tela cheia, ou sai dela. Falhas (recusa do navegador) são ignoradas. */
  async toggle(element: Element): Promise<void> {
    if (this.doc.fullscreenElement) await this.exit();
    else await this.enter(element);
  }

  async enter(element: Element): Promise<void> {
    if (!this.supported || !element.requestFullscreen) return;
    try {
      await element.requestFullscreen();
    } catch {
      // Sem gesto da pessoa ou bloqueado pelo navegador: segue sem tela cheia.
    }
  }

  async exit(): Promise<void> {
    if (!this.doc.fullscreenElement) return;
    try {
      await this.doc.exitFullscreen();
    } catch {
      // Já saiu.
    }
  }
}
