import * as fs from 'node:fs';
import * as path from 'node:path';
import yaml from 'js-yaml';
import type { ZodType } from 'zod';
import {
  GameSchema,
  GroupSchema,
  ManualBadgeSchema,
  PlayerSchema,
  SessionSchema,
  type Game,
  type Group,
  type ManualBadge,
  type Player,
  type Session,
} from './schema';

/** Raised for any invalid or inconsistent data file; message names the file. */
export class ChronicleError extends Error {}

export interface Chronicle {
  players: Player[];
  groups: Group[];
  games: Game[];
  /** Sorted chronologically ascending (date, then id). */
  sessions: Session[];
  manualBadges: ManualBadge[];
}

function fail(file: string, message: string): never {
  throw new ChronicleError(`${file}: ${message}`);
}

function readYaml(filePath: string): unknown {
  return yaml.load(fs.readFileSync(filePath, 'utf8'));
}

function parseWith<T>(schema: ZodType<T>, value: unknown, file: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    const details = result.error.issues
      .map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message))
      .join('; ');
    fail(file, details);
  }
  return result.data;
}

function parseRegistry<T extends { id: string }>(schema: ZodType<T>, filePath: string): T[] {
  const file = path.basename(filePath);
  const raw = readYaml(filePath);
  if (!Array.isArray(raw)) fail(file, 'expected a YAML list');
  const items = raw.map((entry) => parseWith(schema, entry, file));
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) fail(file, `duplicate id "${item.id}"`);
    seen.add(item.id);
  }
  return items;
}

function loadSessions(
  sessionsDir: string,
  players: Set<string>,
  groups: Set<string>,
  games: Map<string, Game>,
): Session[] {
  const files = fs.existsSync(sessionsDir)
    ? fs.readdirSync(sessionsDir).filter((f) => /\.ya?ml$/.test(f))
    : [];

  const sessions = files.map((file) => {
    const parsed = parseWith(SessionSchema, readYaml(path.join(sessionsDir, file)), file);
    const session: Session = { ...parsed, id: file.replace(/\.ya?ml$/, '') };

    if (!groups.has(session.group)) fail(file, `unknown group "${session.group}"`);
    const game = games.get(session.game);
    if (!game) fail(file, `unknown game "${session.game}"`);

    const factionIds = new Set((game.factions ?? []).map((f) => f.id));
    const seenPlayers = new Set<string>();
    for (const p of session.players) {
      if (!players.has(p.player)) fail(file, `unknown player "${p.player}"`);
      if (seenPlayers.has(p.player)) fail(file, `duplicate player "${p.player}"`);
      seenPlayers.add(p.player);
      if (p.faction !== undefined) {
        if (!game.factions) fail(file, `game "${game.id}" has no factions, but "${p.player}" lists one`);
        if (!factionIds.has(p.faction))
          fail(file, `"${p.faction}" is not a faction of game "${game.id}"`);
      }
    }
    return session;
  });

  return sessions.sort((a, b) =>
    a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date),
  );
}

export function loadChronicle(dataDir: string): Chronicle {
  const players = parseRegistry(PlayerSchema, path.join(dataDir, 'players.yaml'));
  const groups = parseRegistry(GroupSchema, path.join(dataDir, 'groups.yaml'));
  const games = parseRegistry(GameSchema, path.join(dataDir, 'games.yaml'));

  const playerIds = new Set(players.map((p) => p.id));
  for (const group of groups) {
    for (const member of group.members) {
      if (!playerIds.has(member)) fail('groups.yaml', `unknown player "${member}" in group "${group.id}"`);
    }
  }

  const sessions = loadSessions(
    path.join(dataDir, 'sessions'),
    playerIds,
    new Set(groups.map((g) => g.id)),
    new Map(games.map((g) => [g.id, g])),
  );

  const manualPath = path.join(dataDir, 'badges', 'manual.yaml');
  const manualBadges = fs.existsSync(manualPath)
    ? parseRegistry(ManualBadgeSchema, manualPath)
    : [];
  const sessionIds = new Set(sessions.map((s) => s.id));
  for (const badge of manualBadges) {
    if (!playerIds.has(badge.player)) fail('manual.yaml', `unknown player "${badge.player}"`);
    if (badge.session !== undefined && !sessionIds.has(badge.session))
      fail('manual.yaml', `unknown session "${badge.session}"`);
  }

  return { players, groups, games, sessions, manualBadges };
}
