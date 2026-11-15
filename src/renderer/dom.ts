/** Small DOM helpers used across the UI. */

/** Looks up an element that must exist in index.html. */
export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}

interface ElementOptions {
  className?: string;
  text?: string;
  children?: (Node | string)[];
}

/** Creates an element with an optional class, text and children. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  { className, text, children }: ElementOptions = {},
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  if (children) element.append(...children);
  return element;
}

/** Restarts a CSS animation by removing and re-adding its class. */
export function restartAnimation(element: HTMLElement, className: string): void {
  element.classList.add(className);
  void element.offsetWidth; // force a reflow so the browser notices the change
  element.classList.remove(className);
}
