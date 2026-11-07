import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SwUpdate, UnrecoverableStateEvent, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { AUDIO_CONTEXT_FACTORY } from '../../core/audio/metronome.service';
import { SCHEDULER_TIMER } from '../../core/audio/scheduler-timer';
import { FakeAudioContext, FakeTimer } from '../../core/audio/testing/fake-audio';
import { createPracticeConfig } from '../../core/models';
import { PracticeSessionService } from '../../core/session/practice-session.service';
import { UpdateBannerComponent } from './update-banner.component';

describe('UpdateBannerComponent', () => {
  let versionUpdates: Subject<VersionEvent>;
  let unrecoverable: Subject<UnrecoverableStateEvent>;
  let reload: ReturnType<typeof vi.fn<() => void>>;

  const ready = { type: 'VERSION_READY' } as VersionEvent;

  function render(enabled = true) {
    versionUpdates = new Subject();
    unrecoverable = new Subject();
    reload = vi.fn<() => void>();
    TestBed.configureTestingModule({
      providers: [
        { provide: SwUpdate, useValue: { isEnabled: enabled, versionUpdates, unrecoverable } },
        { provide: DOCUMENT, useFactory: () => fakeDocument(reload) },
        {
          provide: AUDIO_CONTEXT_FACTORY,
          useValue: () => new FakeAudioContext() as unknown as AudioContext,
        },
        { provide: SCHEDULER_TIMER, useValue: new FakeTimer() },
      ],
    });
    const fixture = TestBed.createComponent(UpdateBannerComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const update = () => {
      TestBed.tick();
      fixture.detectChanges();
    };
    const button = (label: string) =>
      [...host.querySelectorAll<HTMLButtonElement>('button')].find(
        (b) => b.textContent?.trim() === label,
      );
    return { host, update, button };
  }

  /** Documento real com `location.reload` espionado. */
  function fakeDocument(reloadFn: () => void): Document {
    const real = document;
    return new Proxy(real, {
      get(target, prop) {
        if (prop === 'location') return { reload: reloadFn };
        const value = Reflect.get(target, prop);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
  }

  it('não aparece sem versão nova', () => {
    const { host } = render();
    expect(host.querySelector('.banner')).toBeNull();
  });

  it('avisa quando uma versão nova foi baixada e atualiza ao tocar', () => {
    const { host, update, button } = render();
    versionUpdates.next(ready);
    update();
    expect(host.querySelector('.banner')?.textContent).toContain('Há uma versão nova do Hendrixx.');
    button('Atualizar')?.click();
    expect(reload).toHaveBeenCalled();
  });

  it('"Depois" esconde o aviso', () => {
    const { host, update, button } = render();
    versionUpdates.next(ready);
    update();
    button('Depois')?.click();
    update();
    expect(host.querySelector('.banner')).toBeNull();
  });

  it('ignora eventos que não são de versão pronta', () => {
    const { host, update } = render();
    versionUpdates.next({ type: 'VERSION_DETECTED' } as VersionEvent);
    versionUpdates.next({ type: 'NO_NEW_VERSION_DETECTED' } as VersionEvent);
    update();
    expect(host.querySelector('.banner')).toBeNull();
  });

  it('pede para recarregar quando a versão em cache não serve mais', () => {
    const { host, update, button } = render();
    unrecoverable.next({ type: 'UNRECOVERABLE_STATE', reason: 'teste' });
    update();
    expect(host.querySelector('.banner')?.textContent).toContain('precisa ser recarregado');
    expect(button('Depois')).toBeUndefined();
  });

  it('não aparece durante um treino, só depois dele', () => {
    const { host, update } = render();
    const session = TestBed.inject(PracticeSessionService);
    session.start(createPracticeConfig());
    versionUpdates.next(ready);
    update();
    expect(host.querySelector('.banner')).toBeNull();
    session.stop();
    update();
    expect(host.querySelector('.banner')).not.toBeNull();
  });

  it('sem service worker (desenvolvimento), não escuta nada', () => {
    const { host, update } = render(false);
    versionUpdates.next(ready);
    update();
    expect(host.querySelector('.banner')).toBeNull();
  });
});
