import type { Commands, Direction } from './Commands.js';

const ARROWS: Record<string, Direction> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};

/** Maps key presses to commands. Typing letters searches the library. */
export class Keyboard {
  constructor(private readonly commands: Commands) {
    window.addEventListener('keydown', (event) => this.onKeyDown(event));
  }

  private onKeyDown(event: KeyboardEvent): void {
    document.body.classList.remove('gamepad');
    const cmd = this.commands;
    const typing = (event.target as HTMLElement).tagName === 'INPUT';
    const direction = ARROWS[event.key];

    if (event.key === 'F11') return this.handled(event, () => cmd.toggleFullscreen());
    if (event.key === 'Escape') return this.handled(event, () => cmd.back());

    // While typing in a text box, left/right move the caret; up/down still pick results.
    if (direction && (!typing || direction === 'up' || direction === 'down')) {
      return this.handled(event, () => cmd.navigate(direction));
    }
    if (typing) return;

    if (event.key === 'Enter') return this.handled(event, () => cmd.accept());
    if (event.key === 'Tab') return this.handled(event, () => cmd.toggleOptions());
    if (cmd.isMenuOpen) return;

    if (event.key === 'Home') return cmd.first();
    if (event.key === 'End') return cmd.last();
    if (event.key === 'Backspace' && cmd.isSearching) return cmd.eraseSearch();

    const isPrintable = event.key.length === 1 && !event.ctrlKey && !event.altKey;
    const isLeadingSpace = event.key === ' ' && !cmd.isSearching;
    if (isPrintable && !isLeadingSpace) cmd.typeSearch(event.key);
  }

  private handled(event: KeyboardEvent, action: () => void): void {
    event.preventDefault();
    action();
  }
}
