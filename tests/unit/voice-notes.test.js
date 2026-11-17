import { describe, it, expect } from 'vitest';
import { secondsOf, clock } from '../../src/lib/voice-notes.js';

describe('a voice note\'s length', () => {
  it('reads the length the data writes ("00:21", "1:34")', () => {
    expect(secondsOf('00:21')).toBe(21);
    expect(secondsOf('01:34')).toBe(94);
    expect(clock(secondsOf('01:34'))).toBe('1:34');
  });

  it('knows nothing from a length it cannot read', () => {
    for (const text of [undefined, null, '', '12 min', '1:2', 'abc']) expect(secondsOf(text)).toBeNull();
    expect(clock(undefined)).toBe('');
  });
});
