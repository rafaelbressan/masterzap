/**
 * The map of a flight: the world drawn by the site (Natural Earth, through
 * world-atlas, served from /assets/maps/), the route as a line from take-off
 * to landing, a ring at each stop and WhatsApp's red pin where it lands.
 * Nothing is asked of a map service: the reader's browser fetches only this
 * site's file, once, when the channel is first opened.
 *
 * The heavy parts (d3-geo, topojson-client, the 740 KB outline) load on
 * first use; the rest of the app never pays for them.
 *
 * Security note: the SVG is built from numbers and from place names the
 * channel's data gives, which go in through escapeXml.
 */

let worldPromise = null;

/** The outline of the world and the projection tools, loaded once. */
export function loadWorld() {
  worldPromise ??= Promise.all([
    import('d3-geo'),
    import('topojson-client'),
    fetch('/assets/maps/world-50m.json').then(r => {
      if (!r.ok) throw new Error(`mapa: ${r.status}`);
      return r.json();
    }),
  ]).then(([geo, topo, atlas]) => ({
    geo,
    land: topo.feature(atlas, atlas.objects.land),
    borders: topo.mesh(atlas, atlas.objects.countries, (a, b) => a !== b),
  })).catch((err) => {
    worldPromise = null; // a later open may try again
    throw err;
  });
  return worldPromise;
}

const escapeXml = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** "Brasília · 15h36" — a stop as the map labels it. */
export const stopLabel = (leg) => (leg.time ? `${leg.place} · ${leg.time.replace(':', 'h')}` : leg.place);

/**
 * Draw a flight into an <svg>.
 * @param {SVGElement} svg
 * @param {{ legs: {place: string, lat: number, lng: number, time?: string}[], mode: 'route'|'places'|'none' }} flight
 * @param {{ width: number, height: number, large?: boolean, bottomInset?: number }} size
 *   `bottomInset`: the height a sheet covers at the bottom (a phone), kept clear of the route
 */
export function drawFlight(svg, world, flight, { width, height, large = false, bottomInset = 0 }) {
  const { geo, land, borders } = world;
  const points = flight.legs.map(l => [l.lng, l.lat]);
  // Frame the stops with room around them; a short hop still shows its region.
  const lngs = points.map(p => p[0]);
  const lats = points.map(p => p[1]);
  const span = (Math.max(...lngs) - Math.min(...lngs)) + (Math.max(...lats) - Math.min(...lats));
  const pad = span < 15 ? 7 : 5;
  const frame = { type: 'MultiPoint', coordinates: points.flatMap(([x, y]) => [[x - pad, y - pad * 0.6], [x + pad, y + pad * 0.6]]) };
  const margin = large ? 60 : 18;
  const projection = geo.geoMercator().fitExtent(
    [[margin, large ? 60 : 22], [width - margin, Math.max(height - bottomInset - margin, margin + 40)]], frame);
  const path = geo.geoPath(projection);

  const parts = [
    `<rect width="${width}" height="${height}" class="flight-map-water"/>`,
    `<path d="${path(land)}" class="flight-map-land"/>`,
    `<path d="${path(borders)}" class="flight-map-borders"/>`,
  ];
  if (flight.mode === 'route' && points.length > 1) {
    parts.push(`<path d="${path({ type: 'LineString', coordinates: points })}" class="flight-map-route"/>`);
  }
  flight.legs.forEach((leg, i) => {
    const [x, y] = projection([leg.lng, leg.lat]);
    const lands = flight.mode === 'route' ? i === flight.legs.length - 1 : true;
    if (lands) {
      const s = large ? 1.3 : 1;
      parts.push(`<g class="flight-map-pin" transform="translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${s})"><path d="M0 0C0 0-9-10.5-9-15a9 9 0 0 1 18 0c0 4.5-9 15-9 15z"/><circle cy="-15" r="3"/></g>`);
    } else {
      parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${large ? 7 : 5}" class="flight-map-stop"/>`);
    }
    if (large) {
      // The label goes left of the point when it would leave the map.
      const label = escapeXml(stopLabel(leg));
      const left = x + 14 + label.length * 8.6 > width - 8;
      parts.push(`<text class="flight-map-label" text-anchor="${left ? 'end' : 'start'}" x="${(left ? x - 14 : x + 12).toFixed(1)}" y="${(y + 5).toFixed(1)}">${label}</text>`);
    }
  });
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.innerHTML = parts.join(''); // numbers and escaped names only
}

/**
 * A link that opens a place in the reader's own maps app, as WhatsApp does
 * with a location: Apple Maps on an iPhone, the phone's default app on
 * Android (geo:), Google Maps in a browser. A pin at the place, never
 * driving directions.
 */
export function mapsLink(leg, userAgent = globalThis.navigator?.userAgent || '') {
  const q = encodeURIComponent(leg.query || leg.place);
  if (/iPhone|iPad|iPod|Macintosh.*Mobile/.test(userAgent)) {
    return `https://maps.apple.com/?q=${q}&ll=${leg.lat},${leg.lng}`;
  }
  if (/Android/.test(userAgent)) return `geo:${leg.lat},${leg.lng}?q=${q}`;
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}
