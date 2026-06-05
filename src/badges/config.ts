import type { BadgeRule } from './types';
import { firstWin } from './rules/first-win';
import { factionFirstWin } from './rules/faction-first-win';
import { playMilestones, winMilestones } from './rules/milestones';
import { winStreak } from './rules/streaks';
import { factionCompletionist } from './rules/completionist';
import { explorer } from './rules/explorer';

/**
 * Active badge rules. Tune thresholds here, or add a new rule:
 * write a small factory in src/badges/rules/ and list it below.
 */
export const defaultRules: BadgeRule[] = [
  firstWin(),
  factionFirstWin(),
  playMilestones({ bronze: 10, silver: 25, gold: 50 }),
  winMilestones({ bronze: 5, silver: 15, gold: 30 }),
  winStreak(3),
  factionCompletionist(),
  explorer({ bronze: 5, silver: 10, gold: 20 }),
];
