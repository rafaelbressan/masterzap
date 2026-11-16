import { describe, it, expect } from 'vitest';
import { quoteOf } from '../../src/lib/quote.js';

const conv = { id: 'ana-matos-mkt', participants: ['DV', 'Ana Matos'], contact: 'Ana Matos Mkt' };

describe('quoteOf', () => {
  it('is nothing for a message that quotes nothing', () => {
    expect(quoteOf({ type: 'text', content: 'oi' }, conv)).toBeNull();
  });

  it('says "Você" for the phone owner, and his sender id outside the app', () => {
    const q = quoteOf({ type: 'text', quoted: 'Otto tem que ir', quoted_sender: 'DV', quoted_id: 46 }, conv);
    expect(q).toEqual({ id: 46, fromOwner: true, author: 'Você', sender: 'DV', kind: 'text', text: 'Otto tem que ir', excerpt: 'Otto tem que ir' });
  });

  it("names the contact as the chat does, and has no id when the quoted message is not in the chat", () => {
    const q = quoteOf({ type: 'text', quoted: 'Oi', quoted_sender: 'Ana Matos' }, conv);
    expect(q).toMatchObject({ id: null, fromOwner: false, author: 'Ana Matos Mkt', sender: 'Ana Matos' });
  });

  it('shows a quoted contact card by its name', () => {
    const q = quoteOf({ type: 'text', quoted: '[contato] Vivi Moraes +55 11 98344-5794', quoted_sender: 'DV', quoted_type: 'contact' }, conv);
    // By its name on the bubble; whole, number and all, outside the app.
    expect(q).toMatchObject({ kind: 'contact', text: 'Vivi Moraes', excerpt: '[contato] Vivi Moraes +55 11 98344-5794' });
  });

  it('drops the quote with a deleted message, as WhatsApp does', () => {
    expect(quoteOf({ type: 'deleted', quoted: 'x', quoted_sender: 'DV' }, conv)).toBeNull();
  });
});
