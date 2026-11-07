import { TestBed } from '@angular/core/testing';
import { WakeLockService } from './wake-lock.service';

class FakeSentinel extends EventTarget {
  released = false;
  async release(): Promise<void> {
    this.released = true;
    this.dispatchEvent(new Event('release'));
  }
}

describe('WakeLockService', () => {
  let requests: FakeSentinel[];

  function installWakeLock(fail = false) {
    requests = [];
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: {
        request: vi.fn(async () => {
          if (fail) throw new Error('NotAllowedError');
          const sentinel = new FakeSentinel();
          requests.push(sentinel);
          return sentinel;
        }),
      },
    });
  }

  afterEach(() => {
    delete (navigator as { wakeLock?: unknown }).wakeLock;
  });

  it('mantém a tela acesa e solta quando pedido', async () => {
    installWakeLock();
    const wakeLock = TestBed.inject(WakeLockService);
    await wakeLock.request();
    expect(wakeLock.active()).toBe(true);
    expect(requests).toHaveLength(1);
    await wakeLock.request(); // já ativo: não pede de novo
    expect(requests).toHaveLength(1);
    wakeLock.release();
    expect(wakeLock.active()).toBe(false);
    expect(requests[0].released).toBe(true);
  });

  it('pede de novo ao voltar para a aba, se ainda for desejado', async () => {
    installWakeLock();
    const wakeLock = TestBed.inject(WakeLockService);
    await wakeLock.request();
    await requests[0].release(); // o navegador soltou ao esconder a aba
    expect(wakeLock.active()).toBe(false);
    document.dispatchEvent(new Event('visibilitychange'));
    await Promise.resolve();
    await Promise.resolve();
    expect(requests).toHaveLength(2);
    expect(wakeLock.active()).toBe(true);
  });

  it('sem suporte ou com o pedido negado, não faz nada', async () => {
    const wakeLock = TestBed.inject(WakeLockService);
    await wakeLock.request();
    expect(wakeLock.active()).toBe(false);
    installWakeLock(true);
    await wakeLock.request();
    expect(wakeLock.active()).toBe(false);
    expect(() => wakeLock.release()).not.toThrow();
  });
});
