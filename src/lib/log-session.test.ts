import { describe, expect, test } from 'vitest';
import yaml from 'js-yaml';
import { SessionSchema } from './schema';
import {
  buildSessionYaml,
  buildIssueBody,
  buildIssueTitle,
  buildIssueUrl,
  sessionFileStem,
  ISSUE_URL_SOFT_LIMIT,
  type LogFormInput,
} from './log-session';

const fullInput: LogFormInput = {
  date: '2026-06-05',
  game: 'root',
  group: 'thursday-crew',
  location: "Mahdi's place",
  notes: 'First Eyrie win!',
  players: [
    { player: 'mahdi', faction: 'eyrie', winner: true },
    { player: 'sara', faction: 'marquise', score: 24, winner: false },
  ],
};

const minimalInput: LogFormInput = {
  date: '2026-06-10',
  game: 'azul',
  group: 'thursday-crew',
  players: [
    { player: 'mahdi', winner: true },
    { player: 'sara', score: 18, winner: false },
  ],
};

describe('buildSessionYaml', () => {
  test('matches the style of existing session files', () => {
    expect(buildSessionYaml(minimalInput)).toBe(
      [
        'date: 2026-06-10',
        'game: azul',
        'group: thursday-crew',
        'players:',
        '  - { player: mahdi, winner: true }',
        '  - { player: sara, score: 18 }',
        '',
      ].join('\n'),
    );
  });

  test('includes location and notes when present', () => {
    const out = buildSessionYaml(fullInput);
    expect(out).toContain("location: Mahdi's place");
    expect(out).toContain('notes: First Eyrie win!');
  });

  test('omits empty/false fields but keeps a zero score', () => {
    const out = buildSessionYaml({
      ...minimalInput,
      location: '',
      notes: '   ',
      players: [{ player: 'mahdi', faction: '', score: 0, winner: false }],
    });
    expect(out).not.toContain('location');
    expect(out).not.toContain('notes');
    expect(out).not.toContain('faction');
    expect(out).not.toContain('winner');
    expect(out).toContain('score: 0');
  });

  test('round-trips through SessionSchema', () => {
    for (const input of [fullInput, minimalInput]) {
      const parsed = SessionSchema.parse(yaml.load(buildSessionYaml(input)));
      expect(parsed.date).toBe(input.date);
      expect(parsed.game).toBe(input.game);
      expect(parsed.players).toHaveLength(input.players.length);
    }
  });

  test('escapes notes that would break YAML', () => {
    const tricky = { ...minimalInput, notes: 'score: was #close [or not]' };
    const parsed = SessionSchema.parse(yaml.load(buildSessionYaml(tricky)));
    expect(parsed.notes).toBe('score: was #close [or not]');
  });
});

describe('sessionFileStem', () => {
  test('derives YYYY-MM-DD-<game>', () => {
    expect(sessionFileStem({ date: '2026-06-05', game: 'root' })).toBe('2026-06-05-root');
  });
});

describe('buildIssueTitle', () => {
  test('formats as [log] date game', () => {
    expect(buildIssueTitle(fullInput)).toBe('[log] 2026-06-05 root');
  });
});

describe('buildIssueBody', () => {
  test('wraps the yaml in a fenced block', () => {
    const y = buildSessionYaml(minimalInput);
    const body = buildIssueBody(y);
    expect(body).toContain('```yaml\n' + y + '```');
  });
});

describe('buildIssueUrl', () => {
  test('builds a prefilled new-issue url with encoded params', () => {
    const url = buildIssueUrl('https://github.com/mhb8898/gamelog', {
      title: '[log] 2026-06-05 root',
      body: 'hello & world',
      labels: ['log'],
    });
    expect(url.startsWith('https://github.com/mhb8898/gamelog/issues/new?')).toBe(true);
    const params = new URL(url).searchParams;
    expect(params.get('title')).toBe('[log] 2026-06-05 root');
    expect(params.get('body')).toBe('hello & world');
    expect(params.get('labels')).toBe('log');
  });

  test('strips trailing slash and .git from the repo url', () => {
    for (const repo of [
      'https://github.com/mhb8898/gamelog/',
      'https://github.com/mhb8898/gamelog.git',
    ]) {
      const url = buildIssueUrl(repo, { title: 't', body: 'b', labels: [] });
      expect(url.startsWith('https://github.com/mhb8898/gamelog/issues/new?')).toBe(true);
    }
  });

  test('exports a soft url length limit', () => {
    expect(ISSUE_URL_SOFT_LIMIT).toBe(8000);
  });
});
