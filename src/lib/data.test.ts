import { expect, test } from 'vitest';
import { loadChronicle } from './load';

// Guard: the repo's real data/ directory must always be valid.
test('repo data directory loads cleanly', () => {
  const c = loadChronicle('data');
  expect(c.players.length).toBeGreaterThan(0);
  expect(c.sessions.length).toBeGreaterThan(0);
});
