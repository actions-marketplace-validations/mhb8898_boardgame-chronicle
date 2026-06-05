import type { Session } from './schema';

export interface PlayerStats {
  player: string;
  plays: number;
  wins: number;
  winRate: number;
}

/** Plays/wins/win-rate per player, sorted by wins desc, then win rate, then plays. */
export function leaderboard(sessions: Session[]): PlayerStats[] {
  const byPlayer = new Map<string, { plays: number; wins: number }>();
  for (const session of sessions) {
    for (const p of session.players) {
      const entry = byPlayer.get(p.player) ?? { plays: 0, wins: 0 };
      entry.plays++;
      if (p.winner) entry.wins++;
      byPlayer.set(p.player, entry);
    }
  }
  return [...byPlayer.entries()]
    .map(([player, { plays, wins }]) => ({ player, plays, wins, winRate: wins / plays }))
    .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate || b.plays - a.plays);
}

/** Play counts per game, descending; optionally only sessions a player took part in. */
export function mostPlayedGames(
  sessions: Session[],
  playerId?: string,
): { game: string; plays: number }[] {
  const counts = new Map<string, number>();
  for (const session of sessions) {
    if (playerId !== undefined && !session.players.some((p) => p.player === playerId)) continue;
    counts.set(session.game, (counts.get(session.game) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([game, plays]) => ({ game, plays }))
    .sort((a, b) => b.plays - a.plays);
}

/** Plays and wins per faction for one game, sorted by wins then plays. */
export function factionStats(
  sessions: Session[],
  gameId: string,
): { faction: string; plays: number; wins: number }[] {
  const byFaction = new Map<string, { plays: number; wins: number }>();
  for (const session of sessions) {
    if (session.game !== gameId) continue;
    for (const p of session.players) {
      if (p.faction === undefined) continue;
      const entry = byFaction.get(p.faction) ?? { plays: 0, wins: 0 };
      entry.plays++;
      if (p.winner) entry.wins++;
      byFaction.set(p.faction, entry);
    }
  }
  return [...byFaction.entries()]
    .map(([faction, { plays, wins }]) => ({ faction, plays, wins }))
    .sort((a, b) => b.wins - a.wins || b.plays - a.plays);
}

export interface HeadToHead {
  opponent: string;
  /** Sessions both players took part in. */
  shared: number;
  /** Shared sessions the player won. */
  wins: number;
  /** Shared sessions the opponent won. */
  losses: number;
}

/** Record against every opponent the player has shared a table with. */
export function headToHead(sessions: Session[], playerId: string): HeadToHead[] {
  const byOpponent = new Map<string, { shared: number; wins: number; losses: number }>();
  for (const session of sessions) {
    const me = session.players.find((p) => p.player === playerId);
    if (!me) continue;
    for (const p of session.players) {
      if (p.player === playerId) continue;
      const entry = byOpponent.get(p.player) ?? { shared: 0, wins: 0, losses: 0 };
      entry.shared++;
      if (me.winner) entry.wins++;
      if (p.winner) entry.losses++;
      byOpponent.set(p.player, entry);
    }
  }
  return [...byOpponent.entries()]
    .map(([opponent, record]) => ({ opponent, ...record }))
    .sort((a, b) => b.shared - a.shared);
}

/** Longest and current consecutive-win streaks per player (sessions in given order). */
export function winStreaks(
  sessions: Session[],
): Map<string, { longest: number; current: number }> {
  const streaks = new Map<string, { longest: number; current: number }>();
  for (const session of sessions) {
    for (const p of session.players) {
      const entry = streaks.get(p.player) ?? { longest: 0, current: 0 };
      entry.current = p.winner ? entry.current + 1 : 0;
      entry.longest = Math.max(entry.longest, entry.current);
      streaks.set(p.player, entry);
    }
  }
  return streaks;
}
