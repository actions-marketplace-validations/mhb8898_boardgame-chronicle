import type { Award, BadgeRule } from '../types';

/** Awarded when a player has won with every faction of a game. */
export function factionCompletionist(): BadgeRule {
  return {
    id: 'faction-completionist',
    run(chronicle) {
      const games = new Map(chronicle.games.map((g) => [g.id, g]));
      const wonWith = new Map<string, Set<string>>(); // player:game → faction ids
      const done = new Set<string>(); // player:game
      const awards: Award[] = [];
      for (const session of chronicle.sessions) {
        const game = games.get(session.game);
        if (!game?.factions) continue;
        for (const p of session.players) {
          if (!p.winner || p.faction === undefined) continue;
          const key = `${p.player}:${session.game}`;
          if (done.has(key)) continue;
          const set = wonWith.get(key) ?? new Set();
          set.add(p.faction);
          wonWith.set(key, set);
          if (set.size === game.factions.length) {
            done.add(key);
            awards.push({
              badgeId: `faction-completionist:${session.game}`,
              playerId: p.player,
              sessionId: session.id,
              date: session.date,
              title: `Completionist: ${game.name}`,
              description: `Won ${game.name} with every faction.`,
              icon: '💎',
              source: 'auto',
            });
          }
        }
      }
      return awards;
    },
  };
}
