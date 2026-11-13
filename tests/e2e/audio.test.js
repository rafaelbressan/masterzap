import { test, expect } from '@playwright/test';

// Voice notes, as WhatsApp draws them: the original recording plays when the
// data has it (msg.audio_src, a file of this site); a transcript is the
// bubble's text, cut with "Ler mais"; nothing is said that is not there.

/** A short silent WAV, to stand for a recording. */
function silentWav(seconds = 1, rate = 8000) {
  const samples = seconds * rate;
  const buf = Buffer.alloc(44 + samples);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + samples, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate, 28); buf.writeUInt16LE(1, 32); buf.writeUInt16LE(8, 34);
  buf.write('data', 36); buf.writeUInt32LE(samples, 40); buf.fill(128, 44);
  return buf;
}

const audioRow = (page) => page.locator('.chat-msg-row').filter({ has: page.locator('.chat-audio') }).first();
// The Martha note the recording is put on (its day has other voice notes).
const note965 = (page) => page.locator('.chat-msg-row[data-id="965"]');

/** Open a chat from the list and scroll up until its voice note is in. */
async function openToVoiceNote(page, id) {
  await page.goto(`/#/chat/${id}`);
  await page.waitForSelector('.chat-messages:not([aria-busy="true"]) .chat-day');
  await expect.poll(async () => {
    await page.evaluate(() => { const c = document.querySelector('.chat-messages'); c.scrollTop = c.scrollTop === 0 ? 1 : 0; });
    return audioRow(page).count();
  }, { timeout: 15000 }).toBeGreaterThan(0);
}

test('a transcript is cut at a few lines, and "Ler mais" shows the rest', async ({ page }) => {
  // Opened from the list, not by a link to the message (that opens it whole).
  await openToVoiceNote(page, 'fabio-faria');
  const transcript = audioRow(page).locator('.chat-audio-transcript');
  await expect(transcript).toBeVisible();
  await expect(audioRow(page).locator('.chat-audio-foot')).toHaveText('Áudio não recuperado · transcrição da perícia');
  const cut = await transcript.boundingBox();
  await transcript.getByRole('button', { name: 'Ler mais' }).click();
  await expect(transcript.getByRole('button', { name: 'Ler mais' })).toHaveCount(0);
  // The keyboard stays with the text it opened.
  await expect(transcript.locator('.chat-audio-transcript-text')).toBeFocused();
  expect((await transcript.boundingBox()).height).toBeGreaterThan(cut.height * 2);
  await expect(transcript).toContainText('Um abraço. Valeu.');
});

test('a voice note with no transcript says only that it was not recovered', async ({ page }) => {
  await page.goto('/#/chat/martha-graeff/msg/965');
  await expect(note965(page).locator('.chat-audio-foot')).toHaveText('Áudio não recuperado');
  await expect(note965(page).locator('.chat-audio-play')).toBeDisabled();
});

for (const [name, src, plays] of [
  ['the original recording plays', '/assets/test-recording.wav', true],
  ['a recording from another site is not played', 'https://example.com/x.mp3', false],
]) {
  test(name, async ({ page }) => {
    await page.route(/\/data\/martha-graeff\/2024-03-20\.json/, async (route) => {
      const response = await route.fetch();
      const data = await response.json();
      data.messages.find(m => m.id === 965).audio_src = src;
      await route.fulfill({ response, json: data });
    });
    await page.route('**/assets/test-recording.wav', route => route.fulfill({ body: silentWav(2), contentType: 'audio/wav' }));
    await page.goto('/#/chat/martha-graeff/msg/965');
    const play = note965(page).locator('.chat-audio-play');
    if (!plays) {
      await expect(play).toBeDisabled();
      return;
    }
    await expect(play).toBeEnabled();
    await play.click();
    // Playing: the button pauses, the bubble says so, the time shows.
    await expect(play).toHaveAttribute('aria-label', 'Pausar áudio');
    await expect(note965(page).locator('.chat-audio')).toHaveClass(/playing/);
    await expect(note965(page).locator('.chat-audio-foot')).toHaveText(/^\d+:\d{2}$/);
    // At the end it is back to play.
    await expect(play).toHaveAttribute('aria-label', 'Reproduzir áudio', { timeout: 6000 });
  });
}

