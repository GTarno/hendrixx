import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PracticeConfig } from '../../core/models';
import {
  NAME_MAX_LENGTH,
  PracticeStorageService,
  SavedPractice,
} from '../../core/presets/practice-storage.service';

/** "Salvar como treino": botão que abre um campo de nome e guarda o treino em Meus treinos. */
@Component({
  selector: 'app-save-practice',
  imports: [RouterLink],
  templateUrl: './save-practice.component.html',
  styleUrl: './save-practice.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.open]': "state() !== 'closed'" },
})
export class SavePracticeComponent {
  private readonly storage = inject(PracticeStorageService);

  readonly config = input.required<PracticeConfig>();
  /** Nome sugerido no campo. */
  readonly suggestedName = input('');
  readonly disabled = input(false);

  protected readonly maxLength = NAME_MAX_LENGTH;
  protected readonly state = signal<'closed' | 'editing' | 'saved'>('closed');
  protected readonly saved = signal<SavedPractice | null>(null);
  protected readonly persistent = this.storage.isPersistent;
  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  protected open(): void {
    this.state.set('editing');
    queueMicrotask(() => this.nameInput()?.nativeElement.select());
  }

  protected cancel(): void {
    this.state.set('closed');
  }

  /** Salva pelo botão ou pelo Enter (sem enviar formulários em volta). */
  protected save(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const name = this.nameInput()?.nativeElement.value ?? '';
    this.saved.set(this.storage.save(name, this.config()));
    this.state.set('saved');
  }

  protected again(): void {
    this.saved.set(null);
    this.state.set('closed');
  }
}
