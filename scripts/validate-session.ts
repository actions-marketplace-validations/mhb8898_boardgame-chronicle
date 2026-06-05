/**
 * Validate a candidate session YAML (from a "Log a play" issue) against a data
 * directory, using the exact same schema + cross-reference checks as the build.
 *
 * CLI: tsx scripts/validate-session.ts --yaml-file <path> [--data-dir data]
 * Prints a `===RESULT===` line followed by JSON for the workflow to consume.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { SessionSchema } from '../src/lib/schema';
import { loadChronicle, ChronicleError, type Chronicle } from '../src/lib/load';
import { sessionFileStem } from '../src/lib/log-session';

export interface ValidationResult {
  ok: boolean;
  /** Collision-safe target filename inside data/sessions/, e.g. 2026-06-10-azul.yaml */
  filename?: string;
  /** Human-readable summary with resolved names, for the issue comment. */
  preview?: string;
  error?: string;
}

function buildPreview(chronicle: Chronicle, sessionId: string): string {
  const s = chronicle.sessions.find((x) => x.id === sessionId)!;
  const game = chronicle.games.find((g) => g.id === s.game)!;
  const group = chronicle.groups.find((g) => g.id === s.group)!;
  const playerName = (id: string) => chronicle.players.find((p) => p.id === id)?.name ?? id;
  const factionName = (id: string) => game.factions?.find((f) => f.id === id)?.name ?? id;

  const players = s.players
    .map((p) => {
      const bits = [`${p.winner ? '🏆 ' : ''}${playerName(p.player)}`];
      if (p.faction) bits.push(`as ${factionName(p.faction)}`);
      if (p.score !== undefined) bits.push(`(${p.score})`);
      return bits.join(' ');
    })
    .join(' · ');

  const lines = [`${s.date} · ${game.name} · ${group.name}`, players];
  if (s.location) lines.push(`📍 ${s.location}`);
  if (s.notes) lines.push(`📝 ${s.notes}`);
  return lines.join('\n');
}

export function validateSession(yamlText: string, dataDir: string): ValidationResult {
  let raw: unknown;
  try {
    raw = yaml.load(yamlText);
  } catch (e) {
    return { ok: false, error: `invalid YAML: ${(e as Error).message}` };
  }

  const parsed = SessionSchema.safeParse(raw);
  if (!parsed.success) {
    const error = parsed.error.issues
      .map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message))
      .join('; ');
    return { ok: false, error };
  }

  const sessionsDir = path.join(dataDir, 'sessions');
  fs.mkdirSync(sessionsDir, { recursive: true });
  const stem = sessionFileStem(parsed.data);
  let filename = `${stem}.yaml`;
  for (let n = 2; fs.existsSync(path.join(sessionsDir, filename)); n++) {
    filename = `${stem}-${n}.yaml`;
  }

  // Write the candidate into the (throwaway) data dir so loadChronicle runs the
  // exact cross-reference validation the build would.
  const candidate = path.join(sessionsDir, filename);
  fs.writeFileSync(candidate, yamlText);
  try {
    const chronicle = loadChronicle(dataDir);
    return { ok: true, filename, preview: buildPreview(chronicle, filename.replace(/\.yaml$/, '')) };
  } catch (e) {
    fs.rmSync(candidate);
    if (e instanceof ChronicleError) return { ok: false, error: e.message };
    throw e;
  }
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const args = process.argv.slice(2);
  const opt = (name: string) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const yamlFile = opt('--yaml-file');
  const dataDir = opt('--data-dir') ?? 'data';
  if (!yamlFile) {
    console.error('usage: validate-session --yaml-file <path> [--data-dir data]');
    process.exit(2);
  }
  const result = validateSession(fs.readFileSync(yamlFile, 'utf8'), dataDir);
  console.log('===RESULT===');
  console.log(JSON.stringify(result));
  process.exit(result.ok ? 0 : 1);
}
