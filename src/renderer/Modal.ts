import { byId } from './dom.js';

/** A dialog whose buttons can be picked with arrow keys or a gamepad. */
export class Modal {
  private readonly root = byId('modal');
  private readonly title = byId('modal-title');
  private readonly body = byId('modal-body');

  private items: HTMLElement[] = [];
  private selected = 0;
  private onBack: () => void = () => this.close();

  constructor() {
    // Clicking the dimmed area outside the panel closes the dialog.
    this.root.addEventListener('click', (event) => {
      if (event.target === this.root) this.close();
    });
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  /**
   * Opens the dialog. `items` are the selectable buttons inside `body`;
   * `onBack` runs on Esc / B (defaults to closing).
   */
  open(title: string, body: HTMLElement, items: HTMLElement[] = [], onBack?: () => void): void {
    this.title.textContent = title;
    this.body.replaceChildren(body);
    this.onBack = onBack ?? (() => this.close());
    this.root.hidden = false;
    this.setItems(items);
  }

  close(): void {
    this.root.hidden = true;
    this.items = [];
  }

  /** Swaps the selectable items, e.g. after search results arrive. */
  setItems(items: HTMLElement[]): void {
    this.items = items;
    this.selected = 0;
    this.highlight();
  }

  /** Moves the selection up (-1) or down (+1), wrapping around. */
  move(by: number): void {
    if (!this.items.length) return;
    this.selected = (this.selected + by + this.items.length) % this.items.length;
    this.highlight();
  }

  activate(): void {
    this.items[this.selected]?.click();
  }

  back(): void {
    this.onBack();
  }

  private highlight(): void {
    this.items.forEach((item, i) => item.classList.toggle('sel', i === this.selected));
    this.items[this.selected]?.scrollIntoView({ block: 'nearest' });
  }
}
