import { describe, expect, test } from 'vitest';
import type { Session, SessionPlayer } from './schema';
import {
  factionAffinity,
  factionStats,
  headToHead,
  leaderboard,
  mostPlayedGames,
  winStreaks,
} from './stats';

/** Compact session builder: players as "id", "id+" (winner), or full object. */
function s(
  id: string,
  game: string,
  players: (string | Partial<SessionPlayer> & { player: string })[],
  group = 'g',
): Session {
  return {
    id,
    date: id.slice(0, 10),
    game,
    group,
    players: players.map((p) =>
      typeof p === 'string'
        ? { player: p.replace(/\+$/, ''), winner: p.endsWith('+') }
        : { winner: false, ...p },
    ),
  };
}

const sessions: Session[] = [
  s('2026-01-01-root', 'root', [
    { player: 'a', faction: 'cats', winner: true },
    { player: 'b', faction: 'birds' },
  ]),
  s('2026-01-08-root', 'root', [
    { player: 'b', faction: 'cats', winner: true },
    { player: 'a', faction: 'birds' },
  ]),
  s('2026-01-15-azul', 'azul', ['a+', 'b', 'c']),
  s('2026-01-22-azul', 'azul', ['a+', 'c']),
];

describe('leaderboard', () => {
  test('counts plays and wins, sorted by wins then win rate', () => {
    const board = leaderboard(sessions);
    expect(board[0]).toEqual({ player: 'a', plays: 4, wins: 3, winRate: 0.75 });
    expect(board[1]).toEqual({ player: 'b', plays: 3, wins: 1, winRate: 1 / 3 });
    expect(board[2]).toEqual({ player: 'c', plays: 2, wins: 0, winRate: 0 });
  });

  test('empty sessions give empty board', () => {
    expect(leaderboard([])).toEqual([]);
  });
});

describe('mostPlayedGames', () => {
  test('overall play counts per game, descending', () => {
    expect(mostPlayedGames(sessions)).toEqual([
      { game: 'root', plays: 2 },
      { game: 'azul', plays: 2 },
    ]);
  });

  test('filtered to one player', () => {
    expect(mostPlayedGames(sessions, 'c')).toEqual([{ game: 'azul', plays: 2 }]);
  });
});

describe('factionStats', () => {
  test('plays and wins per faction for a game', () => {
    expect(factionStats(sessions, 'root')).toEqual([
      { faction: 'cats', plays: 2, wins: 2 },
      { faction: 'birds', plays: 2, wins: 0 },
    ]);
  });
});

describe('headToHead', () => {
  test('shared sessions and relative wins against each opponent', () => {
    const h2h = headToHead(sessions, 'a');
    expect(h2h).toContainEqual({ opponent: 'b', shared: 3, wins: 2, losses: 1 });
    expect(h2h).toContainEqual({ opponent: 'c', shared: 2, wins: 2, losses: 0 });
  });
});

describe('factionAffinity', () => {
  test('plays and wins per (player, game, faction), most-played first', () => {
    const extra = [
      ...sessions,
      s('2026-02-01-root', 'root', [
        { player: 'a', faction: 'cats', winner: true },
        { player: 'b', faction: 'birds' },
      ]),
    ];
    expect(factionAffinity(extra)).toEqual([
      { player: 'a', game: 'root', faction: 'cats', plays: 2, wins: 2 },
      { player: 'b', game: 'root', faction: 'birds', plays: 2, wins: 0 },
      { player: 'b', game: 'root', faction: 'cats', plays: 1, wins: 1 },
      { player: 'a', game: 'root', faction: 'birds', plays: 1, wins: 0 },
    ]);
  });

  test('ignores factionless entries', () => {
    expect(factionAffinity([s('2026-01-15-azul', 'azul', ['a+', 'b'])])).toEqual([]);
  });
});

describe('winStreaks', () => {
  test('longest and current consecutive-win streaks per player', () => {
    // a: W L W W → longest 2, current 2; b: L W L → longest 1, current 0
    const streaks = winStreaks(sessions);
    expect(streaks.get('a')).toEqual({ longest: 2, current: 2 });
    expect(streaks.get('b')).toEqual({ longest: 1, current: 0 });
    expect(streaks.get('c')).toEqual({ longest: 0, current: 0 });
  });
});
