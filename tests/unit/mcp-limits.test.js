import { describe, it, expect } from 'vitest';
import { createLimiter, clientOf } from '../../src/lib/mcp/limits.js';

const T0 = Date.UTC(2026, 8, 3, 12, 0, 0);
const make = (over = {}) => {
  let t = T0;
  const limiter = createLimiter({ perMinute: 3, perDay: 5, globalPerDay: 8, now: () => t, ...over });
  return { limiter, tick: (ms) => { t += ms; } };
};

describe('per minute', () => {
  it('lets a burst through, then stops it, then lets it through again', () => {
    const { limiter, tick } = make();
    expect(limiter.check('a').ok).toBe(true);
    expect(limiter.check('a').ok).toBe(true);
    expect(limiter.check('a').ok).toBe(true);
    const stop = limiter.check('a');
    expect(stop).toMatchObject({ ok: false, reason: 'minute' });
    expect(stop.retryAfter).toBeGreaterThan(0);
    tick(61_000);
    expect(limiter.check('a').ok).toBe(true);
  });

  it('counts clients apart', () => {
    const { limiter } = make();
    for (let i = 0; i < 3; i++) limiter.check('a');
    expect(limiter.check('b').ok).toBe(true);
  });
});

describe('per day', () => {
  it('spreads the day: one client cannot spend it', () => {
    const { limiter, tick } = make();
    let ok = 0;
    for (let i = 0; i < 10; i++) { if (limiter.check('a').ok) ok++; tick(61_000); }
    expect(ok).toBe(5);
    expect(limiter.check('a')).toMatchObject({ ok: false, reason: 'day' });
    expect(limiter.check('b').ok).toBe(true);
  });

  it('starts over at midnight UTC', () => {
    const { limiter, tick } = make();
    for (let i = 0; i < 5; i++) { limiter.check('a'); tick(61_000); }
    expect(limiter.check('a').ok).toBe(false);
    tick(13 * 3600_000);
    expect(limiter.check('a').ok).toBe(true);
  });
});

describe('the ceiling', () => {
  it('closes for everyone before the site would pause', () => {
    const { limiter, tick } = make();
    let ok = 0;
    for (const c of ['a', 'b', 'c', 'd']) for (let i = 0; i < 3; i++) { if (limiter.check(c).ok) ok++; tick(61_000); }
    expect(ok).toBe(8);
    expect(limiter.check('zz')).toMatchObject({ ok: false, reason: 'global' });
  });
});

describe('who is asking', () => {
  it('reads the address Vercel forwards', () => {
    expect(clientOf(new Request('http://x', { headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' } }))).toBe('1.2.3.4');
    expect(clientOf(new Request('http://x', { headers: { 'x-real-ip': '5.6.7.8' } }))).toBe('5.6.7.8');
    expect(clientOf(new Request('http://x'))).toBe('anon');
  });
});
