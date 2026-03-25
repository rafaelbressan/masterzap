import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HashRouter } from '../../src/lib/router.js';

describe('HashRouter', () => {
  describe('parseHash()', () => {
    it('empty hash → home', () => {
      expect(HashRouter.parseHash('')).toEqual({ route: 'home', param: null });
    });

    it('#/ → home', () => {
      expect(HashRouter.parseHash('#/')).toEqual({ route: 'home', param: null });
    });

    it('# → home', () => {
      expect(HashRouter.parseHash('#')).toEqual({ route: 'home', param: null });
    });

    it('#/chat/martha-graeff → chat with id', () => {
      expect(HashRouter.parseHash('#/chat/martha-graeff')).toEqual({
        route: 'chat',
        param: 'martha-graeff',
      });
    });

    it('#/chat/some-id-123 → chat with id', () => {
      expect(HashRouter.parseHash('#/chat/some-id-123')).toEqual({
        route: 'chat',
        param: 'some-id-123',
      });
    });

    it('unknown route → home', () => {
      expect(HashRouter.parseHash('#/unknown/path')).toEqual({
        route: 'home',
        param: null,
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

    it('navigate("chat", "martha-graeff") sets hash', () => {
      router.navigate('chat', 'martha-graeff');
      expect(window.location.hash).toBe('#/chat/martha-graeff');
    });

    it('getCurrentRoute() returns parsed route', () => {
      window.location.hash = '#/chat/test-id';
      const route = router.getCurrentRoute();
      expect(route).toEqual({ route: 'chat', param: 'test-id' });
    });

    it('calls handler on start for current hash', () => {
      window.location.hash = '#/chat/martha-graeff';
      const handler = vi.fn();
      router.on('chat', handler);
      router.start();
      expect(handler).toHaveBeenCalledWith('martha-graeff');
    });

    it('calls home handler when hash is empty', () => {
      window.location.hash = '';
      const handler = vi.fn();
      router.on('home', handler);
      router.start();
      expect(handler).toHaveBeenCalledWith(null);
    });
  });
});
