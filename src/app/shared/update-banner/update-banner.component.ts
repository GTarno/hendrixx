import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate } from '@angular/service-worker';
import { PracticeSessionService } from '../../core/session/practice-session.service';

/**
 * Faixa discreta avisando que há uma versão nova do app (PWA). Nunca aparece durante um
 * treino: recarregar a página pararia o metrônomo no meio.
 */
@Component({
  selector: 'app-update-banner',
  templateUrl: './update-banner.component.html',
  styleUrl: './update-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdateBannerComponent {
  private readonly updates = inject(SwUpdate);
  private readonly session = inject(PracticeSessionService);
  private readonly doc = inject(DOCUMENT);

  /** 'ready': versão nova baixada; 'broken': a versão em cache não pode mais ser usada. */
  protected readonly state = signal<'none' | 'ready' | 'broken'>('none');
  private readonly dismissed = signal(false);

  private readonly training = computed(() =>
    ['count-in', 'running', 'paused'].includes(this.session.status()),
  );

  protected readonly visible = computed(
    () => this.state() !== 'none' && !this.dismissed() && !this.training(),
  );

  constructor() {
    if (!this.updates.isEnabled) return;
    this.updates.versionUpdates.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event.type === 'VERSION_READY') {
        this.state.set('ready');
        this.dismissed.set(false);
      }
    });
    this.updates.unrecoverable.pipe(takeUntilDestroyed()).subscribe(() => {
      this.state.set('broken');
      this.dismissed.set(false);
    });
  }

  protected reload(): void {
    this.doc.location.reload();
  }

  protected dismiss(): void {
    this.dismissed.set(true);
  }
}
