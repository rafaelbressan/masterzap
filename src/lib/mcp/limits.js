/**
 * Who gets how much of the MCP, so that no one client can spend the site's
 * day. Three counters, all in memory:
 *
 *   per client, per minute  — a loop or a stuck retry
 *   per client, per day     — distribution: ~1% of the Hobby day each
 *   everyone, per day       — the ceiling before Vercel would pause the site
 *
 * In-memory means per instance: a cold start forgets, and two instances count
 * apart. The limits are therefore "at least this strict", never looser than
 * that in the direction that matters — a client cannot exceed them on any one
 * instance, and Fluid Compute keeps few instances warm.
 */

const MINUTE = 60_000;

export function createLimiter({ perMinute, perDay, globalPerDay, now = () => Date.now() } = {}) {
  const minutes = new Map();   // client → { windowStart, count }
  const days = new Map();      // client → { day, count }
  let global = { day: null, count: 0 };

  const dayOf = (t) => new Date(t).toISOString().slice(0, 10);
  const secondsToMidnight = (t) => Math.ceil((Date.UTC(...[new Date(t).getUTCFullYear(), new Date(t).getUTCMonth(), new Date(t).getUTCDate() + 1]) - t) / 1000);

  /**
   * @returns {{ ok: true } | { ok: false, reason: string, retryAfter: number }}
   */
  function check(client) {
    const t = now();
    const day = dayOf(t);

    if (global.day !== day) global = { day, count: 0 };
    if (global.count >= globalPerDay) {
      return { ok: false, reason: 'global', retryAfter: secondsToMidnight(t) };
    }

    const d = days.get(client);
    const dayCount = d && d.day === day ? d.count : 0;
    if (dayCount >= perDay) {
      return { ok: false, reason: 'day', retryAfter: secondsToMidnight(t) };
    }

    const m = minutes.get(client);
    const inWindow = m && t - m.windowStart < MINUTE;
    const minuteCount = inWindow ? m.count : 0;
    if (minuteCount >= perMinute) {
      return { ok: false, reason: 'minute', retryAfter: Math.ceil((m.windowStart + MINUTE - t) / 1000) };
    }

    minutes.set(client, { windowStart: inWindow ? m.windowStart : t, count: minuteCount + 1 });
    days.set(client, { day, count: dayCount + 1 });
    global.count += 1;

    // Keep the maps from growing forever on a long-lived instance.
    if (minutes.size > 5000) for (const [k, v] of minutes) if (t - v.windowStart >= MINUTE) minutes.delete(k);
    if (days.size > 20000) for (const [k, v] of days) if (v.day !== day) days.delete(k);

    return { ok: true, remainingToday: perDay - dayCount - 1 };
  }

  return { check };
}

/** The client's address as Vercel reports it, or a stand-in. */
export function clientOf(request) {
  const h = request.headers;
  return h.get('x-real-ip') || h.get('x-forwarded-for')?.split(',')[0].trim() || 'anon';
}
