import { describe, expect, test } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { readConfig } from './config';

describe('readConfig', () => {
  test('returns defaults when the file is missing', () => {
    const cfg = readConfig(path.join(os.tmpdir(), 'nope', 'chronicle.config.yaml'));
    expect(cfg.title).toBe('Boardgame Chronicle');
    expect(cfg.site).toBeUndefined();
    expect(cfg.base).toBeUndefined();
  });

  test('reads values from a config file', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chronicle-cfg-'));
    const file = path.join(dir, 'chronicle.config.yaml');
    fs.writeFileSync(
      file,
      [
        'title: RBR Game Log',
        'site: https://example.github.io',
        'base: /gamelog',
        'repoUrl: https://github.com/example/gamelog',
      ].join('\n'),
    );
    expect(readConfig(file)).toEqual({
      title: 'RBR Game Log',
      site: 'https://example.github.io',
      base: '/gamelog',
      repoUrl: 'https://github.com/example/gamelog',
    });
  });

  test('rejects unknown keys with a clear error', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chronicle-cfg-'));
    const file = path.join(dir, 'chronicle.config.yaml');
    fs.writeFileSync(file, 'titel: oops');
    expect(() => readConfig(file)).toThrowError(/chronicle\.config\.yaml/);
  });
});
