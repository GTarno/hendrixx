import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { PracticeDraftService } from '../setup/practice-draft.service';
import { ChordDetailPage } from './chord-detail.page';

describe('ChordDetailPage', () => {
  function render(id: string) {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(ChordDetailPage);
    fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const button = (label: string) =>
      host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
    return { fixture, host, button };
  }

  it('mostra nome, tipo, dificuldade, notas e variações', () => {
    const { host } = render('F');
    expect(host.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('F Fá');
    expect(host.querySelector('.meta')?.textContent).toContain('Maior');
    expect(host.querySelector('.meta')?.textContent).toContain('Com pestana');
    const forms = [...host.querySelectorAll('.form h2')].map((h) => h.textContent?.trim());
    expect(forms).toEqual(['Forma principal', 'Simplificado']);
    expect(host.querySelectorAll('app-chord-diagram')).toHaveLength(2);
    expect(host.querySelector('.notes')?.textContent).toContain('F C F A C F');
  });

  it('abre a partir da variação também', () => {
    const { host } = render('F-simples');
    expect(host.querySelectorAll('.form')).toHaveLength(2);
  });

  it('adiciona a variação ao treino e volta para a montagem', () => {
    const { button } = render('F');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    button('Adicionar F (Simplificado) ao treino')?.click();
    expect(TestBed.inject(PracticeDraftService).chordIds()).toEqual([
      'C',
      'D',
      'E',
      'F',
      'F-simples',
    ]);
    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('acorde que já está no treino mostra o aviso', () => {
    const { host } = render('C');
    expect(host.querySelector('.badge')?.textContent).toContain('Já está no treino');
    expect(host.querySelector('button[aria-label="Adicionar C ao treino"]')).toBeNull();
  });

  it('id desconhecido', () => {
    const { host } = render('Cadd9');
    expect(host.querySelector('.empty')?.textContent).toContain('Acorde não encontrado');
  });
});
