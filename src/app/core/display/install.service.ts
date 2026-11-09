import { DOCUMENT, Injectable, InjectionToken, inject, signal } from '@angular/core';

/** Onde o app está aberto, para mostrar o passo a passo certo de instalação. */
export type InstallPlatform = 'android' | 'ios' | 'desktop';

/** Evento do Chrome/Edge que permite abrir a instalação a partir de um botão do app. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface InstallEnvironment {
  userAgent: string;
  maxTouchPoints: number;
  /** Se o app já está aberto como app instalado (tela própria, sem barra do navegador). */
  standalone: boolean;
}

/** Informações do navegador (injetáveis para testes). */
export const INSTALL_ENVIRONMENT = new InjectionToken<InstallEnvironment>('INSTALL_ENVIRONMENT', {
  providedIn: 'root',
  factory: () => {
    const win = inject(DOCUMENT).defaultView;
    const nav = win?.navigator as (Navigator & { standalone?: boolean }) | undefined;
    const standaloneQuery =
      typeof win?.matchMedia === 'function' && win.matchMedia('(display-mode: standalone)').matches;
    return {
      userAgent: nav?.userAgent ?? '',
      maxTouchPoints: nav?.maxTouchPoints ?? 0,
      standalone: standaloneQuery || nav?.standalone === true,
    };
  },
});

/** Plataforma a partir do navegador. iPads recentes se apresentam como Mac com tela de toque. */
export function detectPlatform(userAgent: string, maxTouchPoints = 0): InstallPlatform {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return 'ios';
  if (/Android/i.test(userAgent)) return 'android';
  return 'desktop';
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

/**
 * Instalação do app (PWA), sempre opcional: o Hendrixx funciona inteiro no navegador.
 * Guarda o pedido de instalação do navegador para o botão "Instalar" da página de instalação,
 * em vez de deixar o navegador mostrar a sugestão por conta própria.
 */
@Injectable({ providedIn: 'root' })
export class InstallService {
  private readonly env = inject(INSTALL_ENVIRONMENT);
  private deferred: BeforeInstallPromptEvent | null = null;
  private readonly promptable = signal(false);
  private readonly isInstalled = signal(this.env.standalone);

  readonly platform: InstallPlatform = detectPlatform(this.env.userAgent, this.env.maxTouchPoints);
  /** Se o navegador permite instalar por um botão do app (Chrome, Edge, Android). */
  readonly canPrompt = this.promptable.asReadonly();
  /** Se o app está aberto como app instalado. */
  readonly installed = this.isInstalled.asReadonly();

  constructor() {
    const win = inject(DOCUMENT).defaultView;
    win?.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferred = event as BeforeInstallPromptEvent;
      this.promptable.set(true);
    });
    win?.addEventListener('appinstalled', () => {
      this.deferred = null;
      this.promptable.set(false);
      this.isInstalled.set(true);
    });
  }

  /** Abre a instalação do navegador. Só funciona a partir de um clique da pessoa. */
  async prompt(): Promise<InstallOutcome> {
    const event = this.deferred;
    if (!event) return 'unavailable';
    // O mesmo pedido só pode ser usado uma vez.
    this.deferred = null;
    this.promptable.set(false);
    try {
      await event.prompt();
      const { outcome } = await event.userChoice;
      return outcome;
    } catch {
      return 'unavailable';
    }
  }
}
