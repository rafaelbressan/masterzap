import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  THEME_KEY, THEME_COLOR, themeChoice, resolvedTheme, setThemeChoice, applyTheme, initTheme, resetTheme,
} from '../../src/lib/theme.js';

// The device's theme, as matchMedia reports it.
function deviceDark(dark) {
  const listeners = [];
  const mql = {
    matches: dark,
    addEventListener: (_, fn) => listeners.push(fn),
  };
  window.matchMedia = vi.fn(() => mql);
  return { change(next) { mql.matches = next; listeners.forEach(fn => fn()); } };
}

beforeEach(() => {
  localStorage.clear();
  resetTheme();
  delete document.documentElement.dataset.theme;
  document.head.innerHTML = '<meta name="theme-color" content="#1DAA61">';
  vi.restoreAllMocks();
  deviceDark(false);
});

describe('theme choice', () => {
  it('with nothing saved follows the device', () => {
    expect(themeChoice()).toBe('system');
    deviceDark(true);
    expect(resolvedTheme()).toBe('dark');
    deviceDark(false);
    expect(resolvedTheme()).toBe('light');
  });

  it('a saved choice wins over the device and lasts', () => {
    deviceDark(true);
    setThemeChoice('light');
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    resetTheme();
    expect(themeChoice()).toBe('light');
  });

  it('dark puts the dark bar colour on the browser', () => {
    setThemeChoice('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.querySelector('meta[name="theme-color"]').content).toBe('#161717');
    setThemeChoice('light');
    expect(document.querySelector('meta[name="theme-color"]').content).toBe('#1DAA61');
  });

  it('a corrupt or hand-edited value counts as "Padrão do sistema"', () => {
    localStorage.setItem(THEME_KEY, '<script>');
    expect(themeChoice()).toBe('system');
  });

  it('ignores an unknown choice', () => {
    setThemeChoice('sepia');
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
  });

  it('when saving fails, the choice lasts for the visit', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    setThemeChoice('dark');
    expect(themeChoice()).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('when storage cannot be read at all, follows the device', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    deviceDark(true);
    expect(resolvedTheme()).toBe('dark');
  });

  it('without matchMedia, light', () => {
    window.matchMedia = undefined;
    expect(resolvedTheme('system')).toBe('light');
  });
});

describe('following changes', () => {
  it('"Padrão do sistema" follows the device as it changes', () => {
    const device = deviceDark(false);
    initTheme();
    expect(document.documentElement.dataset.theme).toBe('light');
    device.change(true);
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('a chosen theme does not move with the device', () => {
    const device = deviceDark(false);
    setThemeChoice('light');
    applyTheme();
    device.change(true);
    applyTheme();
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});

// The one-line script in index.html's <head> puts the theme on before the
// first paint; it repeats theme.js's key and colour, so they are checked here.
describe('the <head> script', () => {
  const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');
  const script = html.match(/<script>(var t;[\s\S]*?)<\/script>/)[1];
  const run = () => new Function(script)();

  it('reads the same key and paints the same dark bar colour as theme.js', () => {
    expect(script).toContain(`'${THEME_KEY}'`);
    expect(script).toContain(`'${THEME_COLOR.dark}'`);
  });

  it('the pre-paint <style> paints the same dark colour', () => {
    const style = html.match(/<style>(html\{[\s\S]*?)<\/style>/)[1];
    expect(style).toContain(`html[data-theme="dark"]{background:${THEME_COLOR.dark}`);
  });

  it('follows the saved choice, else the device', () => {
    localStorage.setItem(THEME_KEY, 'dark');
    run();
    expect(document.documentElement.dataset.theme).toBe('dark');
    localStorage.setItem(THEME_KEY, 'system');
    deviceDark(false);
    run();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('with storage blocked, still follows the device', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    deviceDark(true);
    run();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
