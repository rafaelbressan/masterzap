// @vitest-environment node
//
// Guards on the export the build writes to public/export. The files are what a
// reader, a script or a model gets without the app in between, so what matters
// is that each one stands on its own: says where it came from, keeps every
// message, and leaves nothing that only makes sense inside the site.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import JSZip from 'jszip';

const ROOT = join(import.meta.dirname, '../..');
const DATA_DIR = join(ROOT, 'public/data');
const EXPORT_DIR = join(ROOT, 'public/export');
// The consolidated files are published as a GitHub Release, not served by the site.
const RELEASE_DIR = join(ROOT, 'release');

const conversations = JSON.parse(
  readFileSync(join(DATA_DIR, 'conversations.json'), 'utf-8')
).conversations;

const md = (id) => readFileSync(join(EXPORT_DIR, `masterwhats-${id}.md`), 'utf-8');
const json = (id) => JSON.parse(readFileSync(join(EXPORT_DIR, `masterwhats-${id}.json`), 'utf-8'));

describe('one pair of files per conversation', () => {
  it('writes a .md and a .json for every conversation the site lists', () => {
    for (const conv of conversations) {
      expect(existsSync(join(EXPORT_DIR, `masterwhats-${conv.id}.md`)), conv.id).toBe(true);
      expect(existsSync(join(EXPORT_DIR, `masterwhats-${conv.id}.json`)), conv.id).toBe(true);
    }
  });
});

