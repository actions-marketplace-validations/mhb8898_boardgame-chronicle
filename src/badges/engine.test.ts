import { describe, expect, test } from 'vitest';
import type { Chronicle } from '../lib/load';
import { loadChronicle } from '../lib/load';
import type { Session, SessionPlayer } from '../lib/schema';
import { computeAwards } from './engine';
import { defaultRules } from './config';
import { firstWin } from './rules/first-win';
import { factionFirstWin } from './rules/faction-first-win';
import { playMilestones, winMilestones } from './rules/milestones';
import { winStreak } from './rules/streaks';
import { factionCompletionist } from './rules/completionist';
import { explorer } from './rules/explorer';

function s(
  id: string,
  game: string,
  players: (Partial<SessionPlayer> & { player: string })[],
): Session {
  return {
    id,
    date: id.slice(0, 10),
    game,
    group: 'g',
    players: players.map((p) => ({ winner: false, ...p })),
  };
}

/** Minimal chronicle around a session list; root has factions, azul does not. */
function chron(sessions: Session[], manualBadges: Chronicle['manualBadges'] = []): Chronicle {
  return {
    players: [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ],
    groups: [{ id: 'g', name: 'G', members: ['a', 'b'] }],
    games: [
      {
        id: 'root',
        name: 'Root',
        factions: [
          { id: 'cats', name: 'Marquise de Cat' },
          { id: 'birds', name: 'Eyrie Dynasties' },
        ],
      },
      { id: 'azul', name: 'Azul' },
      { id: 'catan', name: 'Catan' },
    ],
    sessions,
    manualBadges,
  };
}

describe('firstWin rule', () => {
  test('awards once per player per game, at the first winning session', () => {
    const c = chron([
      s('2026-01-01-azul', 'azul', [{ player: 'a', winner: true }, { player: 'b' }]),
      s('2026-01-08-azul', 'azul', [{ player: 'a', winner: true }, { player: 'b' }]),
    ]);
    const awards = computeAwards(c, [firstWin()]);
    expect(awards).toHaveLength(1);
    expect(awards[0]).toMatchObject({
      playerId: 'a',
      sessionId: '2026-01-01-azul',
      date: '2026-01-01',
      title: 'First Win: Azul',
      source: 'auto',
    });
  });
});

describe('factionFirstWin rule', () => {
  test('awards per faction with faction display name in the title', () => {
    const c = chron([
      s('2026-01-01-root', 'root', [
        { player: 'a', faction: 'birds', winner: true },
        { player: 'b', faction: 'cats' },
      ]),
      s('2026-01-08-root', 'root', [
        { player: 'a', faction: 'birds', winner: true },
        { player: 'b', faction: 'cats' },
      ]),
      s('2026-01-15-root', 'root', [
        { player: 'a', faction: 'cats', winner: true },
        { player: 'b', faction: 'birds' },
      ]),
    ]);
    const awards = computeAwards(c, [factionFirstWin()]);
    expect(awards).toHaveLength(2); // birds once (first time only), cats once
    expect(awards[0]).toMatchObject({
      playerId: 'a',
      sessionId: '2026-01-01-root',
      title: 'First win with Eyrie Dynasties in Root',
    });
    expect(awards[1]).toMatchObject({ playerId: 'a', sessionId: '2026-01-15-root' });
  });

  test('ignores games without factions', () => {
    const c = chron([s('2026-01-01-azul', 'azul', [{ player: 'a', winner: true }])]);
    expect(computeAwards(c, [factionFirstWin()])).toHaveLength(0);
  });
});

