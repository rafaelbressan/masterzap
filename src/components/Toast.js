/**
 * Toast — reusable slide-up notification.
 * Reuses .search-toast CSS from chat.css.
 */

/**
 * Show a toast notification.
 * @param {HTMLElement} container - element to append toast to
 * @param {string} text - message to display
 * @param {number} [duration=2500] - auto-dismiss time in ms
 */
export function showToast(container, text, duration = 2500) {
  // Remove existing toast
  const existing = container.querySelector('.search-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'search-toast';

  const logo = document.createElement('div');
  logo.className = 'search-toast-logo';
  const img = document.createElement('img');
  img.src = '/assets/masterzap-logo.png';
  img.alt = '';
  img.width = 28;
  img.height = 28;
  logo.appendChild(img);
  toast.appendChild(logo);

  const span = document.createElement('span');
  span.textContent = text;
  toast.appendChild(span);

  container.appendChild(toast);
  setTimeout(() => toast.classList.add('visible'), 10);
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
