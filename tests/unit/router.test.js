import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HashRouter } from '../../src/lib/router.js';

describe('HashRouter', () => {
  describe('parseHash()', () => {
    it('empty hash → home', () => {
      expect(HashRouter.parseHash('')).toEqual({ route: 'home', param: null, messageId: null });
    });

    it('#/ → home', () => {
      expect(HashRouter.parseHash('#/')).toEqual({ route: 'home', param: null, messageId: null });
    });

    it('# → home', () => {
      expect(HashRouter.parseHash('#')).toEqual({ route: 'home', param: null, messageId: null });
    });

    it('#/chat/martha-graeff → chat with id, no messageId', () => {
      expect(HashRouter.parseHash('#/chat/martha-graeff')).toEqual({
        route: 'chat',
        param: 'martha-graeff',
        messageId: null,
      });
    });

    it('#/chat/some-id-123 → chat with id', () => {
      expect(HashRouter.parseHash('#/chat/some-id-123')).toEqual({
        route: 'chat',
        param: 'some-id-123',
        messageId: null,
      });
    });

    it('#/chat/martha-graeff/msg/13984 → chat with messageId', () => {
      expect(HashRouter.parseHash('#/chat/martha-graeff/msg/13984')).toEqual({
        route: 'chat',
        param: 'martha-graeff',
        messageId: '13984',
      });
    });

    it('#/chat/martha-graeff/msg/1 → first message', () => {
      expect(HashRouter.parseHash('#/chat/martha-graeff/msg/1')).toEqual({
        route: 'chat',
        param: 'martha-graeff',
        messageId: '1',
      });
    });

    it('unknown route → home', () => {
      expect(HashRouter.parseHash('#/unknown/path')).toEqual({
        route: 'home',
        param: null,
        messageId: null,
      });
    });
  });

  describe('navigation', () => {
    let router;

    beforeEach(() => {
      window.location.hash = '';
      router = new HashRouter();
    });

    afterEach(() => {
      router.stop();
      window.location.hash = '';
    });

    it('navigate("home") sets hash to #/', () => {
      router.navigate('home');
      expect(window.location.hash).toBe('#/');
    });

    it('navigate("chat", "martha-graeff") sets hash without messageId', () => {
      router.navigate('chat', 'martha-graeff');
      expect(window.location.hash).toBe('#/chat/martha-graeff');
    });

    it('navigate("chat", "martha-graeff", "13984") sets hash with messageId', () => {
      router.navigate('chat', 'martha-graeff', '13984');
      expect(window.location.hash).toBe('#/chat/martha-graeff/msg/13984');
    });

    it('getCurrentRoute() returns parsed route with messageId', () => {
      window.location.hash = '#/chat/test-id/msg/42';
      const route = router.getCurrentRoute();
      expect(route).toEqual({ route: 'chat', param: 'test-id', messageId: '42' });
    });

    it('calls handler on start with messageId', () => {
      window.location.hash = '#/chat/martha-graeff/msg/100';
      const handler = vi.fn();
      router.on('chat', handler);
      router.start();
      expect(handler).toHaveBeenCalledWith('martha-graeff', '100');
    });

    it('calls handler on start without messageId', () => {
      window.location.hash = '#/chat/martha-graeff';
      const handler = vi.fn();
      router.on('chat', handler);
      router.start();
      expect(handler).toHaveBeenCalledWith('martha-graeff', null);
    });

    it('calls home handler with null params', () => {
      window.location.hash = '';
      const handler = vi.fn();
      router.on('home', handler);
      router.start();
      expect(handler).toHaveBeenCalledWith(null, null);
    });
  });
});
