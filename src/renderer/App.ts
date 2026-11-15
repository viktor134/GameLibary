import type { Game, GameUpdate } from '../shared/types';
import { Background } from './Background.js';
import { Carousel } from './Carousel.js';
import { byId } from './dom.js';
import { clockTime } from './format.js';
import { GameMenus } from './GameMenus.js';
import { Hero } from './Hero.js';
import type { Commands, Direction } from './input/Commands.js';
import { GamepadInput } from './input/Gamepad.js';
import { Keyboard } from './input/Keyboard.js';
import { Modal } from './Modal.js';
import { Toast } from './Toast.js';

/** Wait for the game window to appear before refreshing the library. */
const RELOAD_AFTER_LAUNCH_MS = 1800;
const CLOCK_INTERVAL_MS = 10_000;

/** Most recently played first, then alphabetical. */
function byRecentThenName(a: Game, b: Game): number {
  return b.lastPlayed - a.lastPlayed || a.name.localeCompare(b.name);
}

function sameGames(a: readonly Game[], b: readonly Game[]): boolean {
  const ids = (games: readonly Game[]) => games.map((game) => game.id).sort().join();
  return ids(a) === ids(b);
}

/** The launcher UI: holds the game list and turns commands into actions. */
export class App implements Commands {
  private games: Game[] = [];
  private search = '';

  private readonly toast = new Toast();
  private readonly modal = new Modal();
  private readonly background = new Background(byId('bg'));
  private readonly hero = new Hero(this.background);
  private readonly carousel = new Carousel(byId('grid'), {
    onFocus: (game) => this.hero.show(game),
    onActivate: () => this.play(),
    onContextMenu: (game) => this.menus.openOptions(game),
  });
  private readonly menus = new GameMenus(this.modal, {
    play: () => this.play(),
    refresh: (game) => this.refresh(game),
    reload: (keepId) => this.load(keepId),
    toast: (message) => this.toast.show(message),
  });

  start(): void {
    new Keyboard(this);
    new GamepadInput(this);
    window.api.onGameUpdated((update) => this.onGameUpdated(update));
    this.bindButtons();
    this.bindDragAndDrop();
    this.watchFolderChanges();
    this.startClock();
    void this.load();
  }

  // ---------- library ----------

  async load(keepId?: string): Promise<void> {
    this.games = (await window.api.games()).sort(byRecentThenName);
    this.render(keepId);
  }

  private render(keepId = this.carousel.focused?.id): void {
    const hasGames = this.games.length > 0;
    byId('empty').hidden = hasGames;
    this.hero.visible = hasGames;
    if (!hasGames) this.background.show('');

    const query = this.search;
    const matches = query ? this.games.filter((game) => game.name.toLowerCase().includes(query)) : this.games;
    this.carousel.render(matches, keepId);
  }

  private refresh(game: Game): void {
    this.carousel.update(game);
    if (this.carousel.focused?.id === game.id) this.hero.show(game, true);
  }

  private onGameUpdated({ id, art }: GameUpdate): void {
    const game = this.games.find((g) => g.id === id);
    if (!game) return;
    game.art = art;
    this.refresh(game);
  }

  private async play(): Promise<void> {
    const game = this.carousel.focused;
    if (!game) return;
    this.carousel.markLaunching(game);
    this.toast.show(`Launching ${game.name}…`);
    await window.api.launch(game.id);

    setTimeout(() => {
      this.setSearch('');
      void this.load(game.id);
    }, RELOAD_AFTER_LAUNCH_MS);
  }

  // ---------- search ----------

  private setSearch(value: string): void {
    this.search = value;
    const pill = byId('search-pill');
    pill.hidden = !value;
    pill.textContent = `🔍 ${value}`;
  }

  private applySearch(value: string): void {
    this.setSearch(value);
    this.render();
  }

  // ---------- Commands (keyboard / gamepad) ----------

  get isMenuOpen(): boolean {
    return this.modal.isOpen;
  }

  get isSearching(): boolean {
    return this.search.length > 0;
  }

  navigate(direction: Direction): void {
    if (this.modal.isOpen) {
      if (direction === 'up') this.modal.move(-1);
      if (direction === 'down') this.modal.move(1);
      return;
    }
    if (direction === 'left') this.carousel.move(-1);
    if (direction === 'right') this.carousel.move(1);
  }

  jump(by: number): void {
    if (!this.modal.isOpen) this.carousel.move(by);
  }

  first(): void {
    this.carousel.focus(0);
  }

  last(): void {
    this.carousel.focus(this.carousel.count - 1);
  }

  accept(): void {
    if (this.modal.isOpen) this.modal.activate();
    else void this.play();
  }

  back(): void {
    if (this.modal.isOpen) this.modal.back();
    else if (this.search) this.applySearch('');
  }

  toggleOptions(): void {
    if (this.modal.isOpen) return this.modal.back();
    const game = this.carousel.focused;
    if (game) this.menus.openOptions(game);
  }

  toggleFullscreen(): void {
    void window.api.fullscreen();
  }

  typeSearch(char: string): void {
    this.applySearch(this.search + char.toLowerCase());
  }

  eraseSearch(): void {
    this.applySearch(this.search.slice(0, -1));
  }

  // ---------- page wiring ----------

  private bindButtons(): void {
    const actions: Record<string, () => void> = {
      add: async () => {
        await window.api.addGames();
        await this.load();
      },
      folder: () => void window.api.openFolder(),
      fullscreen: () => this.toggleFullscreen(),
      quit: () => void window.api.quit(),
    };
    document.querySelectorAll<HTMLElement>('[data-act]').forEach((button) => {
      const action = actions[button.dataset.act ?? ''];
      if (action) button.onclick = action;
    });
    byId('play').onclick = () => void this.play();
    byId('options').onclick = () => this.toggleOptions();
  }

  private bindDragAndDrop(): void {
    const body = document.body;
    window.addEventListener('dragover', (event) => {
      event.preventDefault();
      body.classList.add('dragging');
    });
    window.addEventListener('dragleave', () => body.classList.remove('dragging'));
    window.addEventListener('drop', async (event) => {
      event.preventDefault();
      body.classList.remove('dragging');
      const paths = [...(event.dataTransfer?.files ?? [])].map((file) => window.api.pathForFile(file));
      if (!paths.length) return;
      await window.api.addGames(paths);
      this.toast.show(`Added ${paths.length} item(s)`);
      await this.load();
    });
  }

  /** Pick up shortcuts added to the folder while the launcher was in the background. */
  private watchFolderChanges(): void {
    window.addEventListener('focus', async () => {
      const fresh = await window.api.games();
      if (!sameGames(fresh, this.games)) await this.load(this.carousel.focused?.id);
    });
  }

  private startClock(): void {
    const clock = byId('clock');
    const tick = () => (clock.textContent = clockTime());
    tick();
    setInterval(tick, CLOCK_INTERVAL_MS);
  }
}
