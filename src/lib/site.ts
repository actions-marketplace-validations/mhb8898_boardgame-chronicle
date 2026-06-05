import { loadChronicle, type Chronicle } from './load';
import { readConfig, type ChronicleConfig } from './config';
import { computeAwards } from '../badges/engine';
import type { Award } from '../badges/types';

/** Everything pages need, loaded and validated once per build. */
export interface Site {
  config: ChronicleConfig;
  chronicle: Chronicle;
  awards: Award[];
  playerName(id: string): string;
  playerAvatar(id: string): string;
  gameName(id: string): string;
  groupName(id: string): string;
  factionName(gameId: string, factionId: string): string;
}

let cached: Site | undefined;

export function getSite(): Site {
  if (cached) return cached;
  const chronicle = loadChronicle('data');
  const awards = computeAwards(chronicle);
  const players = new Map(chronicle.players.map((p) => [p.id, p]));
  const games = new Map(chronicle.games.map((g) => [g.id, g.name]));
  const groups = new Map(chronicle.groups.map((g) => [g.id, g.name]));
  const factions = new Map(
    chronicle.games.flatMap((g) => (g.factions ?? []).map((f) => [`${g.id}:${f.id}`, f.name])),
  );
  cached = {
    config: readConfig(),
    chronicle,
    awards,
    playerName: (id) => players.get(id)?.name ?? id,
    playerAvatar: (id) => players.get(id)?.avatar ?? '🎲',
    gameName: (id) => games.get(id) ?? id,
    groupName: (id) => groups.get(id) ?? id,
    factionName: (gameId, factionId) => factions.get(`${gameId}:${factionId}`) ?? factionId,
  };
  return cached;
}

/** Prefix an absolute site path with the configured base (GitHub Pages subpath). */
export function href(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}
