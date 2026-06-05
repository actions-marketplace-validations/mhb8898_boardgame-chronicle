import * as fs from 'node:fs';
import yaml from 'js-yaml';
import { z } from 'zod';

/** Site-level settings, supplied by the data repo's chronicle.config.yaml. */
export const ConfigSchema = z.strictObject({
  title: z.string().default('Boardgame Chronicle'),
  /** e.g. https://username.github.io */
  site: z.string().optional(),
  /** e.g. /gamelog */
  base: z.string().optional(),
  /** Linked in the footer. */
  repoUrl: z.string().optional(),
  /**
   * Repo whose Issues the "Log a play" form targets. Setting this in a data
   * repo's config is what enables the /log page; without it the form is off.
   */
  dataRepoUrl: z.string().optional(),
});

export type ChronicleConfig = z.infer<typeof ConfigSchema>;

export const CONFIG_FILE = 'chronicle.config.yaml';

export function readConfig(filePath: string = CONFIG_FILE): ChronicleConfig {
  const raw = fs.existsSync(filePath) ? yaml.load(fs.readFileSync(filePath, 'utf8')) : {};
  const result = ConfigSchema.safeParse(raw ?? {});
  if (!result.success) {
    const details = result.error.issues
      .map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message))
      .join('; ');
    throw new Error(`${CONFIG_FILE}: ${details}`);
  }
  return result.data;
}
