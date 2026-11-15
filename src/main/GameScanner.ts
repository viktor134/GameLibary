import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { Game } from '../shared/types';
import type { ArtworkStore } from './ArtworkStore';
import { GAMES_DIR, isGameFile } from './config';
import type { LibraryStore } from './LibraryStore';

/** Stable id for a game file, derived from its path. */
export function gameId(file: string): string {
  return crypto.createHash('md5').update(file.toLowerCase()).digest('hex').slice(0, 12);
}

/** "Dawnwalker - Shortcut.lnk" -> "Dawnwalker" */
export function displayName(file: string): string {
  return path
    .basename(file, path.extname(file))
    .replace(/\s*-\s*(shortcut|ярлык)$/i, '')
    .replace(/[_.]+/g, ' ')
    .trim();
}

/** Finds game files and combines them with saved metadata and artwork. */
export class GameScanner {
  constructor(
    private readonly library: LibraryStore,
    private readonly artwork: ArtworkStore,
  ) {}

  scan(): Game[] {
    return this.findGameFiles().flatMap((file) => {
      const id = gameId(file);
      const meta = this.library.meta(id);
      if (meta.hidden) return [];
      return [{
        id,
        path: file,
        name: meta.name || displayName(file),
        lastPlayed: meta.lastPlayed ?? 0,
        plays: meta.plays ?? 0,
        art: this.artwork.urlsFor(id),
      }];
    });
  }

  find(id: string): Game | undefined {
    return this.scan().find((game) => game.id === id);
  }

  private findGameFiles(): string[] {
    const files: string[] = [];
    try {
      for (const entry of fs.readdirSync(GAMES_DIR, { withFileTypes: true })) {
        if (entry.isFile() && isGameFile(entry.name)) files.push(path.join(GAMES_DIR, entry.name));
      }
    } catch {
      // Games folder missing: fall through to the extra paths.
    }
    for (const file of this.library.extraPaths) {
      if (fs.existsSync(file)) files.push(file);
    }
    return files;
  }
}
