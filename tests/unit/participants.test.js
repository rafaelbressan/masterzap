import { describe, it, expect } from 'vitest';
import { ownerOf, contactOf, isOutgoing, ownerName, otherParticipantOf, DEFAULT_OWNER } from '../../src/lib/participants.js';

// Whose phone a conversation came from, and who is on the other side.
describe('participants', () => {
  const vorcaro = { id: 'ana', participants: ['DV', 'Ana'] };
  const other = { id: 'x', owner: 'Ana', participants: ['Ana', 'DV'] };

  it('the owner is DV unless the conversation names another', () => {
    expect(ownerOf(vorcaro)).toBe(DEFAULT_OWNER);
    expect(ownerOf(other)).toBe('Ana');
    expect(ownerOf(undefined)).toBe(DEFAULT_OWNER);
  });

  it('the contact is the name given, else whoever is not the owner', () => {
    expect(contactOf(vorcaro)).toBe('Ana');
    expect(contactOf(other)).toBe('DV');
    expect(contactOf({ ...vorcaro, contact: 'Ana Matos' })).toBe('Ana Matos');
    // The chat with oneself: nobody else, the owner then.
    expect(contactOf({ id: 'dv-self', participants: ['DV'] })).toBe('DV');
    expect(contactOf({ id: 'y', participants: [] })).toBe('y');
  });

  it("outgoing is what the owner's phone sent", () => {
    expect(isOutgoing({ sender: 'DV' }, vorcaro)).toBe(true);
    expect(isOutgoing({ sender: 'Ana' }, vorcaro)).toBe(false);
    expect(isOutgoing({ sender: 'Ana' }, other)).toBe(true);
    expect(isOutgoing({ sender: 'DV' }, other)).toBe(false);
  });

  it("names the owner in full when known, else by their id", () => {
    expect(ownerName(vorcaro)).toBe('Daniel Vorcaro');
    expect(ownerName(other)).toBe('Ana');
  });

  it('the other side as a sender id, not the display name', () => {
    expect(otherParticipantOf({ ...vorcaro, contact: 'Ana Matos MKT' })).toBe('Ana');
    expect(otherParticipantOf(other)).toBe('DV');
  });
});
