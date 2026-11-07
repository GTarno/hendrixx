import { DOCUMENT, Injectable, inject, signal } from '@angular/core';

/**
 * Mantém a tela acesa durante o treino (Screen Wake Lock API). Sem suporte ou com o pedido
 * negado, simplesmente não faz nada. O navegador solta o bloqueio quando a aba fica em
 * segundo plano; ao voltar, ele é pedido de novo se ainda for desejado.
 */
@Injectable({ providedIn: 'root' })
export class WakeLockService {
  private readonly doc = inject(DOCUMENT);
  private sentinel: WakeLockSentinel | null = null;
  private wanted = false;
  private readonly held = signal(false);

  /** Se a tela está sendo mantida acesa agora. */
  readonly active = this.held.asReadonly();

  constructor() {
    this.doc.addEventListener('visibilitychange', () => {
      if (this.wanted && this.doc.visibilityState === 'visible' && !this.sentinel) {
        void this.acquire();
      }
    });
  }

  /** Pede para manter a tela acesa. */
  async request(): Promise<void> {
    this.wanted = true;
    if (!this.sentinel) await this.acquire();
  }

  /** Deixa a tela apagar normalmente. */
  release(): void {
    this.wanted = false;
    const sentinel = this.sentinel;
    this.sentinel = null;
    this.held.set(false);
    if (sentinel) void sentinel.release().catch(() => undefined);
  }

  private async acquire(): Promise<void> {
    const wakeLock = this.doc.defaultView?.navigator.wakeLock;
    if (!wakeLock) return;
    try {
      const sentinel = await wakeLock.request('screen');
      if (!this.wanted) {
        // Soltaram enquanto o pedido estava em andamento.
        void sentinel.release().catch(() => undefined);
        return;
      }
      this.sentinel = sentinel;
      this.held.set(true);
      sentinel.addEventListener('release', () => {
        if (this.sentinel === sentinel) {
          this.sentinel = null;
          this.held.set(false);
        }
      });
    } catch {
      this.held.set(false);
    }
  }
}
