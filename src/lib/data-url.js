/**
 * Every request for /data/ goes through here, with the build's id as `?v=`.
 *
 * The files under /data/ are served `immutable` for a year (vercel.json). That
 * is right for a given build and wrong across builds: a browser that kept last
 * week's conversations.json, index.json or a day chunk would mix it with this
 * week's site — the index naming days the chunks no longer have, a search hit
 * pointing at a message that moved. A new build is a new `v`, so a new URL, so
 * a fresh copy; within a build the cache stays as long as it likes.
 *
 * __DATA_BUILD_ID__ comes from vite.config.js: the commit on Vercel, a
 * timestamp elsewhere.
 */
// eslint-disable-next-line no-undef
const DATA_BUILD_ID = typeof __DATA_BUILD_ID__ !== 'undefined' ? __DATA_BUILD_ID__ : 'dev';

export function dataUrl(path) {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}v=${encodeURIComponent(DATA_BUILD_ID)}`;
}
