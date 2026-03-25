// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// We'll test the data-store module once it exists (Batch 3).
// For now, test the data chunking output structure by reading generated files.

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(import.meta.dirname, '../../public/data');

describe('split_data output', () => {
  it('conversations.json exists and has correct structure', () => {
    const path = join(DATA_DIR, 'conversations.json');
    expect(existsSync(path)).toBe(true);

    const data = JSON.parse(readFileSync(path, 'utf-8'));
    expect(data).toHaveProperty('conversations');
    expect(Array.isArray(data.conversations)).toBe(true);
    expect(data.conversations.length).toBeGreaterThan(0);

    const conv = data.conversations[0];
    expect(conv).toHaveProperty('id', 'martha-graeff');
    expect(conv).toHaveProperty('participants');
    expect(conv).toHaveProperty('date_range');
    expect(conv).toHaveProperty('total_messages');
    expect(conv).toHaveProperty('last_message');
    expect(conv.total_messages).toBe(65772);
  });

  it('martha-graeff/index.json exists with dates array', () => {
    const path = join(DATA_DIR, 'martha-graeff/index.json');
    expect(existsSync(path)).toBe(true);

    const data = JSON.parse(readFileSync(path, 'utf-8'));
    expect(data).toHaveProperty('dates');
    expect(Array.isArray(data.dates)).toBe(true);
    expect(data.dates.length).toBe(534);
  });

  it('martha-graeff/search-index.json exists with entries', () => {
    const path = join(DATA_DIR, 'martha-graeff/search-index.json');
    expect(existsSync(path)).toBe(true);

    const data = JSON.parse(readFileSync(path, 'utf-8'));
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    const entry = data[0];
    expect(entry).toHaveProperty('id');
    expect(entry).toHaveProperty('date');
    expect(entry).toHaveProperty('sender');
    expect(entry).toHaveProperty('content');
    expect(entry.content.length).toBeLessThanOrEqual(80);
  });

  it('per-date chunk files exist for first and last dates', () => {
    const first = join(DATA_DIR, 'martha-graeff/2024-02-10.json');
    const last = join(DATA_DIR, 'martha-graeff/2025-08-13.json');
    expect(existsSync(first)).toBe(true);
    expect(existsSync(last)).toBe(true);

    const firstData = JSON.parse(readFileSync(first, 'utf-8'));
    expect(firstData).toHaveProperty('messages');
    expect(Array.isArray(firstData.messages)).toBe(true);
    expect(firstData.messages.length).toBe(82);

    const lastData = JSON.parse(readFileSync(last, 'utf-8'));
    expect(lastData.messages.length).toBeGreaterThan(0);
  });

  it('each date chunk has valid message structure', () => {
    const path = join(DATA_DIR, 'martha-graeff/2024-02-10.json');
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    const msg = data.messages[0];

    expect(msg).toHaveProperty('id');
    expect(msg).toHaveProperty('timestamp');
    expect(msg).toHaveProperty('date');
    expect(msg).toHaveProperty('time');
    expect(msg).toHaveProperty('sender');
    expect(msg).toHaveProperty('content');
    expect(msg).toHaveProperty('type');
    expect(msg).toHaveProperty('is_edited');
    expect(msg).toHaveProperty('attachment');
    expect(msg).toHaveProperty('urls');
  });

  it('has the correct number of date chunk files', () => {
    const dir = join(DATA_DIR, 'martha-graeff');
    const files = readdirSync(dir).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f));
    expect(files.length).toBe(534);
  });
});
