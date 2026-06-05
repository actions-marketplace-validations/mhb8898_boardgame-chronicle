import type { Award, BadgeRule, Tier, TierThresholds } from '../types';
import { TIER_ICONS } from '../types';

const TIERS: Tier[] = ['bronze', 'silver', 'gold'];

/** Awarded for having played N distinct games (default 5/10/20). */
export function explorer(
  thresholds: TierThresholds = { bronze: 5, silver: 10, gold: 20 },
): BadgeRule {
  return {
    id: 'explorer',
    run(chronicle) {
      const played = new Map<string, Set<string>>(); // player → game ids
      const awards: Award[] = [];
      for (const session of chronicle.sessions) {
        for (const p of session.players) {
          const set = played.get(p.player) ?? new Set();
          if (set.has(session.game)) continue;
          set.add(session.game);
          played.set(p.player, set);
          for (const tier of TIERS) {
            if (thresholds[tier] !== set.size) continue;
            awards.push({
              badgeId: `explorer:${tier}`,
              playerId: p.player,
              sessionId: session.id,
              date: session.date,
              title: `Explorer: ${set.size} Different Games`,
              description: `Played ${set.size} distinct games.`,
              icon: TIER_ICONS[tier],
              tier,
              source: 'auto',
            });
          }
        }
      }
      return awards;
    },
  };
}
