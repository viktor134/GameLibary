import type { Game } from '../shared/types';
import type { Background } from './Background.js';
import { byId, h, restartAnimation } from './dom.js';
import { timeAgo } from './format.js';

/** Waits this long before swapping the background, so fast scrolling stays smooth. */
const BACKGROUND_DELAY_MS = 120;

/** The large title, logo, stats and background for the focused game. */
export class Hero {
  private readonly root = byId('hero');
  private readonly logo = byId<HTMLImageElement>('hero-logo');
  private readonly title = byId('hero-title');
  private readonly meta = byId('hero-meta');
  private backgroundTimer?: number;

  constructor(private readonly background: Background) {
    this.logo.onerror = () => this.showTitleInsteadOfLogo();
  }

  set visible(visible: boolean) {
    this.root.hidden = !visible;
  }

  /**
   * Shows a game. Use `refresh` when only its data changed (new artwork),
   * which skips the swap animation and updates the background immediately.
   */
  show(game: Game, refresh = false): void {
    if (!refresh) restartAnimation(this.root, 'swap');

    this.title.textContent = game.name;
    if (game.art.logo) {
      this.logo.src = game.art.logo;
      this.logo.hidden = false;
      this.title.hidden = true;
    } else {
      this.showTitleInsteadOfLogo();
    }

    this.meta.replaceChildren(...this.statsFor(game));

    clearTimeout(this.backgroundTimer);
    const { hero, cover, icon } = game.art;
    this.backgroundTimer = window.setTimeout(
      () => this.background.show(hero || cover || icon || '', !hero),
      refresh ? 0 : BACKGROUND_DELAY_MS,
    );
  }

  private showTitleInsteadOfLogo(): void {
    this.logo.hidden = true;
    this.title.hidden = false;
  }

  private statsFor(game: Game): HTMLElement[] {
    if (!game.lastPlayed) return [h('span', { text: 'Not played yet' })];
    return [
      h('span', { children: ['Last played ', h('b', { text: timeAgo(game.lastPlayed) })] }),
      h('span', { children: [h('b', { text: String(game.plays) }), ' launches'] }),
    ];
  }
}
