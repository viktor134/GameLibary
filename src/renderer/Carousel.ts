import type { Game } from '../shared/types';
import { h } from './dom.js';

/** How far from the left edge the focused card sits, as a share of the grid width. */
const FOCUS_OFFSET = 0.08;
const WHEEL_SPEED = 1.5;

export interface CarouselEvents {
  onFocus(game: Game): void;
  onActivate(game: Game): void;
  onContextMenu(game: Game): void;
}

/** The horizontal row of game cards and which one is focused. */
export class Carousel {
  private games: Game[] = [];
  private cards = new Map<string, HTMLElement>();
  private focusIndex = 0;
  private focusedCard: HTMLElement | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly events: CarouselEvents,
  ) {
    this.bindEvents();
  }

  get focused(): Game | undefined {
    return this.games[this.focusIndex];
  }

  get index(): number {
    return this.focusIndex;
  }

  get count(): number {
    return this.games.length;
  }

  /** Replaces the cards. Keeps focus on `keepId` if it is still shown. */
  render(games: Game[], keepId?: string): void {
    this.games = games;
    this.cards = new Map(games.map((game) => [game.id, this.createCard(game)]));
    this.focusedCard = null;
    this.root.replaceChildren(...this.cards.values());

    const index = games.findIndex((game) => game.id === keepId);
    this.focus(Math.max(index, 0), true);
  }

  focus(index: number, instant = false): void {
    if (!this.games.length) return;
    this.focusIndex = Math.max(0, Math.min(this.games.length - 1, index));
    const game = this.games[this.focusIndex];
    const card = this.cards.get(game.id)!;

    this.focusedCard?.classList.remove('focus');
    card.classList.add('focus');
    this.focusedCard = card;

    this.root.scrollTo({
      left: card.offsetLeft - this.root.clientWidth * FOCUS_OFFSET,
      behavior: instant ? 'instant' : 'smooth',
    });
    this.events.onFocus(game);
  }

  move(by: number): void {
    this.focus(this.focusIndex + by);
  }

  /** Redraws one card's artwork after it changed. */
  update(game: Game): void {
    const card = this.cards.get(game.id);
    if (card) this.fillArt(card, game);
  }

  markLaunching(game: Game): void {
    this.cards.get(game.id)?.classList.add('launching');
  }

  private createCard(game: Game): HTMLElement {
    const cover = h('img', { className: 'cover' });
    cover.decoding = 'async';
    cover.alt = '';
    cover.onload = () => cover.classList.add('loaded');

    const icon = h('img');
    icon.alt = '';

    const card = h('div', {
      className: 'card',
      children: [
        cover,
        h('div', { className: 'fallback', children: [icon, h('span', { text: game.name })] }),
        h('div', { className: 'label', text: game.name }),
      ],
    });
    card.dataset.id = game.id;
    this.fillArt(card, game);
    return card;
  }

  private fillArt(card: HTMLElement, game: Game): void {
    const { cover, icon } = game.art;

    const coverImage = card.querySelector<HTMLImageElement>('img.cover')!;
    if (cover && coverImage.src !== cover) coverImage.src = cover;
    card.classList.toggle('has-cover', Boolean(cover));

    const iconImage = card.querySelector<HTMLImageElement>('.fallback img')!;
    iconImage.hidden = !icon;
    if (icon) iconImage.src = icon;
  }

  /** Finds the game for the card an event happened on. */
  private gameFromEvent(event: Event): Game | undefined {
    const card = (event.target as HTMLElement).closest<HTMLElement>('.card');
    return card ? this.games.find((game) => game.id === card.dataset.id) : undefined;
  }

  private focusGame(game: Game): void {
    this.focus(this.games.indexOf(game));
  }

  /** One listener per event on the grid instead of one per card. */
  private bindEvents(): void {
    this.root.addEventListener('click', (event) => {
      const game = this.gameFromEvent(event);
      if (game) this.focusGame(game);
    });

    this.root.addEventListener('dblclick', (event) => {
      const game = this.gameFromEvent(event);
      if (game) this.events.onActivate(game);
    });

    this.root.addEventListener('contextmenu', (event) => {
      const game = this.gameFromEvent(event);
      if (!game) return;
      event.preventDefault();
      this.focusGame(game);
      this.events.onContextMenu(game);
    });

    // Turn vertical mouse-wheel scrolling into horizontal scrolling.
    this.root.addEventListener('wheel', (event) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      this.root.scrollLeft += event.deltaY * WHEEL_SPEED;
    }, { passive: false });
  }
}
