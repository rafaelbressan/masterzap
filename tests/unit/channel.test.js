// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { mapsLink, stopLabel } from '../../src/lib/flight-map.js';
import { dayLabel, routeText, renderUpdatesPanel } from '../../src/components/Channel.js';
import { HashRouter } from '../../src/lib/router.js';

const congonhas = { place: 'Congonhas', query: 'Aeroporto de Congonhas', lat: -23.626, lng: -46.656, time: '16:57' };

describe('a flight on the map', () => {
  it('opens a place in the reader\'s own maps app, a pin and never directions', () => {
    expect(mapsLink(congonhas, 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'))
      .toBe('https://maps.apple.com/?q=Aeroporto%20de%20Congonhas&ll=-23.626,-46.656');
    expect(mapsLink(congonhas, 'Mozilla/5.0 (Linux; Android 14)')).toBe('geo:-23.626,-46.656?q=Aeroporto%20de%20Congonhas');
    expect(mapsLink(congonhas, 'Mozilla/5.0 (X11; Linux x86_64)'))
      .toBe('https://www.google.com/maps/search/?api=1&query=Aeroporto%20de%20Congonhas');
    for (const ua of ['iPhone', 'Android', 'X11']) expect(mapsLink(congonhas, ua)).not.toMatch(/\/dir\/|daddr|saddr/);
  });

  it('labels a stop with its time, and says the route in order', () => {
    expect(stopLabel(congonhas)).toBe('Congonhas · 16h57');
    const post = { mode: 'route', legs: [{ place: 'Brasília', time: '15:36' }, congonhas] };
    expect(routeText(post)).toBe('Brasília 15h36 → Congonhas 16h57');
    expect(routeText({ ...post, mode: 'places' })).toBe('Brasília 15h36, Congonhas 16h57');
  });

  it('dates a post by its day, or by its month when the day is not known', () => {
    expect(dayLabel('2025-08-28')).toBe('28 de agosto de 2025');
    expect(dayLabel('2022-10')).toBe('outubro de 2022');
  });
});

describe('the channel\'s address', () => {
  it('opens the panel, the channel, and one flight', () => {
    expect(HashRouter.parseHash('#/atualizacoes')).toEqual({ route: 'atualizacoes', param: null, messageId: null });
    expect(HashRouter.parseHash('#/canal/masterwhats')).toEqual({ route: 'canal', param: 'masterwhats', messageId: null });
    expect(HashRouter.parseHash('#/canal/masterwhats/voo-2025-08-28-pr-ngm'))
      .toEqual({ route: 'canal', param: 'masterwhats', messageId: 'voo-2025-08-28-pr-ngm' });
  });
});

describe('the "Atualizações" panel', () => {
  it('lists Status, empty, and the channel with its last post', () => {
    const panel = renderUpdatesPanel({
      channel: { name: 'MasterWhats' },
      posts: [{ date: '2025-08-28', mode: 'route', legs: [{ place: 'Brasília' }, { place: 'Congonhas' }] }],
    });
    expect(panel.querySelector('.updates-empty').textContent).toBe('Nenhuma atualização de status.');
    expect(panel.querySelector('.updates-channel-name').textContent).toBe('MasterWhats');
    expect(panel.querySelector('.updates-channel-preview').textContent).toBe('✈️ Brasília → Congonhas');
  });
});

describe('the channel\'s data', () => {
  const { posts } = JSON.parse(readFileSync('data/canal/posts.json', 'utf8'));
  const sources = new Set(JSON.parse(readFileSync('data/sources.json', 'utf8')).sources.map(s => s.id));

  it('gives every flight a source, a seal, and a place for every stop', () => {
    for (const post of posts) {
      expect(sources.has(post.source_id), post.id).toBe(true);
      expect(['verificado', 'imprensa', 'nao-verificado', 'reconstruido'], post.id).toContain(post.verification);
      for (const leg of post.legs) {
        expect(Number.isFinite(leg.lat) && Number.isFinite(leg.lng), `${post.id} ${leg.place}`).toBe(true);
        expect(Math.abs(leg.lat) <= 90 && Math.abs(leg.lng) <= 180, `${post.id} ${leg.place}`).toBe(true);
      }
    }
    expect(new Set(posts.map(p => p.id)).size).toBe(posts.length);
  });

  it('keeps what the source wrote', () => {
    for (const post of posts) expect(post.fork?.route, post.id).toBeTruthy();
  });
});
