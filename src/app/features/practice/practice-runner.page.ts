import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  untracked,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { FullscreenService } from '../../core/display/fullscreen.service';
import { StageThemeService } from '../../core/display/stage-theme.service';
import { WakeLockService } from '../../core/display/wake-lock.service';
import { clampBpm } from '../../core/models';
import { ChordNamingService } from '../../core/preferences/chord-naming.service';
import { PracticeSessionService } from '../../core/session/practice-session.service';
import { ChordDiagramComponent } from '../../shared/chord-diagram/chord-diagram.component';
import { MetronomeVisualComponent } from '../../shared/metronome-visual/metronome-visual.component';
import { SavePracticeComponent } from '../../shared/save-practice/save-practice.component';
import { mediaQuerySignal } from '../../shared/media-query';
import { formatClock } from '../../shared/time-format';
import { PracticeDraftService, suggestedName } from '../setup/practice-draft.service';
import { SHORTCUT_HELP, ShortcutAction, shortcutFor } from './shortcuts';

/** Mesma condição do layout compacto em practice-runner.page.scss. */
const COMPACT_QUERY = '(max-width: 759px), (max-width: 1023px) and (orientation: portrait)';

const STATUS_LABELS = {
  idle: 'Parado',
  'count-in': 'Contagem',
  running: 'Tocando',
  paused: 'Pausado',
  finished: 'Concluído',
} as const;

