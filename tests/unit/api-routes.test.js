// @vitest-environment node
//
// The API is a table of rewrites to files the build writes. This holds
// vercel.json to the table, and the table to the built site: a route that
// points at nothing, or a rewrite that drifted from the table, fails here
// rather than in someone's script.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { API_ROUTES, API_BASE, resolve, fill, vercelRewrites, apiUrl } from '../../src/lib/api-routes.js';

const ROOT = join(import.meta.dirname, '../..');
const DIST = join(ROOT, 'dist');
const vercel = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf-8'));

describe('vercel.json', () => {
  it('rewrites exactly what the table says, before the catch-all', () => {
    const api = vercel.rewrites.filter(r => r.source.startsWith(API_BASE + '/'));
    expect(api).toEqual(vercelRewrites());
    const last = vercel.rewrites[vercel.rewrites.length - 1];
    expect(last.source).toBe('/(.*)');
  });

  it('opens the data to other origins', () => {
    for (const source of ['/api/v1/(.*)', '/data/(.*)', '/export/(.*)']) {
      const h = vercel.headers.find(x => x.source === source);
      expect(h, source).toBeTruthy();
      expect(h.headers.find(x => x.key === 'Access-Control-Allow-Origin')?.value).toBe('*');
    }
  });
});

describe('every route', () => {
  it('has an example that resolves to a file the build wrote', () => {
    for (const r of API_ROUTES) {
      const hit = resolve(API_BASE + r.example);
      expect(hit, r.route).toBeTruthy();
      expect(hit.route).toBe(r);
      expect(existsSync(join(DIST, hit.file)), `${r.example} → ${hit.file}`).toBe(true);
    }
  });

  it('resolves and fills placeholders the same way', () => {
    const hit = resolve('/api/v1/conversations/ciro-soares/days/2024-04-14');
    expect(hit.params).toEqual({ id: 'ciro-soares', date: '2024-04-14' });
    expect(hit.file).toBe('/data/ciro-soares/2024-04-14.json');
    expect(fill('/x/:id', { id: 'a b' })).toBe('/x/a%20b');
    expect(apiUrl('/calls')).toBe('https://www.masterwhats.com.br/api/v1/calls');
  });

  it('does not match what it does not know', () => {
    expect(resolve('/api/v1/nope')).toBeNull();
    expect(resolve('/api/v2/conversations')).toBeNull();
    expect(resolve('/data/conversations.json')).toBeNull();
  });
});
