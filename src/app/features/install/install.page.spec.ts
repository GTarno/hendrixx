import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { INSTALL_ENVIRONMENT, InstallEnvironment } from '../../core/display/install.service';
import { InstallPage } from './install.page';

describe('InstallPage', () => {
  function render(env: Partial<InstallEnvironment> = {}) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: INSTALL_ENVIRONMENT,
          useValue: { userAgent: 'iPhone', maxTouchPoints: 5, standalone: false, ...env },
        },
      ],
    });
    const fixture = TestBed.createComponent(InstallPage);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    return { fixture, host, text: () => host.textContent ?? '' };
  }

  it('diz que não precisa instalar e mostra o passo a passo do aparelho primeiro', () => {
    const { host, text } = render();
    expect(text()).toContain('funciona inteiro aqui no navegador');
    const titles = [...host.querySelectorAll('.guide h3')].map((h) => h.textContent?.trim());
    expect(titles).toEqual(['iPhone e iPad este aparelho', 'Android', 'Computador']);
    expect(host.querySelector('.guide.current')?.textContent).toContain(
      'Adicionar à Tela de Início',
    );
    expect(host.querySelector('button.primary')).toBeNull();
  });

  it('com o pedido do navegador, instala pelo botão', async () => {
    const { fixture, host } = render({ userAgent: 'Android' });
    const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: string }>;
    };
    event.prompt = () => Promise.resolve();
    event.userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(event);
    fixture.detectChanges();

    const button = host.querySelector<HTMLButtonElement>('button.primary');
    expect(button?.textContent).toContain('Instalar o Hendrixx');
    button?.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(host.querySelector('.note')?.textContent).toContain('foi instalado');
  });

  it('já instalado, avisa e não oferece instalar', () => {
    const { host, text } = render({ standalone: true });
    expect(text()).toContain('já está usando o Hendrixx instalado');
    expect(host.querySelector('.why')).toBeNull();
  });
});
