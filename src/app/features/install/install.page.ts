import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  InstallOutcome,
  InstallPlatform,
  InstallService,
} from '../../core/display/install.service';

interface PlatformGuide {
  id: InstallPlatform;
  title: string;
  browser: string;
  steps: string[];
  uninstall: string;
}

export const PLATFORM_GUIDES: readonly PlatformGuide[] = [
  {
    id: 'android',
    title: 'Android',
    browser: 'No Chrome (ou Edge, Samsung Internet):',
    steps: [
      'Abra o Hendrixx no navegador.',
      'Toque no menu ⋮, no canto de cima.',
      'Toque em “Instalar app” (ou “Adicionar à tela inicial”).',
      'Confirme em “Instalar”. O ícone aparece junto dos outros apps.',
    ],
    uninstall: 'Para remover: segure o ícone do Hendrixx e toque em “Desinstalar”.',
  },
  {
    id: 'ios',
    title: 'iPhone e iPad',
    browser: 'No Safari:',
    steps: [
      'Abra o Hendrixx no Safari.',
      'Toque em Compartilhar (o quadrado com a seta para cima).',
      'Role a lista e toque em “Adicionar à Tela de Início”.',
      'Confirme em “Adicionar”. O ícone aparece na tela de início.',
    ],
    uninstall: 'Para remover: segure o ícone do Hendrixx e toque em “Remover App”.',
  },
  {
    id: 'desktop',
    title: 'Computador',
    browser: 'No Chrome ou Edge (Windows, Mac, Linux):',
    steps: [
      'Abra o Hendrixx no navegador.',
      'Clique no ícone de instalar, no fim da barra de endereço (um monitor com uma seta).',
      'Se não aparecer, abra o menu ⋮ e procure “Instalar Hendrixx” (no Chrome, em “Transmitir, salvar e compartilhar”).',
      'Confirme em “Instalar”. O app abre numa janela própria.',
    ],
    uninstall: 'Para remover: abra o app instalado, menu ⋮ e “Desinstalar Hendrixx”.',
  },
];

const OUTCOME_TEXT: Record<InstallOutcome, string> = {
  accepted: 'Pronto! O Hendrixx foi instalado.',
  dismissed: 'Instalação cancelada. Você pode instalar depois, quando quiser.',
  unavailable: 'O navegador não abriu a instalação. Siga o passo a passo abaixo.',
};

/** Como usar no navegador e, se quiser, instalar o app (PWA). */
@Component({
  selector: 'app-install-page',
  imports: [RouterLink],
  templateUrl: './install.page.html',
  styleUrl: './install.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstallPage {
  protected readonly install = inject(InstallService);
  protected readonly outcome = signal<string | null>(null);

  /** A plataforma atual vem primeiro e marcada como "este aparelho". */
  protected readonly guides = computed(() => {
    const current = this.install.platform;
    return [...PLATFORM_GUIDES].sort((a, b) => +(b.id === current) - +(a.id === current));
  });

  protected async installNow(): Promise<void> {
    this.outcome.set(OUTCOME_TEXT[await this.install.prompt()]);
  }
}
