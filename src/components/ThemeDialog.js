/**
 * "Tema", as WhatsApp's: Claro, Escuro or Padrão do sistema, applied on OK.
 *
 * A native modal <dialog>: the page behind is dimmed and inert, the keyboard
 * stays inside, Escape and Android's back cancel. Enter on an option is OK
 * (the form's default button). Tapping outside cancels.
 *
 * Security note: every text is static.
 */
import { themeChoice, setThemeChoice } from '../lib/theme.js';

const OPTIONS = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
  { value: 'system', label: 'Padrão do sistema' },
];

/**
 * @param {object} [options]
 * @param {HTMLElement|null} [options.returnFocus] - where the keyboard goes back
 *   to when the dialog closes (the menu that opened it is gone by then)
 * @returns {HTMLDialogElement}
 */
export function showThemeDialog({ returnFocus = null } = {}) {
  const dialog = document.createElement('dialog');
  dialog.className = 'theme-dialog';
  dialog.setAttribute('aria-labelledby', 'theme-dialog-title');

  const form = document.createElement('form');
  form.method = 'dialog';
  form.className = 'theme-dialog-form';

  const title = document.createElement('h2');
  title.id = 'theme-dialog-title';
  title.className = 'theme-dialog-title';
  title.textContent = 'Tema';

  const group = document.createElement('div');
  group.className = 'theme-dialog-options';
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-labelledby', 'theme-dialog-title');
  const current = themeChoice();
  for (const option of OPTIONS) {
    const label = document.createElement('label');
    label.className = 'theme-dialog-option';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'tema';
    input.value = option.value;
    input.checked = option.value === current;
    const text = document.createElement('span');
    text.textContent = option.label;
    label.append(input, text);
    group.appendChild(label);
  }

  const actions = document.createElement('div');
  actions.className = 'theme-dialog-actions';
  const cancel = document.createElement('button');
  cancel.type = 'button'; // not a submit: OK stays the form's default button
  cancel.className = 'theme-dialog-cancel wds-button wds-button--borderless';
  cancel.textContent = 'Cancelar';
  cancel.addEventListener('click', () => dialog.close());
  const ok = document.createElement('button');
  ok.type = 'submit';
  ok.value = 'ok';
  ok.className = 'theme-dialog-ok wds-button wds-button--filled';
  ok.textContent = 'OK';
  actions.append(cancel, ok);

  form.append(title, group, actions);
  dialog.appendChild(form);

  // A tap on the dimmed page around the dialog cancels. The box has no
  // padding, so only the backdrop hits the dialog element itself; the press
  // must start there too (one that starts on an option and slips off is
  // not a tap outside).
  let pressedOutside = false;
  dialog.addEventListener('pointerdown', (e) => { pressedOutside = e.target === dialog; });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog && pressedOutside) dialog.close();
    pressedOutside = false;
  });

  // Escape cancels the dialog only: the drawers behind it (contact info,
  // chat search) close on Escape at the document too.
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') e.stopPropagation();
  });

  dialog.addEventListener('close', () => {
    if (dialog.returnValue === 'ok') {
      const chosen = form.elements.namedItem('tema').value;
      setThemeChoice(chosen);
    }
    dialog.remove();
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  });

  document.body.appendChild(dialog);
  dialog.showModal();
  // The keyboard on the current choice, as a radio group expects.
  group.querySelector('input:checked')?.focus({ preventScroll: true });
  return dialog;
}
