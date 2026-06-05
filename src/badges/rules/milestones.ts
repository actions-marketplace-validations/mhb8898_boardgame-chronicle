import type { Award, BadgeRule, Tier, TierThresholds } from '../types';
import { TIER_ICONS } from '../types';

const TIERS: Tier[] = ['bronze', 'silver', 'gold'];

/**
 * Generic counting milestone: increments a per-player counter per session and
 * awards a tier the moment its threshold is crossed.
 */
function countingMilestone(
  ruleId: string,
  thresholds: TierThresholds,
  counts: (winner: boolean) => number,
  texts: (n: number) => { title: string; description: string },
): BadgeRule {
  return {
    id: ruleId,
    run(chronicle) {
      const totals = new Map<string, number>();
      const awards: Award[] = [];
      for (const session of chronicle.sessions) {
        for (const p of session.players) {
          const total = (totals.get(p.player) ?? 0) + counts(p.winner);
          totals.set(p.player, total);
          for (const tier of TIERS) {
            const threshold = thresholds[tier];
            if (threshold === undefined) continue;
            // Crossing exactly: counts() returns 0 or 1, so === detects the crossing session.
            if (total === threshold && counts(p.winner) === 1) {
              const { title, description } = texts(threshold);
              awards.push({
                badgeId: `${ruleId}:${tier}`,
                playerId: p.player,
                sessionId: session.id,
                date: session.date,
                title,
                description,
                icon: TIER_ICONS[tier],
                tier,
                source: 'auto',
              });
            }
          }
        }
      }
      return awards;
    },
  };
}

/** N total sessions played (default 10/25/50). */
export function playMilestones(
  thresholds: TierThresholds = { bronze: 10, silver: 25, gold: 50 },
): BadgeRule {
  return countingMilestone(
    'play-milestone',
    thresholds,
    () => 1,
    (n) => ({ title: `${n} Games Played`, description: `Sat down for ${n} recorded games.` }),
  );
}

/** N total wins (default 5/15/30). */
export function winMilestones(
  thresholds: TierThresholds = { bronze: 5, silver: 15, gold: 30 },
): BadgeRule {
  return countingMilestone(
    'win-milestone',
    thresholds,
    (winner) => (winner ? 1 : 0),
    (n) => ({ title: `${n} Wins`, description: `Claimed ${n} victories.` }),
  );
}
