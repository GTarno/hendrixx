import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { createPracticeConfig } from '../../core/models';
import { PracticeStorageService } from '../../core/presets/practice-storage.service';
import { SavePracticeComponent } from './save-practice.component';

describe('SavePracticeComponent', () => {
  function render(disabled = false) {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(SavePracticeComponent);
    fixture.componentRef.setInput('config', createPracticeConfig());
    fixture.componentRef.setInput('suggestedName', 'C D E F · 60 bpm');
    fixture.componentRef.setInput('disabled', disabled);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const update = () => fixture.detectChanges();
    const button = (label: string) =>
      [...host.querySelectorAll<HTMLButtonElement>('button')].find(
        (b) => b.textContent?.trim() === label || b.getAttribute('aria-label') === label,
      );
    return { fixture, host, update, button };
  }

  it('abre o campo com o nome sugerido e salva', () => {
    const { host, update, button } = render();
    button('Salvar como treino')?.click();
    update();
    const input = host.querySelector('input');
    expect(input?.value).toBe('C D E F · 60 bpm');
    expect(host.classList.contains('open')).toBe(true);
    if (input) input.value = 'Quarteto';
    button('Salvar')?.click();
    update();
    expect(
      TestBed.inject(PracticeStorageService)
        .practices()
        .map((p) => p.name),
    ).toEqual(['Quarteto']);
    expect(host.querySelector('[role="status"]')?.textContent).toContain(
      'Treino “Quarteto” salvo em',
    );
    expect(host.querySelector('a')?.getAttribute('href')).toBe('/treinos');
  });

  it('Enter salva sem enviar formulários em volta', () => {
    const { host, update, button } = render();
    button('Salvar como treino')?.click();
    update();
    const outer = vi.fn();
    host.addEventListener('keydown', outer);
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    host.querySelector('input')?.dispatchEvent(event);
    update();
    expect(event.defaultPrevented).toBe(true);
    expect(outer).not.toHaveBeenCalled();
    expect(TestBed.inject(PracticeStorageService).practices()).toHaveLength(1);
  });

  it('Cancelar e Esc fecham sem salvar', () => {
    const { host, update, button } = render();
    button('Salvar como treino')?.click();
    update();
    button('Cancelar')?.click();
    update();
    expect(host.querySelector('input')).toBeNull();
    button('Salvar como treino')?.click();
    update();
    host
      .querySelector('input')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    update();
    expect(host.querySelector('input')).toBeNull();
    expect(TestBed.inject(PracticeStorageService).practices()).toEqual([]);
  });

  it('fica desabilitado quando o treino não é válido', () => {
    const { button } = render(true);
    expect(button('Salvar como treino')?.disabled).toBe(true);
  });
});
