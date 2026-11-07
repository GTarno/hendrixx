import { TestBed } from '@angular/core/testing';
import { StageThemeService } from './stage-theme.service';

describe('StageThemeService', () => {
  const root = () => document.documentElement.classList;

  beforeEach(() => {
    try {
      localStorage.clear();
    } catch {
      /* sem armazenamento */
    }
    root().remove('stage-dark', 'stage-light');
  });

  it('é escuro por padrão', () => {
    expect(TestBed.inject(StageThemeService).theme()).toBe('dark');
  });

  it('aplica e retira a classe do tema no <html>', () => {
    const theme = TestBed.inject(StageThemeService);
    theme.apply();
    expect(root().contains('stage-dark')).toBe(true);
    theme.apply('light');
    expect(root().contains('stage-light')).toBe(true);
    expect(root().contains('stage-dark')).toBe(false);
    theme.clear();
    expect(root().contains('stage-light')).toBe(false);
  });

  it('alterna e guarda a escolha para a próxima visita', () => {
    TestBed.inject(StageThemeService).toggle();
    expect(TestBed.inject(StageThemeService).theme()).toBe('light');
    TestBed.resetTestingModule();
    expect(TestBed.inject(StageThemeService).theme()).toBe('light');
  });
});
