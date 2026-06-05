import type { Award, BadgeRule } from '../types';

/** First win with each faction of each game that has factions. */
export function factionFirstWin(): BadgeRule {
  return {
    id: 'faction-first-win',
    run(chronicle) {
      const games = new Map(chronicle.games.map((g) => [g.id, g]));
      const seen = new Set<string>(); // player:game:faction
      const awards: Award[] = [];
      for (const session of chronicle.sessions) {
        const game = games.get(session.game);
        if (!game?.factions) continue;
        const factionNames = new Map(game.factions.map((f) => [f.id, f.name]));
        for (const p of session.players) {
          if (!p.winner || p.faction === undefined) continue;
          const key = `${p.player}:${session.game}:${p.faction}`;
          if (seen.has(key)) continue;
          seen.add(key);
          awards.push({
            badgeId: `faction-first-win:${session.game}:${p.faction}`,
            playerId: p.player,
            sessionId: session.id,
            date: session.date,
            title: `First win with ${factionNames.get(p.faction)} in ${game.name}`,
            description: `Won ${game.name} as ${factionNames.get(p.faction)} for the first time.`,
            icon: '🚩',
            source: 'auto',
          });
        }
      }
      return awards;
    },
  };
}