test('landing on a voice note by its link shows its transcript whole', async ({ page }) => {
  await page.goto('/#/chat/fabio-faria/msg/7');
  const transcript = audioRow(page).locator('.chat-audio-transcript');
  await expect(transcript).toContainText('Um abraço. Valeu.');
  await expect(transcript.getByRole('button', { name: 'Ler mais' })).toHaveCount(0);
});

test("copying a voice note copies what was said, not the labels around it", async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openToVoiceNote(page, 'fabio-faria');
  const row = audioRow(page);
  await row.locator('.chat-audio-transcript').waitFor();
  await row.locator('.chat-msg-bubble').click({ button: 'right' });
  await page.locator('.context-menu-item', { hasText: 'Copiar' }).first().click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied.startsWith('Fala, irmão, tudo bem?')).toBe(true);
  expect(copied).not.toMatch(/Ler mais|Áudio não recuperado|transcrição da perícia/);
});

test('a recording goes on when the reader leaves its chat, with the bar on top of the list', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'the list beside the chat');
  await page.route(/\/data\/martha-graeff\/2024-03-20\.json/, async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    data.messages.find(m => m.id === 965).audio_src = '/assets/test-recording.wav';
    await route.fulfill({ response, json: data });
  });
  await page.route('**/assets/test-recording.wav', route => route.fulfill({ body: silentWav(20), contentType: 'audio/wav' }));
  await page.goto('/#/chat/martha-graeff/msg/965');
  const bar = page.locator('.voice-note-bar');
  await note965(page).locator('.chat-audio-play').click();
  await expect(note965(page).locator('.chat-audio-play')).toHaveAttribute('aria-label', 'Pausar áudio');
  await expect(bar).toBeHidden(); // its own chat is open: the bubble shows it

  await page.locator('.conversation-item[data-id="ciro-soares"]').click();
  await expect(bar).toBeVisible();
  await expect(bar).toContainText('Martha Graeff');
  await expect(bar.getByRole('button', { name: 'Pausar áudio' })).toBeVisible();

  // Pause and play from the bar.
  await bar.getByRole('button', { name: 'Pausar áudio' }).click();
  await expect(bar.getByRole('button', { name: 'Reproduzir áudio' })).toBeVisible();
  await bar.getByRole('button', { name: 'Reproduzir áudio' }).click();

  // The name opens the chat at the note, still playing; the bar hides.
  await bar.locator('.voice-note-bar-who').click();
  await expect(page).toHaveURL(/#\/chat\/martha-graeff\/msg\/965$/);
  await expect(note965(page).locator('.chat-audio-play')).toHaveAttribute('aria-label', 'Pausar áudio');
  await expect(bar).toBeHidden();

  // Away again, and closed from the bar: it stops and the bar goes.
  await page.locator('.conversation-item[data-id="ciro-soares"]').click();
  await bar.getByRole('button', { name: 'Fechar áudio' }).click();
  await expect(bar).toBeHidden();
});


test('on a phone, back to the list with a recording playing shows the bar', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'phone');
  await page.route(/\/data\/martha-graeff\/2024-03-20\.json/, async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    data.messages.find(m => m.id === 965).audio_src = '/assets/test-recording.wav';
    await route.fulfill({ response, json: data });
  });
  await page.route('**/assets/test-recording.wav', route => route.fulfill({ body: silentWav(20), contentType: 'audio/wav' }));
  await page.goto('/#/chat/martha-graeff/msg/965');
  await note965(page).locator('.chat-audio-play').click();
  await expect(note965(page).locator('.chat-audio-play')).toHaveAttribute('aria-label', 'Pausar áudio');
  await page.locator('.chat-header button[aria-label="Voltar"]').click();
  const bar = page.locator('.voice-note-bar');
  await expect(bar).toBeVisible();
  await expect(bar).toBeInViewport();
  await expect(bar.getByRole('button', { name: 'Pausar áudio' })).toBeVisible();
});
