import type { Game, SteamSearchResult } from '../shared/types';
import { h } from './dom.js';
import type { Modal } from './Modal.js';

const SEARCH_DEBOUNCE_MS = 350;

/** What the menus need from the rest of the app. */
export interface MenuActions {
  play(game: Game): void;
  /** Redraw a game whose artwork changed. */
  refresh(game: Game): void;
  /** Reload the whole library, keeping focus on `keepId`. */
  reload(keepId?: string): Promise<void>;
  toast(message: string): void;
}

function menuButton(text: string, onClick: () => void): HTMLButtonElement {
  const button = h('button', { text });
  button.onclick = onClick;
  return button;
}

function hint(text: string): HTMLElement {
  return h('div', { className: 'hint', text });
}

function textInput(value: string, placeholder = ''): HTMLInputElement {
  const input = h('input');
  input.value = value;
  input.placeholder = placeholder;
  return input;
}

/** The options menu for a game, plus its rename and artwork sub-dialogs. */
export class GameMenus {
  constructor(
    private readonly modal: Modal,
    private readonly actions: MenuActions,
  ) {}

  openOptions(game: Game): void {
    const items = [
      menuButton('▶  Play', () => {
        this.modal.close();
        this.actions.play(game);
      }),
      menuButton('🖼  Change artwork (Steam)', () => this.openArtSearch(game)),
      menuButton('📁  Use custom cover image…', () => this.chooseCustomCover(game)),
      menuButton('✎  Rename', () => this.openRename(game)),
      menuButton('🗑  Remove from library', () => this.removeGame(game)),
    ];
    this.modal.open(game.name, h('div', { className: 'menu', children: items }), items);
  }

  private async chooseCustomCover(game: Game): Promise<void> {
    const art = await window.api.customCover(game.id);
    if (art) {
      game.art = art;
      this.actions.refresh(game);
    }
    this.modal.close();
  }

  private async removeGame(game: Game): Promise<void> {
    await window.api.remove(game.id);
    this.modal.close();
    this.actions.toast(`${game.name} removed`);
    await this.actions.reload();
  }

  private openRename(game: Game): void {
    const input = textInput(game.name);
    const body = h('div', { children: [input, hint('Enter to save · Esc to cancel')] });
    this.modal.open('Rename', body, [], () => this.openOptions(game));
    input.focus();
    input.select();

    input.onkeydown = async (event) => {
      const name = input.value.trim();
      if (event.key !== 'Enter' || !name) return;
      await window.api.rename(game.id, name);
      this.modal.close();
      await this.actions.reload(game.id);
    };
  }

  private openArtSearch(game: Game): void {
    const input = textInput(game.name, 'Search Steam…');
    const list = h('div', { className: 'menu' });
    this.modal.open('Choose artwork', h('div', { children: [input, list] }), [], () => this.openOptions(game));
    input.focus();
    input.select();

    let timer: number | undefined;
    let latestSearch = 0;

    const search = async () => {
      const searchId = ++latestSearch;
      list.replaceChildren(hint('Searching…'));
      const results = await window.api.searchArt(input.value);
      if (searchId !== latestSearch || !this.modal.isOpen) return; // a newer search replaced this one

      if (!results.length) {
        list.replaceChildren(hint('No results. Try a shorter name.'));
        this.modal.setItems([]);
        return;
      }
      const items = results.map((result) => this.artResultButton(game, result, list));
      list.replaceChildren(...items);
      this.modal.setItems(items);
    };

    input.oninput = () => {
      clearTimeout(timer);
      timer = window.setTimeout(search, SEARCH_DEBOUNCE_MS);
    };
    input.onkeydown = (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      this.modal.activate();
    };
    void search();
  }

  private artResultButton(game: Game, result: SteamSearchResult, list: HTMLElement): HTMLButtonElement {
    const thumb = h('img');
    thumb.alt = '';
    thumb.src = result.thumb;

    const button = h('button', { className: 'result', children: [thumb, h('span', { text: result.name })] });
    button.onclick = async () => {
      list.replaceChildren(hint('Downloading artwork…'));
      game.art = await window.api.setArt(game.id, result.appid);
      this.actions.refresh(game);
      this.modal.close();
    };
    return button;
  }
}
