import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  viewChild,
  viewChildren,
} from '@angular/core';
import { MetronomeService } from '../../core/audio/metronome.service';
import { BEATS_PER_BAR } from '../../core/models';
import { PracticeSessionService } from '../../core/session/practice-session.service';
import { FrameBeat, REST_FRAME, metronomeFrame } from './metronome-frame';

/**
 * Metrônomo visual: pêndulo, pontos dos tempos com pulso e barra até a troca de acorde.
 *
 * A cada quadro (`requestAnimationFrame`) lê o relógio do AudioContext e escreve só estilos
 * no DOM, sem passar pela detecção de mudanças do Angular. Visual e som saem do mesmo relógio,
 * então ficam alinhados; ao voltar de uma aba em segundo plano, o próximo quadro já
 * ressincroniza. Com `prefers-reduced-motion`, os estados mudam sem animação.
 */
@Component({
  selector: 'app-metronome-visual',
  templateUrl: './metronome-visual.component.html',
  styleUrl: './metronome-visual.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetronomeVisualComponent {
  private readonly session = inject(PracticeSessionService);
  private readonly metronome = inject(MetronomeService);

  private readonly arm = viewChild.required<ElementRef<SVGGElement>>('arm');
  private readonly fill = viewChild.required<ElementRef<HTMLElement>>('fill');
  private readonly dots = viewChildren<ElementRef<HTMLElement>>('dot');

  protected readonly beats = Array.from({ length: BEATS_PER_BAR }, (_, i) => i);
  protected readonly beatInBar = this.session.beatInBar;

  protected readonly beatLabel = computed(() => {
    const beat = this.beatInBar();
    return beat === null ? 'Aguardando o primeiro tempo' : `Tempo ${beat + 1} de ${BEATS_PER_BAR}`;
  });

  private readonly reducedMotion =
    typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  private frameId: number | null = null;

  constructor() {
    afterNextRender(() => this.loop());
    inject(DestroyRef).onDestroy(() => {
      if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    });
  }

  /** Desenha o quadro do instante atual do relógio de áudio. */
  drawFrame(): void {
    const beat = this.session.currentBeat();
    const frameBeat: FrameBeat | null =
      beat && beat.kind !== 'end'
        ? {
            time: beat.time,
            duration: beat.duration,
            beatInBar: beat.beatInBar,
            beatInChord: beat.kind === 'chord' ? beat.beatInChord : undefined,
          }
        : null;
    const frame = frameBeat
      ? metronomeFrame(
          this.metronome.audioTime(),
          frameBeat,
          this.session.config()?.beatsPerChord ?? BEATS_PER_BAR,
          this.reducedMotion?.matches ?? false,
        )
      : REST_FRAME;

    this.arm().nativeElement.style.transform = `rotate(${frame.pendulumDeg.toFixed(2)}deg)`;
    this.fill().nativeElement.style.width = `${(frame.progress * 100).toFixed(2)}%`;
    this.dots().forEach((dot, i) => {
      const scale = frameBeat && i === frameBeat.beatInBar ? frame.pulseScale : 1;
      dot.nativeElement.style.transform = scale === 1 ? '' : `scale(${scale.toFixed(3)})`;
    });
  }

  private loop(): void {
    if (typeof requestAnimationFrame !== 'function') return;
    const tick = () => {
      this.drawFrame();
      this.frameId = requestAnimationFrame(tick);
    };
    this.frameId = requestAnimationFrame(tick);
  }
}
