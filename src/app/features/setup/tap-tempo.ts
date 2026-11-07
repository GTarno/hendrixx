import { clampBpm } from '../../core/models';

/**
 * Tap tempo: a pessoa toca no ritmo e o BPM sai da média dos intervalos dos últimos 4 toques.
 * Uma pausa maior que `resetAfterMs` recomeça a contagem.
 */
export class TapTempo {
  private taps: number[] = [];

  constructor(
    private readonly resetAfterMs = 2500,
    private readonly maxTaps = 4,
  ) {}

  /** Registra um toque em `nowMs`. Devolve o BPM (30–240) a partir do 2º toque, ou `null`. */
  tap(nowMs: number): number | null {
    const last = this.taps[this.taps.length - 1];
    if (last !== undefined && nowMs - last > this.resetAfterMs) this.taps = [];
    this.taps.push(nowMs);
    if (this.taps.length > this.maxTaps) this.taps.shift();
    if (this.taps.length < 2) return null;
    const interval = (this.taps[this.taps.length - 1] - this.taps[0]) / (this.taps.length - 1);
    return interval > 0 ? clampBpm(60000 / interval) : null;
  }

  /** Toques considerados na média atual. */
  get count(): number {
    return this.taps.length;
  }

  reset(): void {
    this.taps = [];
  }
}
