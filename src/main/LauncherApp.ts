import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'path';
import type { IpcChannel, IpcContract } from '../shared/types';
import { ArtworkService } from './ArtworkService';
import { ArtworkStore } from './ArtworkStore';
import { GAMES_DIR, isGameFile, MINIMIZE_AFTER_LAUNCH_MS, PRELOAD_FILE, UI_FILE } from './config';
import { GameLauncher } from './GameLauncher';
import { gameId, GameScanner } from './GameScanner';
import { LibraryStore } from './LibraryStore';
import { SteamClient } from './SteamClient';

type Handler<C extends IpcChannel> = (...args: IpcContract[C]['args']) => IpcContract[C]['result'] | Promise<IpcContract[C]['result']>;

/** Wires the services together, owns the window and answers the renderer's requests. */
export class LauncherApp {
  private window: BrowserWindow | null = null;

  private readonly library: LibraryStore;
  private readonly scanner: GameScanner;
  private readonly artwork: ArtworkService;
  private readonly steam: SteamClient;
  private readonly launcher: GameLauncher;

  constructor() {
    const dataDir = app.getPath('userData');
    const artStore = new ArtworkStore(path.join(dataDir, 'art'));

    this.library = new LibraryStore(path.join(dataDir, 'library.json'));
    this.steam = new SteamClient(artStore);
    this.scanner = new GameScanner(this.library, artStore);
    this.launcher = new GameLauncher(this.library);
    this.artwork = new ArtworkService(artStore, this.steam, this.library, (update) =>
      this.window?.webContents.send('game-updated', update),
    );
  }

  start(): void {
    this.registerIpc();
    this.createWindow();
  }

  private createWindow(): void {
    const win = new BrowserWindow({
      width: 1600,
      height: 900,
      fullscreen: true,
      backgroundColor: '#0b0e14',
      autoHideMenuBar: true,
      show: false,
      webPreferences: { preload: PRELOAD_FILE, backgroundThrottling: true },
    });
    win.once('ready-to-show', () => win.show());
    win.on('closed', () => (this.window = null));
    void win.loadFile(UI_FILE);
    this.window = win;
  }

  private handle<C extends IpcChannel>(channel: C, handler: Handler<C>): void {
    ipcMain.handle(channel, (_event, ...args) => handler(...(args as IpcContract[C]['args'])));
  }

  private registerIpc(): void {
    this.handle('games', () => {
      const games = this.scanner.scan();
      this.library.save();
      setImmediate(() => void this.artwork.fillMissing(games));
      return games;
    });

    this.handle('launch', (id) => {
      const game = this.scanner.find(id);
      if (!game) return false;
      this.launcher.launch(game);
      setTimeout(() => this.window?.minimize(), MINIMIZE_AFTER_LAUNCH_MS);
      return true;
    });

    this.handle('search-art', (term) => this.steam.search(term));
    this.handle('set-art', (id, appid) => this.artwork.useSteamApp(id, appid));

    this.handle('custom-cover', async (id) => {
      const file = await this.pickFile([{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]);
      return file ? this.artwork.useCustomCover(id, file[0]) : null;
    });

    this.handle('rename', (id, name) => {
      this.library.meta(id).name = name;
      this.library.save();
    });

    this.handle('add-games', async (paths) => {
      const files = paths ?? (await this.pickFile([{ name: 'Games', extensions: ['exe', 'lnk', 'url'] }], true));
      if (files) this.addGames(files);
    });

    this.handle('remove', (id) => {
      const game = this.scanner.find(id);
      if (game) this.library.removeExtraPath(game.path);
      this.library.meta(id).hidden = true;
      this.library.save();
    });

    this.handle('open-folder', async () => {
      await shell.openPath(GAMES_DIR);
    });
    this.handle('fullscreen', () => {
      this.window?.setFullScreen(!this.window.isFullScreen());
    });
    this.handle('quit', () => app.quit());
  }

  private addGames(files: readonly string[]): void {
    for (const file of files) {
      if (!isGameFile(file)) continue;
      const id = gameId(file);
      if (this.library.has(id)) delete this.library.meta(id).hidden;
      if (path.dirname(file) !== GAMES_DIR) this.library.addExtraPath(file);
    }
    this.library.save();
  }

  /** Shows an open-file dialog. Returns the chosen paths, or null if cancelled. */
  private async pickFile(filters: Electron.FileFilter[], multiple = false): Promise<string[] | null> {
    if (!this.window) return null;
    const properties: ('openFile' | 'multiSelections')[] = multiple ? ['openFile', 'multiSelections'] : ['openFile'];
    const result = await dialog.showOpenDialog(this.window, { properties, filters });
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths;
  }
}
