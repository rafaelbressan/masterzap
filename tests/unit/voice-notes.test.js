import { describe, it, expect } from 'vitest';
import { secondsOf, clock } from '../../src/lib/voice-notes.js';

describe('a voice note\'s length', () => {
  it('reads the length the data writes ("00:21", "1:34")', () => {
    expect(secondsOf('00:21')).toBe(21);
    expect(secondsOf('01:34')).toBe(94);
    expect(secondsOf('00:00:17')).toBe(17);
    expect(secondsOf('100:00')).toBe(6000);
    expect(clock(secondsOf('01:34'))).toBe('1:34');
  });

  it('knows nothing from a length it cannot read', () => {
    for (const text of [undefined, null, '', '12 min', '1:2', '1:75', 'abc', '1:2:3:4']) expect(secondsOf(text)).toBeUndefined();
    expect(clock(undefined)).toBe('');
  });
});

describe('whose transcript a voice note shows', async () => {
  const { transcriptCredit } = await import('../../src/lib/provenance.js');
  it('names who transcribed it, else the source', () => {
    expect(transcriptCredit({ transcribed_by: 'MasterWhats' }, { verification: 'nao-verificado' })).toBe('transcrição do MasterWhats');
    expect(transcriptCredit({}, { verification: 'verificado' })).toBe('transcrição da perícia');
    expect(transcriptCredit({}, { verification: 'nao-verificado', source_id: 'iped-flavio-carneiro' })).toBe('transcrição da perícia');
    expect(transcriptCredit({ verification: 'imprensa' }, { verification: 'nao-verificado' })).toBe('transcrição da imprensa');
    expect(transcriptCredit({}, { verification: 'reconstruido' })).toBe('transcrição reconstruída');
    // An anonymous source says nothing of who transcribed it.
    expect(transcriptCredit({}, { verification: 'nao-verificado', source_id: 'fork-x' })).toBe('transcrição');
  });
});

describe('the speed of a voice note', async () => {
  const { cycleRate, rateLabel, playbackRate } = await import('../../src/lib/voice-notes.js');
  it('goes 1×, 1,5×, 2× and back, as WhatsApp', () => {
    expect(rateLabel(playbackRate())).toBe('1×');
    expect(rateLabel(cycleRate())).toBe('1,5×');
    expect(rateLabel(cycleRate())).toBe('2×');
    expect(rateLabel(cycleRate())).toBe('1×');
  });
});
