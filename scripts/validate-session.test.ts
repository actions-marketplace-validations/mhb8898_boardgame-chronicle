import { describe, expect, test } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { validateSession } from './validate-session';

/** Write a set of relative-path → content files into a fresh temp dir. */
function writeData(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chronicle-vs-'));
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
  return dir;
}

function baseFiles(): Record<string, string> {
  return {
    'players.yaml': `
- id: mahdi
  name: Mahdi
- id: sara
  name: Sara
`,
    'groups.yaml': `
- id: thursday-crew
  name: Thursday Crew
  members: [mahdi, sara]
`,
    'games.yaml': `
- id: root
  name: Root
  factions:
    - { id: eyrie, name: Eyrie Dynasties }
    - { id: marquise, name: Marquise de Cat }
- id: azul
  name: Azul
`,
    'sessions/2026-06-05-root.yaml': `
date: 2026-06-05
game: root
group: thursday-crew
players:
  - { player: mahdi, faction: eyrie, winner: true }
  - { player: sara, faction: marquise }
`,
    'badges/manual.yaml': '[]\n',
  };
}

const goodYaml = `
date: 2026-06-10
game: azul
group: thursday-crew
players:
  - { player: mahdi, winner: true }
  - { player: sara, score: 18 }
`;

describe('validateSession', () => {
  test('accepts a valid session and reports the target filename', () => {
    const dir = writeData(baseFiles());
    const result = validateSession(goodYaml, dir);
    expect(result.ok).toBe(true);
    expect(result.filename).toBe('2026-06-10-azul.yaml');
    expect(result.preview).toContain('Azul');
    expect(result.preview).toContain('Mahdi');
  });

  test('suffixes the filename when a session for that date and game exists', () => {
    const dir = writeData(baseFiles());
    const dup = goodYaml.replace('2026-06-10', '2026-06-05').replace('game: azul', 'game: root');
    const result = validateSession(dup.replace(/faction: \w+,? ?/g, ''), dir);
    expect(result.ok).toBe(true);
    expect(result.filename).toBe('2026-06-05-root-2.yaml');
  });

  test('rejects malformed YAML', () => {
    const dir = writeData(baseFiles());
    const result = validateSession('date: [unclosed', dir);
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  test('rejects a session missing required fields', () => {
    const dir = writeData(baseFiles());
    const result = validateSession('date: 2026-06-10\ngame: azul\n', dir);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/group|players/);
  });

  test('rejects unknown player ids via cross-reference validation', () => {
    const dir = writeData(baseFiles());
    const result = validateSession(goodYaml.replace('player: sara', 'player: saraa'), dir);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/unknown player.*saraa/s);
  });

  test('rejects a faction not belonging to the game', () => {
    const dir = writeData(baseFiles());
    const bad = `
date: 2026-06-10
game: root
group: thursday-crew
players:
  - { player: mahdi, faction: nope, winner: true }
`;
    const result = validateSession(bad, dir);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/nope.*not a faction/s);
  });

  test('does not leave a candidate file behind on failure', () => {
    const dir = writeData(baseFiles());
    validateSession(goodYaml.replace('player: sara', 'player: saraa'), dir);
    expect(fs.readdirSync(path.join(dir, 'sessions'))).toEqual(['2026-06-05-root.yaml']);
  });
});
