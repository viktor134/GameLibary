import { app, nativeImage, shell } from 'electron';
import path from 'path';
import type { Artwork, Game, GameUpdate } from '../shared/types';
import type { ArtworkStore } from './ArtworkStore';
import type { LibraryStore } from './LibraryStore';
import type { SteamClient } from './SteamClient';

/** For a .lnk shortcut, the file it points to; otherwise the path itself. */
function resolveShortcut(file: string): string {
  if (path.extname(file).toLowerCase() !== '.lnk') return file;
  try {
    return shell.readShortcutLink(file).target || file;
  } catch {
    return file;
  }
}

/** Finds, downloads and replaces artwork for games. */
export class ArtworkService {
  /** Games currently being processed, so repeated scans don't download twice. */
  private readonly inProgress = new Set<string>();

  constructor(
    private readonly store: ArtworkStore,
    private readonly steam: SteamClient,
    private readonly library: LibraryStore,
    private readonly notify: (update: GameUpdate) => void,
  ) {}

  /** Fills in missing artwork for each game in the background, one at a time. */
  async fillMissing(games: readonly Game[]): Promise<void> {
    for (const game of games) {
      if (this.inProgress.has(game.id)) continue;
      this.inProgress.add(game.id);
      try {
        await this.fillOne(game);
      } finally {
        this.inProgress.delete(game.id);
      }
    }
  }

  /** Replaces a game's artwork with the art of a chosen Steam app. */
  async useSteamApp(id: string, appid: number): Promise<Artwork> {
    this.store.remove(id, 'cover', 'hero', 'logo');
    this.library.meta(id).appid = appid;
    this.library.save();
    await this.steam.downloadArt(id, appid);
    return this.store.urlsFor(id);
  }

  /** Uses an image file from disk as the game's cover. */
  useCustomCover(id: string, imageFile: string): Artwork {
    this.store.write(id, 'cover', nativeImage.createFromPath(imageFile).toPNG());
    return this.store.urlsFor(id);
  }

  private async fillOne(game: Game): Promise<void> {
    const iconAdded = await this.saveIcon(game);
    const meta = this.library.meta(game.id);
    const needsSteamLookup = meta.appid === undefined; // null = searched before, found nothing

    if (needsSteamLookup) {
      meta.appid = await this.steam.findAppId(game.name);
      if (meta.appid) await this.steam.downloadArt(game.id, meta.appid);
      this.library.save();
    }

    if (iconAdded || needsSteamLookup) {
      this.notify({ id: game.id, art: this.store.urlsFor(game.id) });
    }
  }

  /** Extracts the executable's icon as a fallback picture. Returns true if a new icon was saved. */
  private async saveIcon(game: Game): Promise<boolean> {
    if (this.store.has(game.id, 'icon')) return false;
    try {
      const icon = await app.getFileIcon(resolveShortcut(game.path), { size: 'large' });
      if (icon.isEmpty()) return false;
      this.store.write(game.id, 'icon', icon.toPNG());
      return true;
    } catch {
      return false;
    }
  }
}
