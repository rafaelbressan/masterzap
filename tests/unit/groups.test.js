import { describe, it, expect } from 'vitest';
import { isGroup, membersOf, memberIdentity, conversationOfPerson } from '../../src/lib/groups.js';
import { defaultGroupAvatarSvg, senderColors, defaultAvatarSvg } from '../../src/lib/avatar.js';

const group = { id: 'g1', is_group: true, owner: 'DV', contact: 'Macallan', participants: ['DV', 'Fábio Faria', 'Lucas'], members: ['Fábio Faria', 'Lucas'] };
const conversations = [
  { id: 'fabio-faria', contact: 'Fábio Faria', aliases: ['Fabio Faria'] },
  { id: 'paulo', contact: 'Diretor Paulo', saved_as: 'Paulo Sérgio Neves de Souza' },
  group,
];

describe('groups', () => {
  it('tells a group from a chat of two', () => {
    expect(isGroup(group)).toBe(true);
    expect(isGroup(conversations[0])).toBe(false);
    expect(membersOf(group)).toEqual(['Fábio Faria', 'Lucas']);
    expect(membersOf(conversations[0])).toEqual([]);
  });

  it('draws a member who has a chat here with that chat, by any of their names', () => {
    expect(memberIdentity('Fabio Faria', conversations)).toEqual({ seed: 'fabio-faria', conversationId: 'fabio-faria' });
    expect(conversationOfPerson('paulo sérgio neves de souza', conversations)?.id).toBe('paulo');
    // Someone with no chat here: seeded by name, nothing to open.
    expect(memberIdentity('Lucas', conversations)).toEqual({ seed: 'Lucas', conversationId: null });
    // A group is never a member's chat.
    expect(conversationOfPerson('Macallan', conversations)).toBeNull();
  });

  it('gives a group the contacts\' coloured circle with the group glyph, and names their photo\'s colour', () => {
    const svg = defaultGroupAvatarSvg('g1', 40);
    expect(svg).toMatch(/<circle[^>]+fill="#[0-9A-F]{6}"/i);
    expect(svg).not.toContain('#dfe5e7');
    // Same circle as a contact with the same seed: one palette.
    expect(svg.match(/fill="(#[0-9A-F]{6})"/i)[1]).toBe(defaultAvatarSvg('g1').match(/fill="(#[0-9A-F]{6})"/i)[1]);
    const { light, dark } = senderColors('fabio-faria');
    expect(defaultAvatarSvg('fabio-faria')).toContain(light);
    expect(defaultAvatarSvg('fabio-faria')).toContain(dark);
  });
});
