import { describe, it, expect } from 'vitest';
import { exportUrl, EXPORT_ALL_URL, downloadFile } from '../../src/lib/export.js';

describe('exportUrl', () => {
  it('points at the file the build writes', () => {
    expect(exportUrl('alexandre-de-moraes', 'md')).toBe('/export/masterwhats-alexandre-de-moraes.md');
    expect(exportUrl('martha-graeff', 'json')).toBe('/export/masterwhats-martha-graeff.json');
  });

  it('refuses a format the build does not produce', () => {
    expect(() => exportUrl('x', 'csv')).toThrow();
  });

  it('has one zip for everything', () => {
    expect(EXPORT_ALL_URL).toBe('https://github.com/rafaelbressan/masterzap/releases/latest/download/masterwhats-export.zip');
  });
});

describe('downloadFile', () => {
  it('downloads under the file\'s own name', () => {
    const clicked = [];
    const original = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { clicked.push({ href: this.getAttribute('href'), download: this.download }); };
    try {
      downloadFile('/export/masterwhats-ciro-soares.md');
    } finally {
      HTMLAnchorElement.prototype.click = original;
    }
    expect(clicked).toEqual([{ href: '/export/masterwhats-ciro-soares.md', download: 'masterwhats-ciro-soares.md' }]);
    expect(document.querySelector('a[download]')).toBeNull();
  });
});
