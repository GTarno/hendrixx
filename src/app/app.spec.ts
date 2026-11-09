import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { App } from './app';
import { INSTALL_ENVIRONMENT } from './core/display/install.service';
import { ChordNamingService } from './core/preferences/chord-naming.service';

describe('App', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideServiceWorker('ngsw-worker.js', { enabled: false })],
    });
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

  it('mostra o link de instalação só quando o app não está instalado', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const link = (fixture.nativeElement as HTMLElement).querySelector('a.install');
    expect(link?.getAttribute('href')).toBe('/instalar');
  });

  it('esconde o link quando já está instalado', () => {
    TestBed.overrideProvider(INSTALL_ENVIRONMENT, {
      useValue: { userAgent: '', maxTouchPoints: 0, standalone: true },
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('a.install')).toBeNull();
  });
});
