// @ts-check
import * as fs from 'node:fs';
import { defineConfig } from 'astro/config';
import yaml from 'js-yaml';

// Site URL and base path come from chronicle.config.yaml (the data repo
// overlays its own copy at build time). Validation lives in src/lib/config.ts;
// here we only need the two routing fields.
const config = /** @type {{site?: string, base?: string}} */ (
  fs.existsSync('chronicle.config.yaml')
    ? (yaml.load(fs.readFileSync('chronicle.config.yaml', 'utf8')) ?? {})
    : {}
);

// https://astro.build/config
export default defineConfig({
  site: config.site,
  base: config.base ?? '/',
});
