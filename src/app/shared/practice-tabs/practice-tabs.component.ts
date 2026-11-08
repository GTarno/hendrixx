import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PracticeStorageService } from '../../core/presets/practice-storage.service';

/** Abas "Montar treino" e "Meus treinos". */
@Component({
  selector: 'app-practice-tabs',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="tabs" aria-label="Treinos">
      <a
        routerLink="/"
        routerLinkActive="active"
        [routerLinkActiveOptions]="{ exact: true }"
        ariaCurrentWhenActive="page"
        >Montar treino</a
      >
      <a routerLink="/treinos" routerLinkActive="active" ariaCurrentWhenActive="page">
        Meus treinos
        @if (count()) {
          <span class="count">{{ count() }}</span>
        }
      </a>
    </nav>
  `,
  styles: `
    .tabs {
      display: flex;
      gap: 4px;
      border-bottom: 1.5px solid var(--line);
    }
    a {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 48px;
      padding: 0 14px;
      border-bottom: 3px solid transparent;
      margin-bottom: -1.5px;
      color: var(--muted);
      font-weight: 700;
      text-decoration: none;
    }
    a.active {
      color: var(--ink);
      border-bottom-color: var(--accent);
    }
    .count {
      min-width: 1.5em;
      padding: 0 6px;
      border-radius: 999px;
      background: var(--surface-2);
      font-size: 0.8rem;
      text-align: center;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PracticeTabsComponent {
  private readonly storage = inject(PracticeStorageService);
  protected readonly count = computed(() => this.storage.practices().length);
}
