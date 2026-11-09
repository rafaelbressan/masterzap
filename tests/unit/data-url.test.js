import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { dataUrl } from '../../src/lib/data-url.js';

const ROOT = join(import.meta.dirname, '../..');

describe('dataUrl', () => {
  it('stamps the build id on the path', () => {
    expect(dataUrl('/data/conversations.json')).toMatch(/^\/data\/conversations\.json\?v=[\w%-]+$/);
  });

  it('adds to a query string that is already there', () => {
    expect(dataUrl('/data/x.json?a=1')).toMatch(/^\/data\/x\.json\?a=1&v=/);
  });

  it('is the only way the app fetches /data/', () => {
    // /data/ is cached immutable; an unversioned fetch would stick for a year.
    const offenders = [];
    const walk = (dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (path.endsWith('.js')) {
          for (const line of readFileSync(path, 'utf-8').split('\n')) {
            if (/fetch\(/.test(line) && !/dataUrl\(|_fetcher\(/.test(line) && /data/.test(line)) offenders.push(`${path}: ${line.trim()}`);
          }
        }
      }
    };
    walk(join(ROOT, 'src'));
    expect(offenders).toEqual([]);
  });
});
