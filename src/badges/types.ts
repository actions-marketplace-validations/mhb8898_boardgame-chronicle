import type { Chronicle } from '../lib/load';

export type Tier = 'bronze' | 'silver' | 'gold';

/** A badge instance earned by a player. */
export interface Award {
  /** Stable id of the badge kind, e.g. 'faction-first-win:root:eyrie'. */
  badgeId: string;
  playerId: string;
  sessionId: string | null;
  /** YYYY-MM-DD the badge was earned. */
  date: string;
  title: string;
  description: string;
  icon: string;
  tier?: Tier;
  source: 'auto' | 'manual';
}

/** A badge rule derives awards from the full chronicle (sessions pre-sorted). */
export interface BadgeRule {
  id: string;
  run(chronicle: Chronicle): Award[];
}

/** Tiered thresholds; omit tiers you don't want. */
export type TierThresholds = Partial<Record<Tier, number>>;

export const TIER_ICONS: Record<Tier, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
};
