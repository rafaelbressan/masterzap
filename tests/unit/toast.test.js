import { describe, it, expect, vi, beforeEach } from 'vitest';
import { showToast } from '../../src/components/Toast.js';

describe('showToast()', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('creates a toast element', () => {
    showToast(container, 'Test message');
    const toast = container.querySelector('.search-toast');
    expect(toast).not.toBeNull();
    expect(toast.textContent).toContain('Test message');
  });

  it('removes existing toast before showing new one', () => {
    showToast(container, 'First');
    showToast(container, 'Second');
    const toasts = container.querySelectorAll('.search-toast');
    expect(toasts).toHaveLength(1);
    expect(toasts[0].textContent).toContain('Second');
  });

  it('auto-removes after duration', async () => {
    vi.useFakeTimers();
    showToast(container, 'Auto-remove', 100);

    // After 100ms + 300ms transition
    vi.advanceTimersByTime(500);
    const toast = container.querySelector('.search-toast');
    expect(toast).toBeNull();

    vi.useRealTimers();
  });

  it('contains logo image', () => {
    showToast(container, 'With logo');
    const logo = container.querySelector('.search-toast-logo img');
    expect(logo).not.toBeNull();
    expect(logo.src).toContain('masterzap-logo');
  });
});
