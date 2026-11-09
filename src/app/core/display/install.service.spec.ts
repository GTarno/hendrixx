import { TestBed } from '@angular/core/testing';
import {
  INSTALL_ENVIRONMENT,
  InstallEnvironment,
  InstallService,
  detectPlatform,
} from './install.service';

const UA = {
  android:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36',
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  windows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
};

/** Simula o evento beforeinstallprompt do Chrome. */
function promptEvent(outcome: 'accepted' | 'dismissed') {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
    prompt: ReturnType<typeof vi.fn>;
    userChoice: Promise<{ outcome: string }>;
  };
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome });
  return event;
}

describe('detectPlatform', () => {
  it('reconhece Android, iPhone, iPad (como Mac com toque) e computador', () => {
    expect(detectPlatform(UA.android)).toBe('android');
    expect(detectPlatform(UA.iphone)).toBe('ios');
    expect(detectPlatform(UA.mac, 5)).toBe('ios');
    expect(detectPlatform(UA.mac, 0)).toBe('desktop');
    expect(detectPlatform(UA.windows)).toBe('desktop');
  });
});

describe('InstallService', () => {
  function create(env: Partial<InstallEnvironment> = {}) {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: INSTALL_ENVIRONMENT,
          useValue: { userAgent: UA.android, maxTouchPoints: 5, standalone: false, ...env },
        },
      ],
    });
    return TestBed.inject(InstallService);
  }

  it('sem pedido do navegador, não oferece o botão', async () => {
    const install = create();
    expect(install.platform).toBe('android');
    expect(install.canPrompt()).toBe(false);
    expect(install.installed()).toBe(false);
    expect(await install.prompt()).toBe('unavailable');
  });

  it('guarda o pedido do navegador e usa no clique, uma vez só', async () => {
    const install = create();
    const event = promptEvent('accepted');
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(install.canPrompt()).toBe(true);

    expect(await install.prompt()).toBe('accepted');
    expect(event.prompt).toHaveBeenCalledOnce();
    expect(install.canPrompt()).toBe(false);
    expect(await install.prompt()).toBe('unavailable');
  });

  it('marca como instalado quando o navegador avisa', () => {
    const install = create();
    window.dispatchEvent(promptEvent('dismissed'));
    window.dispatchEvent(new Event('appinstalled'));
    expect(install.installed()).toBe(true);
    expect(install.canPrompt()).toBe(false);
  });

  it('aberto como app instalado', () => {
    expect(create({ standalone: true }).installed()).toBe(true);
  });
});
