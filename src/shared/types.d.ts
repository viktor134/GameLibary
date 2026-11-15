/**
 * Types shared by the main process, the preload bridge and the renderer.
 * This is a declaration-only file, so it never produces runtime code.
 */

/** The image kinds the launcher keeps for every game. */
export type ArtKind = 'cover' | 'hero' | 'logo' | 'icon';

/** file:// URLs for each piece of artwork a game has (missing kinds are omitted). */
export type Artwork = Partial<Record<ArtKind, string>>;

/** A game as shown in the UI. */
export interface Game {
  id: string;
  path: string;
  name: string;
  lastPlayed: number;
  plays: number;
  art: Artwork;
}

/** A single hit from the Steam store search. */
export interface SteamSearchResult {
  appid: number;
  name: string;
  thumb: string;
}

/** Pushed to the renderer when artwork for a game finishes downloading. */
export interface GameUpdate {
  id: string;
  art: Artwork;
}

/**
 * Every IPC channel together with its argument list and return value.
 * Main and preload both type-check against this map, so they cannot drift apart.
 */
export interface IpcContract {
  'games': { args: []; result: Game[] };
  'launch': { args: [id: string]; result: boolean };
  'search-art': { args: [term: string]; result: SteamSearchResult[] };
  'set-art': { args: [id: string, appid: number]; result: Artwork };
  'custom-cover': { args: [id: string]; result: Artwork | null };
  'rename': { args: [id: string, name: string]; result: void };
  'add-games': { args: [paths?: string[]]; result: void };
  'remove': { args: [id: string]; result: void };
  'open-folder': { args: []; result: void };
  'fullscreen': { args: []; result: void };
  'quit': { args: []; result: void };
}

export type IpcChannel = keyof IpcContract;

/** The API that preload exposes on `window.api`. */
export interface LauncherApi {
  games(): Promise<Game[]>;
  launch(id: string): Promise<boolean>;
  searchArt(term: string): Promise<SteamSearchResult[]>;
  setArt(id: string, appid: number): Promise<Artwork>;
  customCover(id: string): Promise<Artwork | null>;
  rename(id: string, name: string): Promise<void>;
  addGames(paths?: string[]): Promise<void>;
  remove(id: string): Promise<void>;
  openFolder(): Promise<void>;
  fullscreen(): Promise<void>;
  quit(): Promise<void>;
  pathForFile(file: File): string;
  onGameUpdated(callback: (update: GameUpdate) => void): void;
}