/** Tela 2: treino em andamento e resumo (docs/wireframes.md, telas 2 e 2b). */
@Component({
  selector: 'app-practice-runner-page',
  imports: [ChordDiagramComponent, MetronomeVisualComponent, SavePracticeComponent],
  templateUrl: './practice-runner.page.html',
  styleUrl: './practice-runner.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class PracticeRunnerPage {
  protected readonly session = inject(PracticeSessionService);
  protected readonly naming = inject(ChordNamingService);
  private readonly draft = inject(PracticeDraftService);
  private readonly router = inject(Router);
  protected readonly stageTheme = inject(StageThemeService);
  protected readonly fullscreen = inject(FullscreenService);
  private readonly wakeLock = inject(WakeLockService);

  private readonly runnerEl = viewChild<ElementRef<HTMLElement>>('runnerEl');

  /** Celular em pé: layout compacto, sem as notas embaixo do diagrama grande. */
  protected readonly compactLayout = mediaQuerySignal(COMPACT_QUERY);

  protected readonly status = this.session.status;
  protected readonly statusLabel = computed(() => STATUS_LABELS[this.status()]);
  protected readonly isPlaying = computed(() => ['count-in', 'running'].includes(this.status()));
  protected readonly isActive = computed(() => this.isPlaying() || this.status() === 'paused');

  /** Na contagem (e antes do 1º clique), o destaque é o primeiro acorde, esmaecido. */
  protected readonly counting = computed(() => this.status() === 'count-in');

  /** Acorde do diagrama grande: o atual, ou o primeiro a tocar durante a contagem/pausa. */
  protected readonly stageChord = computed(
    () => this.session.currentChord() ?? this.session.nextChord(),
  );

  /** Texto grande: nome do acorde, número da contagem ou um marcador antes do 1º clique. */
  protected readonly bigText = computed(() => {
    const count = this.session.countInNumber();
    if (count !== null) return String(count);
    const chord = this.session.currentChord();
    if (chord) return this.naming.label(chord);
    return this.status() === 'paused' ? 'Pausado' : '·';
  });

  protected readonly bigAlt = computed(() => {
    const chord = this.session.currentChord();
    if (chord) return this.naming.altLabel(chord);
    if (this.counting()) return 'Contagem';
    const next = this.session.nextChord();
    return this.status() === 'paused' && next ? `Volta em ${this.naming.label(next)}` : '';
  });

  protected readonly stageLabel = computed(() =>
    this.session.currentChord() ? 'Acorde atual' : 'Posicione a mão',
  );

  /** Anúncio para leitores de tela: só muda na troca de acorde. */
  protected readonly announcement = computed(() => {
    const chord = this.session.currentChord();
    return chord ? `Acorde: ${chord.labelPt}` : '';
  });

  private readonly beatsPerChord = computed(() => this.session.config()?.beatsPerChord ?? 4);

  /** O próximo acorde ganha destaque nos últimos tempos antes da troca. */
  protected readonly changeSoon = computed(() => {
    if (this.counting()) return true;
    const left = this.session.beatsUntilChange();
    const n = this.beatsPerChord();
    return left !== null && (n === 1 || left <= Math.min(2, n - 1));
  });

  protected readonly changeCaption = computed(() => {
    const left = this.session.beatsUntilChange();
    const n = this.beatsPerChord();
    if (n === 1) return 'Troca a cada tempo';
    if (left === null) return `Troca a cada ${n} tempos`;
    return `Troca em ${left} ${left === 1 ? 'tempo' : 'tempos'}`;
  });

  protected readonly cycleText = computed(() => {
    const stop = this.session.config()?.stop;
    const cycle = this.session.cycle() + 1;
    return stop?.type === 'cycles' ? `Ciclo ${cycle} de ${stop.value}` : `Ciclo ${cycle}`;
  });

  protected readonly clockText = computed(() => {
    const stop = this.session.config()?.stop;
    const elapsed = formatClock(this.session.elapsedSeconds());
    return stop?.type === 'minutes' ? `${elapsed} / ${formatClock(stop.value * 60)}` : elapsed;
  });

  protected readonly summaryStats = computed(() => {
    const s = this.session.summary();
    if (!s) return '';
    return [
      `${s.cycles} ${s.cycles === 1 ? 'ciclo' : 'ciclos'}`,
      `${s.changes} ${s.changes === 1 ? 'troca' : 'trocas'}`,
      formatClock(s.elapsedSeconds),
    ].join(' · ');
  });

  protected readonly summaryConfig = computed(() => {
    const chords = this.session.chords().map((c) => this.naming.label(c));
    return `${chords.join(' → ')} · ${this.session.bpm()} bpm`;
  });

  protected readonly saveName = computed(() => {
    const config = this.session.config();
    return config
      ? suggestedName(
          config,
          this.session.chords().map((c) => c.labelCifra),
        )
      : '';
  });

  protected readonly fasterBpm = computed(() => clampBpm(this.session.bpm() + 5));

  protected readonly themeLabel = computed(() =>
    this.stageTheme.theme() === 'dark' ? 'Usar tema claro' : 'Usar tema escuro',
  );

  constructor() {
    // Tema da tela de treino (escuro por padrão), só enquanto ela está aberta.
    effect(() => this.stageTheme.apply(this.stageTheme.theme()));

    // Tela acesa enquanto toca; na pausa e no fim, volta ao normal.
    effect(() => {
      const playing = this.isPlaying();
      untracked(() => (playing ? void this.wakeLock.request() : this.wakeLock.release()));
    });

    // Sair da tela (pelo cabeçalho ou voltar do navegador) encerra o treino em andamento.
    inject(DestroyRef).onDestroy(() => {
      if (this.isActive()) this.session.reset();
      this.wakeLock.release();
      this.stageTheme.clear();
      void this.fullscreen.exit();
    });
  }

  protected readonly shortcuts = SHORTCUT_HELP;

  /** Atalhos de teclado (Espaço, Esc, ↑/↓, F, N). */
  protected onKeydown(event: KeyboardEvent): void {
    const action = shortcutFor(event);
    if (action && this.runShortcut(action)) event.preventDefault();
  }

  /** Executa o atalho se ele fizer sentido agora; devolve se executou. */
  private runShortcut(action: ShortcutAction): boolean {
    if (action === 'naming') {
      this.naming.toggle();
      return true;
    }
    if (!this.isActive()) return false;
    switch (action) {
      case 'toggle-pause':
        this.togglePause();
        return true;
      case 'stop':
        this.stop();
        return true;
      case 'bpm-up':
        this.stepBpm(5);
        return true;
      case 'bpm-down':
        this.stepBpm(-5);
        return true;
      case 'fullscreen':
        if (!this.fullscreen.supported) return false;
        this.toggleFullscreen();
        return true;
    }
  }

  protected toggleFullscreen(): void {
    const el = this.runnerEl()?.nativeElement;
    if (el) void this.fullscreen.toggle(el);
  }

  protected togglePause(): void {
    if (this.status() === 'paused') this.session.resume();
    else this.session.pause();
  }

  protected stop(): void {
    this.session.stop();
  }

  protected stepBpm(delta: number): void {
    this.session.setBpm(this.session.bpm() + delta);
  }

  /** Repete o mesmo treino (no próprio clique, por causa do áudio). */
  protected again(bpmDelta = 0): void {
    const config = this.session.config();
    if (!config) return;
    const bpm = clampBpm(this.session.bpm() + bpmDelta);
    this.draft.setBpm(bpm);
    this.session.start({ ...config, bpm });
  }

  protected adjust(): void {
    this.session.reset();
    void this.router.navigate(['/']);
  }
}
