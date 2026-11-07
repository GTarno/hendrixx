import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { ChordNamingService } from './core/preferences/chord-naming.service';

describe('App', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [App], providers: [provideRouter([])] });
  });

  it('mostra a marca e a troca de nomenclatura', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.brand')?.textContent).toContain('Hendrixx');

    const [cifra, pt] = host.querySelectorAll<HTMLButtonElement>('.naming button');
    expect(cifra.getAttribute('aria-pressed')).toBe('true');
    pt.click();
    fixture.detectChanges();
    expect(TestBed.inject(ChordNamingService).naming()).toBe('pt');
    expect(pt.getAttribute('aria-pressed')).toBe('true');
  });
});
