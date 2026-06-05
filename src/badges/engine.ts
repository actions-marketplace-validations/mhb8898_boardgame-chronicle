import type { Chronicle } from '../lib/load';
import type { Award, BadgeRule } from './types';
import { defaultRules } from './config';

/**
 * Run every rule over the chronicle and merge manual badges.
 * Deterministic: derived purely from the data files, so editing history
 * recomputes all badges on the next build.
 */
export function computeAwards(chronicle: Chronicle, rules: BadgeRule[] = defaultRules): Award[] {
  const sessionDates = new Map(chronicle.sessions.map((s) => [s.id, s.date]));

  const manual: Award[] = chronicle.manualBadges.map((b) => {
    const date = b.date ?? (b.session !== undefined ? sessionDates.get(b.session) : undefined);
    if (date === undefined) {
      throw new Error(`manual badge "${b.id}" needs a date or a session reference`);
    }
    return {
      badgeId: `manual:${b.id}`,
      playerId: b.player,
      sessionId: b.session ?? null,
      date,
      title: b.title,
      description: b.description ?? '',
      icon: b.icon ?? '🎖️',
      source: 'manual',
    };
  });

  return [...rules.flatMap((rule) => rule.run(chronicle)), ...manual].sort(
    (a, b) => a.date.localeCompare(b.date) || a.badgeId.localeCompare(b.badgeId),
  );
}
