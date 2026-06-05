import type { Award, BadgeRule } from '../types';

/** Awarded when a player wins `length` sessions in a row (once per streak). */
export function winStreak(length = 3): BadgeRule {
  return {
    id: `win-streak-${length}`,
    run(chronicle) {
      const current = new Map<string, number>();
      const awards: Award[] = [];
      for (const session of chronicle.sessions) {
        for (const p of session.players) {
          const streak = p.winner ? (current.get(p.player) ?? 0) + 1 : 0;
          current.set(p.player, streak);
          if (streak === length) {
            awards.push({
              badgeId: `win-streak:${length}`,
              playerId: p.player,
              sessionId: session.id,
              date: session.date,
              title: `On Fire: ${length} Wins in a Row`,
              description: `Won ${length} consecutive sessions.`,
              icon: '🔥',
              source: 'auto',
            });
          }
        }
      }
      return awards;
    },
  };
}
