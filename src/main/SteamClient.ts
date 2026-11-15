import type { SteamSearchResult } from '../shared/types';
import type { ArtworkStore } from './ArtworkStore';

const STORE_API = 'https://store.steampowered.com/api';

const CDN_BASES = [
  (appid: number) => `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appid}/`,
  (appid: number) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/`,
];

/** Candidate file names on the Steam CDN, best first. */
const CDN_FILES = {
  cover: ['library_600x900_2x.jpg', 'library_600x900.jpg'],
  hero: ['library_hero.jpg'],
  logo: ['logo.png'],
} as const;

type SteamArtKind = keyof typeof CDN_FILES;

/** How much of the local name a store title must cover to count as a match. */
const MIN_MATCH_SCORE = 0.5;

interface StoreSearchResponse {
  items?: { id: number; name: string; tiny_image: string }[];
}

interface AppDetailsResponse {
  [appid: string]: { data?: { header_image?: string; background_raw?: string } } | undefined;
}

function words(text: string): Set<string> {
  return new Set(text.toLowerCase().replace(/[^a-z0-9а-я ]+/gi, ' ').split(/\s+/).filter(Boolean));
}

/** How much of the local name the store title covers, lightly preferring shorter titles. */
function matchScore(localName: string, storeName: string): number {
  const local = words(localName);
  const store = words(storeName);
  let hits = 0;
  for (const word of local) if (store.has(word)) hits++;
  return hits / Math.max(local.size, 1) - store.size * 0.01;
}

/** Talks to the Steam store to find games and their artwork. */
export class SteamClient {
  constructor(private readonly artwork: ArtworkStore) {}

  async search(term: string): Promise<SteamSearchResult[]> {
    try {
      const url = `${STORE_API}/storesearch/?term=${encodeURIComponent(term)}&l=english&cc=US`;
      const json = (await (await fetch(url)).json()) as StoreSearchResponse;
      return (json.items ?? []).map((item) => ({ appid: item.id, name: item.name, thumb: item.tiny_image }));
    } catch {
      return [];
    }
  }

  /**
   * Finds the Steam app id for a local game name.
   * Long names like "Call of Duty Modern Warfare 4" may find nothing, so retry with fewer words.
   */
  async findAppId(name: string): Promise<number | null> {
    const nameWords = name.split(/\s+/);
    const minWords = Math.min(2, nameWords.length);

    for (let count = nameWords.length; count >= minWords; count--) {
      const results = await this.search(nameWords.slice(0, count).join(' '));
      let best: { appid: number; score: number } | null = null;
      for (const result of results) {
        const score = matchScore(name, result.name);
        if (!best || score > best.score) best = { appid: result.appid, score };
      }
      if (best && best.score >= MIN_MATCH_SCORE) return best.appid;
    }
    return null;
  }

  /** Downloads cover, hero and logo for a game. Returns true if a cover or hero was found. */
  async downloadArt(id: string, appid: number): Promise<boolean> {
    const kinds = Object.keys(CDN_FILES) as SteamArtKind[];
    const found = await Promise.all(kinds.map((kind) => this.downloadFromCdn(id, appid, kind)));
    const got = Object.fromEntries(kinds.map((kind, i) => [kind, found[i]])) as Record<SteamArtKind, boolean>;

    // Newer titles keep assets under hashed paths; appdetails gives the exact URLs.
    if (!got.cover || !got.hero) {
      const details = await this.appDetails(appid);
      if (details) {
        if (!got.hero) got.hero = await this.artwork.download(details.background_raw || details.header_image, id, 'hero');
        if (!got.cover) got.cover = await this.artwork.download(details.header_image, id, 'cover');
      }
    }

    if (!got.logo) this.artwork.remove(id, 'logo');
    return got.cover || got.hero;
  }

  private async downloadFromCdn(id: string, appid: number, kind: SteamArtKind): Promise<boolean> {
    for (const base of CDN_BASES) {
      for (const file of CDN_FILES[kind]) {
        if (await this.artwork.download(base(appid) + file, id, kind)) return true;
      }
    }
    return false;
  }

  private async appDetails(appid: number) {
    try {
      const json = (await (await fetch(`${STORE_API}/appdetails?appids=${appid}`)).json()) as AppDetailsResponse;
      return json[appid]?.data ?? null;
    } catch {
      return null;
    }
  }
}
