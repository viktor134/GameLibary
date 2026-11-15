import { shell } from 'electron';
import { spawn } from 'child_process';
import path from 'path';
import type { Game } from '../shared/types';
import type { LibraryStore } from './LibraryStore';

/** Starts games and records play statistics. */
export class GameLauncher {
  constructor(private readonly library: LibraryStore) {}

  launch(game: Game): void {
    if (path.extname(game.path).toLowerCase() === '.exe') {
      spawn(game.path, [], { cwd: path.dirname(game.path), detached: true, stdio: 'ignore' }).unref();
    } else {
      // .lnk / .url keep their own working directory and arguments.
      void shell.openPath(game.path);
    }
    this.recordPlay(game.id);
  }

  private recordPlay(id: string): void {
    const meta = this.library.meta(id);
    meta.lastPlayed = Date.now();
    meta.plays = (meta.plays ?? 0) + 1;
    this.library.save();
  }
}
