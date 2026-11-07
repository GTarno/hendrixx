import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FullscreenService } from './fullscreen.service';

function fakeDocument(enabled: boolean) {
  const doc = new EventTarget() as EventTarget & {
    fullscreenEnabled: boolean;
    fullscreenElement: Element | null;
    exitFullscreen: () => Promise<void>;
  };
  doc.fullscreenEnabled = enabled;
  doc.fullscreenElement = null;
  doc.exitFullscreen = vi.fn(async () => {
    doc.fullscreenElement = null;
    doc.dispatchEvent(new Event('fullscreenchange'));
  });
  return doc;
}

describe('FullscreenService', () => {
  it('entra e sai da tela cheia, acompanhando o estado', async () => {
    const doc = fakeDocument(true);
    TestBed.configureTestingModule({ providers: [{ provide: DOCUMENT, useValue: doc }] });
    const fullscreen = TestBed.inject(FullscreenService);
    const el = {
      requestFullscreen: vi.fn(async () => {
        doc.fullscreenElement = el as unknown as Element;
        doc.dispatchEvent(new Event('fullscreenchange'));
      }),
    };
    expect(fullscreen.supported).toBe(true);
    await fullscreen.toggle(el as unknown as Element);
    expect(fullscreen.active()).toBe(true);
    await fullscreen.toggle(el as unknown as Element);
    expect(doc.exitFullscreen).toHaveBeenCalled();
    expect(fullscreen.active()).toBe(false);
  });

  it('ignora recusa do navegador e falta de suporte', async () => {
    const doc = fakeDocument(true);
    TestBed.configureTestingModule({ providers: [{ provide: DOCUMENT, useValue: doc }] });
    const fullscreen = TestBed.inject(FullscreenService);
    const el = { requestFullscreen: vi.fn(async () => Promise.reject(new Error('negado'))) };
    await expect(fullscreen.enter(el as unknown as Element)).resolves.toBeUndefined();
    expect(fullscreen.active()).toBe(false);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: fakeDocument(false) }],
    });
    const unsupported = TestBed.inject(FullscreenService);
    expect(unsupported.supported).toBe(false);
    await unsupported.enter(el as unknown as Element);
    expect(el.requestFullscreen).toHaveBeenCalledTimes(1);
  });
});
