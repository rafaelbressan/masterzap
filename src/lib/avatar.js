/**
 * Default contact avatars — the coloured monogram WhatsApp shows when a contact
 * has no photo: a solid circle with a lighter person glyph centred in it.
 *
 * The colour is picked deterministically from the conversation id, so a contact
 * keeps the same avatar across reloads and rebuilds.
 *
 * Palette: the first four pairs were sampled from a WhatsApp screenshot; the
 * rest follow the same construction (a dark, desaturated ground with a light,
 * high-key figure of the same hue). Swap in the real design-system values if
 * they ever turn up.
 */

const PALETTE = [
  { bg: '#235655', fg: '#BCE9E6' }, // teal      (amostrado)
  { bg: '#5E1C2F', fg: '#F09FAB' }, // bordô     (amostrado)
  { bg: '#204F7D', fg: '#AFDBFA' }, // azul      (amostrado)
  { bg: '#2F613E', fg: '#99E796' }, // verde     (amostrado)
  { bg: '#4A2E6B', fg: '#D6BDF2' }, // roxo
  { bg: '#7A3F1C', fg: '#F5C39A' }, // laranja
  { bg: '#2B3A6B', fg: '#B4C2F0' }, // índigo
  { bg: '#4F5820', fg: '#DCE7A0' }, // oliva
  { bg: '#5C2350', fg: '#EBB0DE' }, // ameixa
  { bg: '#2E4A52', fg: '#ADD3DC' }, // ardósia
];

/**
 * The Material "person" glyph, in its own 24×24 coordinate space.
 * Measured against the reference: body width ≈ 30% of the circle diameter and
 * body/head width ≈ 1.96, which is exactly this glyph's proportion.
 */
const PERSON_PATH = 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z';

// Maps the 24-unit glyph into the 212-unit avatar box: scaled to ~30% of the
// diameter and sitting a touch above centre, the way WhatsApp positions it.
const GLYPH_TRANSFORM = 'translate(58.3 51.3) scale(3.975)';

/**
 * Stable index into the palette. FNV-1a rather than the usual `hash * 31 + c`:
 * with a ten-colour palette, 31 ≡ 1 (mod 10) collapses that hash to a plain sum
 * of char codes, and ids as alike as ours then bunch onto the same few colours.
 * FNV's prime mixes the low bits properly and spreads them out.
 *
 * Not a security hash — it only has to be deterministic across runs.
 * @param {string} seed
 */
function paletteFor(seed) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

/**
 * Build the default avatar for a contact with no photograph.
 *
 * @param {string} seed - conversation id, so the colour is stable per contact
 * @param {number} [size] - rendered px size; omitted means "fill the container"
 * @returns {string} an SVG string, safe to assign with innerHTML (no user data)
 */
export function defaultAvatarSvg(seed, size) {
  const { bg, fg } = paletteFor(seed || '');
  const dimensions = size ? ` width="${size}" height="${size}"` : '';
  return `<svg viewBox="0 0 212 212"${dimensions} role="img" aria-hidden="true">` +
    `<circle cx="106" cy="106" r="106" fill="${bg}"/>` +
    `<path d="${PERSON_PATH}" fill="${fg}" transform="${GLYPH_TRANSFORM}"/>` +
    `</svg>`;
}

/**
 * The Material "group" glyph (two people, one ahead), as WhatsApp's default
 * group photo draws it, in its own 24×24 space.
 */
const GROUP_PATH = 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z';

// Wider than the person, so a little smaller, centred a touch above the middle
// as the person is.
const GROUP_TRANSFORM = 'translate(60.4 56.2) scale(3.8)';

/**
 * The default photo of a group: the contacts' coloured circle with the group
 * glyph — WhatsApp's current style, not the grey one of old.
 *
 * @param {string} seed - the group's conversation id
 * @param {number} [size]
 */
export function defaultGroupAvatarSvg(seed, size) {
  const { bg, fg } = paletteFor(seed || '');
  const dimensions = size ? ` width="${size}" height="${size}"` : '';
  return `<svg viewBox="0 0 212 212"${dimensions} role="img" aria-hidden="true">` +
    `<circle cx="106" cy="106" r="106" fill="${bg}"/>` +
    `<path d="${GROUP_PATH}" fill="${fg}" transform="${GROUP_TRANSFORM}"/>` +
    `</svg>`;
}

/**
 * The colour of a participant's name in a group, from the palette of their
 * default photo so name and photo match: the circle's colour on a light
 * bubble, the figure's on a dark one.
 * @param {string} seed - the same seed as their avatar
 * @returns {{ light: string, dark: string }}
 */
export function senderColors(seed) {
  const { bg, fg } = paletteFor(seed || '');
  return { light: bg, dark: fg };
}

export { PALETTE as AVATAR_PALETTE };
