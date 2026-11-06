import { InjectionToken } from '@angular/core';

/**
 * Timer que só ACORDA o agendador do metrônomo. Ele nunca dispara o clique: os cliques são
 * agendados no relógio do AudioContext. Por isso a imprecisão de um timer de JavaScript não
 * afeta o ritmo, desde que ele acorde com folga dentro da janela de lookahead.
 */
export interface SchedulerTimer {
  start(callback: () => void, intervalMs: number): void;
  stop(): void;
}

/**
 * Roda o laço do timer num Web Worker, que o navegador quase não desacelera com a aba em
 * segundo plano. Sem suporte a Worker, cai para uma cadeia de setTimeout na página.
 */
export class WorkerSchedulerTimer implements SchedulerTimer {
  private worker: Worker | null = null;
  private workerUrl: string | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  start(callback: () => void, intervalMs: number): void {
    this.stop();
    try {
      const source =
        'let id = null;' +
        'const loop = (ms) => { postMessage(0); id = setTimeout(loop, ms, ms); };' +
        'onmessage = (e) => { clearTimeout(id); id = null; if (e.data > 0) loop(e.data); };';
      this.workerUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
      this.worker = new Worker(this.workerUrl);
      this.worker.onmessage = () => callback();
      this.worker.postMessage(intervalMs);
    } catch {
      this.releaseWorker();
      const loop = () => {
        callback();
        this.timeoutId = setTimeout(loop, intervalMs);
      };
      this.timeoutId = setTimeout(loop, intervalMs);
    }
  }

  stop(): void {
    this.releaseWorker();
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  private releaseWorker(): void {
    if (this.worker) {
      this.worker.postMessage(0);
      this.worker.terminate();
      this.worker = null;
    }
    if (this.workerUrl) {
      URL.revokeObjectURL(this.workerUrl);
      this.workerUrl = null;
    }
  }
}

export const SCHEDULER_TIMER = new InjectionToken<SchedulerTimer>('SCHEDULER_TIMER', {
  providedIn: 'root',
  factory: () => new WorkerSchedulerTimer(),
});
