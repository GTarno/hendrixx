import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ChordNamingService } from '../../core/preferences/chord-naming.service';
import { PracticeSessionService } from '../../core/session/practice-session.service';

/**
 * Tela de treino PROVISÓRIA: só o necessário para usar o botão Iniciar da tela 1.
 * A tela completa (diagrama grande, pulso, pausa, resumo) é a issue #14.
 */
@Component({
  selector: 'app-practice-runner-page',
  template: `
    <section class="runner">
      @if (session.status() === 'idle') {
        <p>Nenhum treino em andamento.</p>
      } @else if (session.status() === 'finished') {
        <p>Treino concluído.</p>
      } @else {
        <p class="label">{{ session.status() === 'count-in' ? 'Contagem' : 'Acorde atual' }}</p>
        <p class="current" aria-live="polite">{{ current() }}</p>
        <p>Próximo: {{ next() }}</p>
      }
      <button type="button" (click)="back()">Voltar ao treino</button>
    </section>
  `,
  styles: `
    .runner {
      display: grid;
      gap: 8px;
      justify-items: center;
      padding: 24px 16px;
      text-align: center;
    }
    .label {
      margin: 0;
      color: var(--muted);
    }
    .current {
      margin: 0;
      font-size: 6rem;
      font-weight: 800;
      line-height: 1;
    }
    button {
      min-height: 48px;
      padding: 0 20px;
      border-radius: 12px;
      border: 1.5px solid var(--line);
      background: transparent;
      font-weight: 700;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PracticeRunnerPage {
  protected readonly session = inject(PracticeSessionService);
  private readonly naming = inject(ChordNamingService);
  private readonly router = inject(Router);

  protected readonly current = computed(() => {
    const count = this.session.countInNumber();
    if (count !== null) return String(count);
    const chord = this.session.currentChord();
    return chord ? this.naming.label(chord) : '…';
  });

  protected readonly next = computed(() => {
    const chord = this.session.nextChord();
    return chord ? this.naming.label(chord) : '–';
  });

  protected back(): void {
    this.session.reset();
    void this.router.navigate(['/']);
  }
}
