/** Atalhos de teclado da tela de treino (docs/wireframes.md, "Atalhos de teclado"). */
export type ShortcutAction =
  'toggle-pause' | 'stop' | 'bpm-up' | 'bpm-down' | 'fullscreen' | 'naming';

export interface ShortcutHelp {
  keys: string[];
  label: string;
}

/** Legenda mostrada na tela (desktop). */
export const SHORTCUT_HELP: ShortcutHelp[] = [
  { keys: ['Espaço'], label: 'pausar/continuar' },
  { keys: ['Esc'], label: 'parar' },
  { keys: ['↑', '↓'], label: '±5 bpm' },
  { keys: ['F'], label: 'tela cheia' },
  { keys: ['N'], label: 'cifra/português' },
];

type KeyInput = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'target'>;

const TEXT_INPUT_TYPES = new Set([
  'text',
  'number',
  'search',
  'email',
  'tel',
  'url',
  'password',
  'range',
]);

/** Campo onde as teclas servem para digitar ou ajustar: os atalhos não valem ali. */
function isEditing(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  return target instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(target.type);
}

/** Elemento que o próprio Espaço já aciona (botão, link, caixa de seleção). */
function isActivatedBySpace(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLButtonElement || target instanceof HTMLAnchorElement) return true;
  return (
    target instanceof HTMLInputElement && ['checkbox', 'radio', 'button'].includes(target.type)
  );
}

/** Ação de um atalho, ou `null` se a tecla não é um atalho nesse contexto. */
export function shortcutFor(event: KeyInput): ShortcutAction | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  if (isEditing(event.target)) return null;

  switch (event.key) {
    case ' ':
    case 'Spacebar':
      return isActivatedBySpace(event.target) ? null : 'toggle-pause';
    case 'Escape':
    case 'Esc':
      return 'stop';
    case 'ArrowUp':
      return 'bpm-up';
    case 'ArrowDown':
      return 'bpm-down';
    case 'f':
    case 'F':
      return 'fullscreen';
    case 'n':
    case 'N':
      return 'naming';
    default:
      return null;
  }
}
