import path from 'path';

/** The launcher project folder (compiled code lives in launcher/dist/main). */
export const APP_ROOT = path.resolve(__dirname, '..', '..');

/** Games are read from the folder that contains the launcher (Desktop\games). */
export const GAMES_DIR = path.resolve(APP_ROOT, '..');

/** File types that count as a launchable game. */
export const GAME_EXTENSIONS: ReadonlySet<string> = new Set(['.lnk', '.exe', '.url']);

export const PRELOAD_FILE = path.join(APP_ROOT, 'dist', 'preload', 'preload.js');
export const UI_FILE = path.join(APP_ROOT, 'ui', 'index.html');

/** Delay before the launcher minimizes itself after starting a game. */
export const MINIMIZE_AFTER_LAUNCH_MS = 1200;

export function isGameFile(file: string): boolean {
  return GAME_EXTENSIONS.has(path.extname(file).toLowerCase());
}
