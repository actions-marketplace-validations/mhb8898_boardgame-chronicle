import yaml from 'js-yaml';

/**
 * Helpers for the "Log a play" form: turn form input into session YAML and a
 * prefilled GitHub new-issue URL on the data repo. Pure functions — used by
 * the /log page client script and by scripts/validate-session.ts.
 */

export interface LogFormPlayer {
  player: string;
  faction?: string;
  score?: number;
  winner: boolean;
}

export interface LogFormInput {
  date: string; // YYYY-MM-DD
  game: string;
  group: string;
  location?: string;
  notes?: string;
  players: LogFormPlayer[];
}

/** GitHub silently truncates very long prefilled-issue URLs; warn before that. */
export const ISSUE_URL_SOFT_LIMIT = 8000;

/**
 * Serialize a session in the same style as hand-written files: unquoted date,
 * flow-style player maps, empty/default fields omitted. Ids and scores are
 * plain-safe by construction; only location/notes need real YAML escaping.
 */
export function buildSessionYaml(input: LogFormInput): string {
  const lines = [`date: ${input.date}`, `game: ${input.game}`, `group: ${input.group}`];
  const location = input.location?.trim();
  if (location) lines.push(yaml.dump({ location }).trimEnd());
  const notes = input.notes?.trim();
  if (notes) lines.push(yaml.dump({ notes }).trimEnd());
  lines.push('players:');
  for (const p of input.players) {
    const parts = [`player: ${p.player}`];
    const faction = p.faction?.trim();
    if (faction) parts.push(`faction: ${faction}`);
    if (p.score !== undefined) parts.push(`score: ${p.score}`);
    if (p.winner) parts.push('winner: true');
    lines.push(`  - { ${parts.join(', ')} }`);
  }
  return lines.join('\n') + '\n';
}

/** Filename stem for a session: `YYYY-MM-DD-<game>` (no extension). */
export function sessionFileStem(input: { date: string; game: string }): string {
  return `${input.date}-${input.game}`;
}

export function buildIssueTitle(input: LogFormInput): string {
  return `[log] ${input.date} ${input.game}`;
}

export function buildIssueBody(sessionYaml: string): string {
  return [
    'New play session submitted from the log form.',
    '',
    '```yaml',
    sessionYaml + '```',
    '',
    '_A maintainer will review and approve this session. Do not edit below the YAML block._',
    '',
  ].join('\n');
}

/** Prefilled GitHub new-issue URL on the data repo. */
export function buildIssueUrl(
  repoUrl: string,
  opts: { title: string; body: string; labels: string[] },
): string {
  const repo = repoUrl.replace(/\.git$/, '').replace(/\/+$/, '');
  const params = new URLSearchParams({ title: opts.title, body: opts.body });
  if (opts.labels.length > 0) params.set('labels', opts.labels.join(','));
  return `${repo}/issues/new?${params.toString()}`;
}
