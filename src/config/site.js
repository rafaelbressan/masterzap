/**
 * The site's public address, in one place.
 *
 * Canonical links, Open Graph, the JSON-LD, the sitemap, robots.txt, llms.txt,
 * every citation the build writes and the address printed under a screenshot
 * all read this value. Change the domain here (or with SITE_URL) and nothing
 * else.
 *
 * Resolution, first match wins:
 *   1. SITE_URL in the build environment;
 *   2. on Vercel, VERCEL_PROJECT_PRODUCTION_URL — the project's production
 *      domain, which Vercel sets on every build, previews included;
 *   3. DEFAULT_SITE_URL.
 *
 * In the browser the value was fixed at build time (vite.config.js defines
 * __SITE_URL__); in Node scripts it is read from the environment directly.
 */

export const DEFAULT_SITE_URL = 'https://www.masterwhats.com.br';

/** The address for a given environment, without a trailing slash. */
export function siteUrlFrom(env = {}) {
  let url = env.SITE_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : DEFAULT_SITE_URL);
  if (!/^https?:\/\//.test(url)) url = `https://${url}`;
  return url.replace(/\/+$/, '');
}

/* global __SITE_URL__, process */
export const SITE_URL = typeof __SITE_URL__ !== 'undefined'
  ? __SITE_URL__
  : siteUrlFrom(typeof process !== 'undefined' ? process.env : {});

/** "www.masterwhats.com.br" — the address as a person types it. */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');

/** The placeholder index.html and public/*.txt carry; the build swaps it. */
export const SITE_URL_PLACEHOLDER = '%SITE_URL%';
