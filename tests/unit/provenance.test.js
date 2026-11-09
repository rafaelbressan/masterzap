import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SEALS, SEAL_ICONS, setSources, sealToMark, provenanceOf, sealDescription, conversationSealLine } from '../../src/lib/provenance.js';

const ROOT = join(import.meta.dirname, '../..');

describe('sealToMark', () => {
  const verified = { source_id: 'pf', verification: 'verificado' };
  const press = { source_id: 'jornal', verification: 'imprensa' };
  const unverified = { source_id: 'print', verification: 'nao-verificado' };

  it('leaves a message alone when it carries its conversation\'s strong seal', () => {
    expect(sealToMark({}, verified)).toBeNull();
    expect(sealToMark({}, press)).toBeNull();
  });

  it('marks a message whose seal differs from the conversation\'s, either way', () => {
    expect(sealToMark({ verification: 'imprensa' }, verified)).toBe('imprensa');
    expect(sealToMark({ verification: 'verificado' }, press)).toBe('verificado');
  });

  it('always marks weak seals, even as the default', () => {
    expect(sealToMark({}, unverified)).toBe('nao-verificado');
    expect(sealToMark({ verification: 'reconstruido' }, verified)).toBe('reconstruido');
  });

  it('ignores a seal it does not know', () => {
    expect(sealToMark({ verification: 'talvez' }, verified)).toBeNull();
  });

  it('has a label, an explanation and an icon for every seal', () => {
    for (const [key, seal] of Object.entries(SEALS)) {
      expect(seal.label, key).toBeTruthy();
      expect(seal.explanation, key).toMatch(/\.$/);
      expect(SEAL_ICONS[key], key).toMatch(/^<svg/);
    }
  });
});

describe('provenance text', () => {
  beforeEach(() => setSources({
    pf: { titulo: 'IPJ-A nº 1/2026 — NADIP/PF', orgao_ou_veiculo: 'Polícia Federal' },
  }));

  it('resolves a message to its own source, else the conversation\'s', () => {
    const conv = { source_id: 'pf', verification: 'verificado' };
    expect(provenanceOf({}, conv)).toEqual({ sourceId: 'pf', verification: 'verificado' });
    expect(provenanceOf({ source_id: 'x', verification: 'imprensa' }, conv)).toEqual({ sourceId: 'x', verification: 'imprensa' });
  });

  it('says the seal with a colon, for screen readers', () => {
    expect(sealDescription('nao-verificado', null)).toMatch(/^Não verificado: /);
  });

  it('names the source, its organ and seal, and counts the exceptions', () => {
    const conv = { source_id: 'pf', verification: 'verificado', verification_counts: { verificado: 10, imprensa: 4 } };
    expect(conversationSealLine(conv)).toBe('Fonte: IPJ-A nº 1/2026 (Polícia Federal) · Verificado · 4 mensagens marcadas como Imprensa');
    expect(conversationSealLine({ ...conv, verification_counts: { imprensa: 1 } })).toMatch(/1 mensagem marcada como Imprensa$/);
  });
});

describe('conversations.json provenance', () => {
  const data = JSON.parse(readFileSync(join(ROOT, 'public/data/conversations.json'), 'utf-8'));
  const registry = new Set(JSON.parse(readFileSync(join(ROOT, 'data/sources.json'), 'utf-8')).sources.map(s => s.id));

  it('gives every conversation a registered source and a known seal', () => {
    for (const conv of data.conversations) {
      expect(registry.has(conv.source_id), conv.id).toBe(true);
      expect(data.sources[conv.source_id], conv.id).toBeTruthy();
      expect(Object.keys(SEALS), conv.id).toContain(conv.verification);
    }
  });

  it('marks the police report verified and the leak as press', () => {
    const byId = Object.fromEntries(data.conversations.map(c => [c.id, c]));
    expect(byId['alexandre-de-moraes'].verification).toBe('verificado');
    expect(byId['martha-graeff'].verification).toBe('imprensa');
  });
});