describe('the JSON', () => {
  it('keeps every message', () => {
    for (const conv of conversations) {
      expect(json(conv.id).messages.length, conv.id).toBe(conv.total_messages);
    }
  });

  it('stamps every timestamp with its UTC offset', () => {
    for (const conv of conversations) {
      for (const msg of json(conv.id).messages) {
        expect(msg.timestamp, `${conv.id} #${msg.id}`).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-03:00$/);
      }
    }
  });

  it('says where it came from', () => {
    for (const conv of conversations) {
      const { export: meta, conversation } = json(conv.id);
      expect(meta.site).toBe('https://www.masterwhats.com.br');
      expect(meta.timezone).toBe('America/Sao_Paulo');
      expect(conversation.id).toBe(conv.id);
      expect(conversation.source, conv.id).toBeTruthy();
    }
  });

  it('keeps the page and figure of the police report on every message that has one', () => {
    const fromReport = conversations.filter(c => c.source?.startsWith('IPJ-A'));
    expect(fromReport.length).toBeGreaterThan(0);
    for (const conv of fromReport) {
      for (const msg of json(conv.id).messages) {
        expect(msg.source_page, `${conv.id} #${msg.id}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('the Markdown', () => {
  it('opens with a provenance block, and the legal notice', () => {
    for (const conv of conversations) {
      const text = md(conv.id);
      expect(text, conv.id).toMatch(/^# /);
      expect(text, conv.id).toContain('não atesta a veracidade');
      expect(text, conv.id).toContain('## Proveniência');
      expect(text, conv.id).toContain('| Fonte |');
      expect(text, conv.id).toContain('| Fuso dos horários | America/Sao_Paulo');
    }
  });

  it('carries the contact profile with its sources, as links', () => {
    const text = md('alexandre-de-moraes');
    expect(text).toContain('## Quem é Alexandre de Moraes');
    expect(text).toMatch(/\[[^\]]+\]\(https?:\/\/[^)]+\)/);
    expect(text).toContain('## Fontes');
  });

  it('leaves no site-only markup behind', () => {
    for (const conv of conversations) {
      const text = md(conv.id);
      expect(text, `${conv.id} has raw {text}[url]`).not.toMatch(/\{[^}]+\}\[[^\]]+\]/);
      expect(text, `${conv.id} has action: link`).not.toContain('[action:');
      expect(text, `${conv.id} has action: link`).not.toContain('profile-action-link');
      expect(text, `${conv.id} has html`).not.toMatch(/<(a|span|div) /);
    }
  });

  // A quote in the profile is a citation now: it links the message and says
  // when it was sent and where in the report it is.
  it('turns every highlight into a link with date and page', () => {
    const text = md('alexandre-de-moraes');
    expect(text).toContain('](https://www.masterwhats.com.br/chat/alexandre-de-moraes#msg-');
    expect(text).toMatch(/⟨\d{2}\/\d{2}\/\d{4} \d{2}:\d{2} · laudo p\. \d+, fig\. \d+⟩/);
    expect(text).toContain('218 páginas');
    expect(text).toContain('[no repositório](https://github.com/rafaelbressan/masterzap/blob/main/data/source/');
  });

  it('cites the page of the report on every message from it', () => {
    const text = md('alexandre-de-moraes');
    const headers = text.split('\n').filter(l => /^\*\*.+\*\* · \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} · msg \d+/.test(l));
    expect(headers.length).toBe(62);
    for (const line of headers) expect(line).toMatch(/laudo p\. \d+/);
  });

  it('keeps every message', () => {
    for (const conv of conversations) {
      const headers = md(conv.id).split('\n').filter(l => /^\*\*.+\*\* · \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} · msg \d+/.test(l));
      expect(headers.length, conv.id).toBe(conv.total_messages);
    }
  });
});

describe('the big conversation, one month at a time', () => {
  it('writes a Markdown and a JSON per month, each saying what it is', () => {
    const md = readFileSync(join(EXPORT_DIR, 'masterwhats-martha-graeff-2024-12.md'), 'utf-8');
    expect(md).toMatch(/^# Daniel Vorcaro ↔ Martha Graeff — dezembro de 2024/);
    expect(md).toContain('· msg 35686');
    expect(md).toContain('(de 65772 na conversa)');
    const lines = md.split('\n').filter(l => /^\*\*.+\*\* · (\d{4}-\d{2})-\d{2} /.test(l));
    expect(new Set(lines.map(l => l.match(/· (\d{4}-\d{2})-/)[1]))).toEqual(new Set(['2024-12']));
    const j = JSON.parse(readFileSync(join(EXPORT_DIR, 'masterwhats-martha-graeff-2024-12.json'), 'utf-8'));
    expect(j.month).toBe('2024-12');
    expect(j.messages.length).toBe(lines.length);
  });

  it('does not split the small ones', () => {
    expect(existsSync(join(EXPORT_DIR, 'masterwhats-ciro-soares-2025-03.md'))).toBe(false);
  });
});

describe('everything at once', () => {
  it('writes one Markdown with every conversation in it', () => {
    const text = readFileSync(join(RELEASE_DIR, 'masterwhats.md'), 'utf-8');
    for (const conv of conversations) {
      expect(text, conv.id).toContain(`(#${conv.id})`);
    }
    expect(text).toContain('## Sobre o projeto');
  });

  it('writes one JSON with every conversation in it', () => {
    const all = JSON.parse(readFileSync(join(RELEASE_DIR, 'masterwhats.json'), 'utf-8'));
    expect(all.conversations.map(c => c.conversation.id).sort())
      .toEqual(conversations.map(c => c.id).sort());
  });

  it('keeps the big files out of the site', () => {
    for (const name of ['masterwhats.md', 'masterwhats.json', 'masterwhats-export.zip']) {
      expect(existsSync(join(EXPORT_DIR, name)), name).toBe(false);
    }
  });

  it('zips the pairs, with a README on top', async () => {
    const path = join(RELEASE_DIR, 'masterwhats-export.zip');
    expect(statSync(path).size).toBeGreaterThan(100_000);
    const zip = await JSZip.loadAsync(readFileSync(path));
    const names = Object.keys(zip.files);
    expect(names).toContain('README.md');
    for (const conv of conversations) {
      expect(names, conv.id).toContain(`masterwhats-${conv.id}.md`);
      expect(names, conv.id).toContain(`masterwhats-${conv.id}.json`);
    }
  });
});
