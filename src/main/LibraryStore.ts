import fs from 'fs';
import path from 'path';

/** What we remember about a single game between sessions. */
export interface GameMeta {
  name?: string;
  hidden?: boolean;
  lastPlayed?: number;
  plays?: number;
  /** Steam app id; `null` means we searched and found nothing. */
  appid?: number | null;
}

interface LibraryData {
  games: Record<string, GameMeta>;
  /** Games added from outside the games folder. */
  extraPaths: string[];
}

/** Loads and saves library.json in the user data folder. */
export class LibraryStore {
  private data: LibraryData = { games: {}, extraPaths: [] };

  constructor(private readonly file: string) {
    this.load();
  }

  get extraPaths(): readonly string[] {
    return this.data.extraPaths;
  }

  /** Returns the metadata for a game, creating an empty record if needed. */
  meta(id: string): GameMeta {
    return (this.data.games[id] ??= {});
  }

  has(id: string): boolean {
    return id in this.data.games;
  }

  addExtraPath(file: string): void {
    if (!this.data.extraPaths.includes(file)) this.data.extraPaths.push(file);
  }

  removeExtraPath(file: string): void {
    this.data.extraPaths = this.data.extraPaths.filter((p) => p !== file);
  }

  save(): void {
    // Write to a temp file first so a crash mid-write can't corrupt the library.
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
  }

  private load(): void {
    try {
      const saved = JSON.parse(fs.readFileSync(this.file, 'utf8')) as Partial<LibraryData>;
      this.data = { games: saved.games ?? {}, extraPaths: saved.extraPaths ?? [] };
    } catch {
      // First run or unreadable file: start with an empty library.
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
    }
  }
}
