import { byId } from './dom.js';

const TOAST_DURATION_MS = 2200;

/** A short message at the bottom of the screen. */
export class Toast {
  private readonly element = byId('toast');
  private timer?: number;

  show(message: string): void {
    this.element.textContent = message;
    this.element.hidden = false;
    clearTimeout(this.timer);
    this.timer = window.setTimeout(() => (this.element.hidden = true), TOAST_DURATION_MS);
  }
}
