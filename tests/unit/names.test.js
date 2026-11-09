// @vitest-environment node
//
// The name the whole site is about, spelled right everywhere it is typed by
// hand. ("Daniel Vocaro" went out in every shared quote for months.)

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '../..');

function filesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? filesUnder(join(dir, e.name)) : [join(dir, e.name)]);
}

describe('Vorcaro', () => {
  it('is never misspelled in the app, the scripts or the hand-written pages', () => {
    const files = [...filesUnder(join(ROOT, 'src')), ...filesUnder(join(ROOT, 'scripts')),
      join(ROOT, 'index.html'), join(ROOT, 'public/llms.txt')].filter(f => /\.(m?js|py|html|txt)$/.test(f));
    const typos = files.filter(f => /\bVocaro\b|\bVorcarro\b|\bVorcaru\b/.test(readFileSync(f, 'utf-8')));
    expect(typos).toEqual([]);
  });
});
