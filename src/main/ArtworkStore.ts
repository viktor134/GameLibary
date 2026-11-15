import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import type { ArtKind, Artwork } from '../shared/types';

const ART_KINDS: readonly ArtKind[] = ['cover', 'hero', 'logo', 'icon'];

/** Images smaller than this are placeholder/error pages, not real art. */
const MIN_IMAGE_BYTES = 2000;

/** Stores artwork images on disk as `<id>_<kind>.png`. */
export class ArtworkStore {
  constructor(private readonly dir: string) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fileFor(id: string, kind: ArtKind): string {
    return path.join(this.dir, `${id}_${kind}.png`);
  }

  has(id: string, kind: ArtKind): boolean {
    return fs.existsSync(this.fileFor(id, kind));
  }

  /** file:// URLs for the artwork a game has, with a version tag to bust the image cache. */
  urlsFor(id: string): Artwork {
    const art: Artwork = {};
    for (const kind of ART_KINDS) {
      const file = this.fileFor(id, kind);
      const stats = fs.statSync(file, { throwIfNoEntry: false });
      if (stats) art[kind] = `${pathToFileURL(file).href}?v=${stats.mtimeMs}`;
    }
    return art;
  }

  write(id: string, kind: ArtKind, data: Buffer): void {
    fs.writeFileSync(this.fileFor(id, kind), data);
  }

  remove(id: string, ...kinds: ArtKind[]): void {
    for (const kind of kinds) fs.rmSync(this.fileFor(id, kind), { force: true });
  }

  /** Downloads an image into the store. Returns false if it failed or looked bogus. */
  async download(url: string | undefined, id: string, kind: ArtKind): Promise<boolean> {
    if (!url) return false;
    try {
      const response = await fetch(url);
      if (!response.ok) return false;
      const data = Buffer.from(await response.arrayBuffer());
      if (data.length < MIN_IMAGE_BYTES) return false;
      this.write(id, kind, data);
      return true;
    } catch {
      return false;
    }
  }
}
