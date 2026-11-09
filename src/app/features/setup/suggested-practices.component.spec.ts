import { TestBed } from '@angular/core/testing';
import { ChordNamingService } from '../../core/preferences/chord-naming.service';
import { PracticeDraftService } from './practice-draft.service';
import { SuggestedPracticesComponent } from './suggested-practices.component';

describe('SuggestedPracticesComponent', () => {
  function render() {
    const fixture = TestBed.createComponent(SuggestedPracticesComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const cards = () => [...host.querySelectorAll<HTMLButtonElement>('.card')];
    return { fixture, host, cards, update: () => fixture.detectChanges() };
  }

  it('mostra os 7 treinos com acordes e BPM', () => {
    const { cards } = render();
    expect(cards()).toHaveLength(7);
    expect(cards()[0].querySelector('.name')?.textContent).toBe('Troca lenta');
    expect(cards()[0].querySelector('.chords')?.textContent).toBe('C ↔ G · 50 bpm');
    expect(cards()[2].querySelector('.chords')?.textContent).toBe('C → G → Am → F · 70 bpm');
  });

  it('tocar num treino preenche a tela de montar, sem iniciar', () => {
    const { cards, update, host } = render();
    cards()[4].click();
    update();
    const draft = TestBed.inject(PracticeDraftService);
    expect(draft.config()).toMatchObject({
      chordIds: ['C', 'G', 'Am', 'F'],
      bpm: 50,
      bpmProgression: { stepBpm: 5, everyCycles: 2, targetBpm: 80 },
    });
    expect(cards()[4].getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[aria-live]')?.textContent).toContain('Progressão de BPM');
  });

  it('usa a nomenclatura escolhida', () => {
    TestBed.inject(ChordNamingService).set('pt');
    const { cards } = render();
    expect(cards()[0].querySelector('.chords')?.textContent).toBe('Dó ↔ Sol · 50 bpm');
  });
});
