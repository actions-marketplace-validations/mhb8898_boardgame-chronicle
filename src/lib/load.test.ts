import { describe, expect, test } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { loadChronicle } from './load';

/** Write a set of relative-path → content files into a fresh temp dir. */
function writeData(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chronicle-'));
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
  return dir;
}

const basePlayers = `
- id: mahdi
  name: Mahdi
  avatar: "🦅"
- id: sara
  name: Sara
  avatar: "🐱"
`;

const baseGroups = `
- id: thursday-crew
  name: Thursday Crew
  members: [mahdi, sara]
`;

const baseGames = `
- id: root
  name: Root
  factions:
    - { id: marquise, name: Marquise de Cat }
    - { id: eyrie, name: Eyrie Dynasties }
    - { id: alliance, name: Woodland Alliance }
    - { id: vagabond, name: Vagabond }
- id: azul
  name: Azul
`;

const baseSession = `
date: 2026-06-05
game: root
group: thursday-crew
players:
  - player: mahdi
    faction: eyrie
    winner: true
  - player: sara
    faction: marquise
    score: 24
`;

function baseFiles(): Record<string, string> {
  return {
    'players.yaml': basePlayers,
    'groups.yaml': baseGroups,
    'games.yaml': baseGames,
    'sessions/2026-06-05-root.yaml': baseSession,
    'badges/manual.yaml': '[]\n',
  };
}

describe('loadChronicle', () => {
  test('loads a valid dataset into a typed model', () => {
    const dir = writeData(baseFiles());
    const c = loadChronicle(dir);

    expect(c.players.map((p) => p.id)).toEqual(['mahdi', 'sara']);
    expect(c.groups[0]!.members).toEqual(['mahdi', 'sara']);
    expect(c.games.find((g) => g.id === 'root')!.factions).toHaveLength(4);

    const s = c.sessions[0]!;
    expect(s.id).toBe('2026-06-05-root'); // id derived from filename
    expect(s.date).toBe('2026-06-05'); // normalized to YYYY-MM-DD string
    expect(s.game).toBe('root');
    expect(s.players[0]).toMatchObject({ player: 'mahdi', faction: 'eyrie', winner: true });
    expect(s.players[1]).toMatchObject({ player: 'sara', winner: false }); // winner defaults false
  });

  test('sorts sessions chronologically ascending', () => {
    const files = baseFiles();
    files['sessions/2026-05-01-azul.yaml'] = `
date: 2026-05-01
game: azul
group: thursday-crew
players:
  - { player: sara, winner: true }
  - { player: mahdi }
`;
    const dir = writeData(files);
    const c = loadChronicle(dir);
    expect(c.sessions.map((s) => s.id)).toEqual(['2026-05-01-azul', '2026-06-05-root']);
  });

  test('rejects a session referencing an unknown player', () => {
    const files = baseFiles();
    files['sessions/2026-06-06-root.yaml'] = baseSession.replace('player: sara', 'player: saraa');
    const dir = writeData(files);
    expect(() => loadChronicle(dir)).toThrowError(/2026-06-06-root.*unknown player.*saraa/s);
  });

  test('rejects a session referencing an unknown game or group', () => {
    const files = baseFiles();
    files['sessions/2026-06-06-root.yaml'] = baseSession.replace('game: root', 'game: rootz');
    expect(() => loadChronicle(writeData(files))).toThrowError(/unknown game.*rootz/s);

    const files2 = baseFiles();
    files2['sessions/2026-06-06-root.yaml'] = baseSession.replace(
      'group: thursday-crew',
      'group: friday-crew',
    );
    expect(() => loadChronicle(writeData(files2))).toThrowError(/unknown group.*friday-crew/s);
  });

  test('rejects a faction not in the game faction list', () => {
    const files = baseFiles();
    files['sessions/2026-06-06-root.yaml'] = baseSession.replace(
      'faction: eyrie',
      'faction: eyries',
    );
    expect(() => loadChronicle(writeData(files))).toThrowError(/eyries.*not a faction of.*root/s);
  });

  test('rejects a faction on a game that has no factions', () => {
    const files = baseFiles();
    files['sessions/2026-06-06-azul.yaml'] = `
date: 2026-06-06
game: azul
group: thursday-crew
players:
  - { player: mahdi, faction: eyrie, winner: true }
`;
    expect(() => loadChronicle(writeData(files))).toThrowError(/azul.*has no factions/s);
  });

  test('rejects duplicate players within a session', () => {
    const files = baseFiles();
    files['sessions/2026-06-06-root.yaml'] = `
date: 2026-06-06
game: root
group: thursday-crew
players:
  - { player: mahdi, faction: eyrie, winner: true }
  - { player: mahdi, faction: marquise }
`;
    expect(() => loadChronicle(writeData(files))).toThrowError(/duplicate player.*mahdi/s);
  });

  test('rejects duplicate ids in registry files', () => {
    const files = baseFiles();
    files['players.yaml'] = basePlayers + `
- id: mahdi
  name: Mahdi Again
`;
    expect(() => loadChronicle(writeData(files))).toThrowError(/duplicate id.*mahdi/s);
  });

  test('loads manual badges and validates their references', () => {
    const files = baseFiles();
    files['badges/manual.yaml'] = `
- id: comeback-king
  title: Comeback King
  description: Won after being last at mid-game.
  icon: "👑"
  player: mahdi
  session: 2026-06-05-root
`;
    const c = loadChronicle(writeData(files));
    expect(c.manualBadges[0]).toMatchObject({
      id: 'comeback-king',
      player: 'mahdi',
      session: '2026-06-05-root',
    });

    files['badges/manual.yaml'] = files['badges/manual.yaml'].replace(
      'session: 2026-06-05-root',
      'session: 2099-01-01-nope',
    );
    expect(() => loadChronicle(writeData(files))).toThrowError(/unknown session.*2099-01-01-nope/s);
  });

  test('error messages name the offending file', () => {
    const files = baseFiles();
    files['sessions/2026-06-06-root.yaml'] = 'date: 2026-06-06\ngame: root\n'; // missing fields
    expect(() => loadChronicle(writeData(files))).toThrowError(/2026-06-06-root\.yaml/);
  });
});
