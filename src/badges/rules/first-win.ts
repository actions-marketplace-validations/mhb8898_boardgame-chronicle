import type { Award, BadgeRule } from '../types';

/** First time a player wins each game. */
export function firstWin(): BadgeRule {
  return {
    id: 'first-win',
    run(chronicle) {
      const gameNames = new Map(chronicle.games.map((g) => [g.id, g.name]));
      const seen = new Set<string>(); // player:game
      const awards: Award[] = [];
      for (const session of chronicle.sessions) {
        for (const p of session.players) {
          if (!p.winner) continue;
          const key = `${p.player}:${session.game}`;
          if (seen.has(key)) continue;
          seen.add(key);
          awards.push({
            badgeId: `first-win:${session.game}`,
            playerId: p.player,
            sessionId: session.id,
            date: session.date,
            title: `First Win: ${gameNames.get(session.game)}`,
            description: `Won ${gameNames.get(session.game)} for the first time.`,
            icon: '🌟',
            source: 'auto',
          });
        }
      }
      return awards;
    },
  };
}