describe('milestone rules', () => {
  test('playMilestones awards tiers at the crossing session', () => {
    const sessions = [1, 2, 3, 4].map((n) =>
      s(`2026-01-0${n}-azul`, 'azul', [{ player: 'a' }, { player: 'b', winner: true }]),
    );
    const awards = computeAwards(chron(sessions), [playMilestones({ bronze: 2, silver: 4 })]);
    const aAwards = awards.filter((x) => x.playerId === 'a');
    expect(aAwards).toHaveLength(2);
    expect(aAwards[0]).toMatchObject({ tier: 'bronze', sessionId: '2026-01-02-azul' });
    expect(aAwards[1]).toMatchObject({ tier: 'silver', sessionId: '2026-01-04-azul' });
  });

  test('winMilestones counts only wins', () => {
    const sessions = [1, 2, 3].map((n) =>
      s(`2026-01-0${n}-azul`, 'azul', [{ player: 'a', winner: n !== 2 }, { player: 'b' }]),
    );
    const awards = computeAwards(chron(sessions), [winMilestones({ bronze: 2 })]);
    expect(awards).toHaveLength(1);
    expect(awards[0]).toMatchObject({ playerId: 'a', tier: 'bronze', sessionId: '2026-01-03-azul' });
  });
});

describe('winStreak rule', () => {
  test('awards when streak length is reached, once per streak', () => {
    // a: W W W W L W W W → two awards (4th win extends, no re-award; new streak re-awards)
    const wins = [true, true, true, true, false, true, true, true];
    const sessions = wins.map((w, i) =>
      s(`2026-01-0${i + 1}-azul`, 'azul', [{ player: 'a', winner: w }, { player: 'b' }]),
    );
    const awards = computeAwards(chron(sessions), [winStreak(3)]);
    expect(awards).toHaveLength(2);
    expect(awards[0]!.sessionId).toBe('2026-01-03-azul');
    expect(awards[1]!.sessionId).toBe('2026-01-08-azul');
  });
});

describe('factionCompletionist rule', () => {
  test('awards when a player has won with every faction of a game', () => {
    const c = chron([
      s('2026-01-01-root', 'root', [{ player: 'a', faction: 'birds', winner: true }]),
      s('2026-01-08-root', 'root', [{ player: 'a', faction: 'cats', winner: true }]),
    ]);
    const awards = computeAwards(c, [factionCompletionist()]);
    expect(awards).toHaveLength(1);
    expect(awards[0]).toMatchObject({
      playerId: 'a',
      sessionId: '2026-01-08-root',
      title: 'Completionist: Root',
    });
  });
});

describe('explorer rule', () => {
  test('awards when a player has played N distinct games', () => {
    const c = chron([
      s('2026-01-01-azul', 'azul', [{ player: 'a' }]),
      s('2026-01-02-root', 'root', [{ player: 'a', faction: 'cats' }]),
      s('2026-01-03-catan', 'catan', [{ player: 'a' }]),
    ]);
    const awards = computeAwards(c, [explorer({ bronze: 3 })]);
    expect(awards).toHaveLength(1);
    expect(awards[0]).toMatchObject({ playerId: 'a', tier: 'bronze', sessionId: '2026-01-03-catan' });
  });
});

describe('manual badges', () => {
  test('are merged as awards with source manual, date from session', () => {
    const c = chron(
      [s('2026-01-01-azul', 'azul', [{ player: 'a', winner: true }])],
      [{ id: 'mvp', title: 'MVP', icon: '🏆', player: 'b', session: '2026-01-01-azul' }],
    );
    const awards = computeAwards(c, []);
    expect(awards).toHaveLength(1);
    expect(awards[0]).toMatchObject({
      badgeId: 'manual:mvp',
      playerId: 'b',
      sessionId: '2026-01-01-azul',
      date: '2026-01-01',
      source: 'manual',
    });
  });
});

describe('computeAwards', () => {
  test('results are sorted by date and badge ids are unique', () => {
    const c = loadChronicle('data');
    const awards = computeAwards(c, defaultRules);
    const dates = awards.map((a) => a.date);
    expect(dates).toEqual([...dates].sort());
    const ids = awards.map((a) => `${a.badgeId}:${a.playerId}`);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('seed data: mahdi earns "First win with Eyrie Dynasties in Root" on 2026-06-05', () => {
    const awards = computeAwards(loadChronicle('data'), defaultRules);
    const eyrie = awards.find(
      (a) => a.playerId === 'mahdi' && a.title === 'First win with Eyrie Dynasties in Root',
    );
    expect(eyrie).toBeDefined();
    expect(eyrie).toMatchObject({ date: '2026-06-05', sessionId: '2026-06-05-root', source: 'auto' });
  });
});
