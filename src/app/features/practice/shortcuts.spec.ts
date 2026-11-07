import { shortcutFor } from './shortcuts';

const key = (k: string, target: EventTarget | null = document.body, mods = {}) =>
  shortcutFor({ key: k, ctrlKey: false, metaKey: false, altKey: false, target, ...mods });

describe('shortcutFor', () => {
  it.each([
    [' ', 'toggle-pause'],
    ['Escape', 'stop'],
    ['ArrowUp', 'bpm-up'],
    ['ArrowDown', 'bpm-down'],
    ['f', 'fullscreen'],
    ['F', 'fullscreen'],
    ['n', 'naming'],
    ['N', 'naming'],
  ])('%j → %s', (k, action) => {
    expect(key(k)).toBe(action);
  });

  it('ignora outras teclas e combinações com Ctrl, Cmd ou Alt', () => {
    expect(key('a')).toBeNull();
    expect(key('Enter')).toBeNull();
    expect(key('f', document.body, { ctrlKey: true })).toBeNull();
    expect(key('n', document.body, { metaKey: true })).toBeNull();
    expect(key(' ', document.body, { altKey: true })).toBeNull();
  });

  it('não interfere em campos de texto, números e sliders', () => {
    for (const type of ['text', 'number', 'range']) {
      const input = document.createElement('input');
      input.type = type;
      expect(key('ArrowUp', input)).toBeNull();
      expect(key('n', input)).toBeNull();
    }
    expect(key(' ', document.createElement('textarea'))).toBeNull();
  });

  it('deixa o Espaço acionar o botão focado em vez de pausar', () => {
    expect(key(' ', document.createElement('button'))).toBeNull();
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    expect(key(' ', checkbox)).toBeNull();
    // As outras teclas continuam valendo com um botão focado.
    expect(key('Escape', document.createElement('button'))).toBe('stop');
  });
});
