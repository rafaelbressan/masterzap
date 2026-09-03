import { describe, it, expect } from 'vitest';
import { highlight } from '../../src/lib/highlight.js';

describe('highlight', () => {
  it('never lets the input become markup', () => {
    expect(highlight('<script>alert(1)</script>', 'shell')).not.toContain('<script');
    expect(highlight('a < b', 'json')).toContain('a &lt; b');
  });

  it('colours a shell line: command, flag, string, url', () => {
    const h = highlight(`curl -s https://x.y/api | jq '.a'`, 'shell');
    expect(h).toContain('<span class="hl-command">curl</span>');
    expect(h).toContain('<span class="hl-flag">-s</span>');
    expect(h).toContain('<span class="hl-url">https://x.y/api</span>');
    expect(h).toContain('<span class="hl-command">jq</span>');
    expect(h).toContain(`<span class="hl-string">'.a'</span>`);
  });

  it('colours json keys apart from values', () => {
    const h = highlight('{ "url": "https://x", "n": 3, "ok": true }', 'json');
    expect(h).toContain('<span class="hl-key">"url"</span>');
    expect(h).toContain('<span class="hl-string">"https://x"</span>');
    expect(h).toContain('<span class="hl-number">3</span>');
    expect(h).toContain('<span class="hl-keyword">true</span>');
  });

  it('does not recolour inside an earlier span', () => {
    const h = highlight(`echo "curl -s"`, 'shell');
    expect(h.match(/hl-command/g) || []).toHaveLength(0);
    expect(h).toContain('<span class="hl-string">"curl -s"</span>');
  });

  it('leaves plain text alone', () => {
    expect(highlight('O que Vorcaro escreveu?', 'text')).toBe('O que Vorcaro escreveu?');
  });
});
