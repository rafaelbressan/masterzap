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

// Fábio Faria's voice note with the police transcript (msg 7). The chat has
// other voice notes, from the fork, with no transcript: this one, by its id.
const audioRow = (page) => page.locator('.chat-msg-row[data-id="7"]').filter({ has: page.locator('.chat-audio') });
// The Martha note the recording is put on (its day has other voice notes).
const note965 = (page) => page.locator('.chat-msg-row[data-id="965"]');

/** Open a chat from the list and scroll up until the voice note is in. */
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
  await expect(audioRow(page).locator('.chat-audio-foot')).toHaveText('0:50 · Áudio não recuperado · transcrição da perícia');
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
    // At the end it is back to play, and the length stays.
    await expect(play).toHaveAttribute('aria-label', 'Reproduzir áudio', { timeout: 6000 });
    await expect(note965(page).locator('.chat-audio-foot')).toHaveText('0:02');
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

test('a recording that cannot be played says so, and leaves no bar behind', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'the list beside the chat');
  await page.route(/\/data\/martha-graeff\/2024-03-20\.json/, async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    data.messages.find(m => m.id === 965).audio_src = '/assets/missing-recording.mp3';
    await route.fulfill({ response, json: data });
  });
  await page.route('**/assets/missing-recording.mp3', route => route.fulfill({ status: 404, body: '' }));
  await page.goto('/#/chat/martha-graeff/msg/965');
  await note965(page).locator('.chat-audio-play').click();
  await expect(note965(page).locator('.chat-audio-foot')).toHaveText('Não foi possível tocar o áudio');
  await expect(note965(page).locator('.chat-audio-play')).toBeDisabled();
  await page.locator('.conversation-item[data-id="ciro-soares"]').click();
  await expect(page.locator('.voice-note-bar')).toBeHidden();
});


test('a recording published by the press plays, its length shown before it does', async ({ page }) => {
  // Flávio Bolsonaro's voice note (msg 4): the file came with the report, so
  // the transcript is the press's, not the forensic report's.
  await page.goto('/#/chat/flavio-bolsonaro/msg/4');
  const row = page.locator('.chat-msg-row[data-id="4"]');
  await expect(row.locator('.chat-audio-foot')).toHaveText('1:34 · transcrição da imprensa');
  await row.locator('.chat-audio-play').click();
  await expect(row.locator('.chat-audio')).toHaveClass(/playing/);
  await row.locator('.chat-audio-play').click();
  await expect(row.locator('.chat-audio')).not.toHaveClass(/playing/);
});

test('while a note plays, its speed takes the photo\'s place; the waveform takes a tap', async ({ page }) => {
  await page.goto('/#/chat/flavio-bolsonaro/msg/4');
  const row = page.locator('.chat-msg-row[data-id="4"]');
  const audio = row.locator('.chat-audio');
  await expect(audio.locator('.chat-audio-speed')).toBeHidden();
  await row.locator('.chat-audio-play').click();
  await expect(audio).toHaveClass(/playing/);
  const speed = audio.locator('.chat-audio-speed');
  await expect(speed).toHaveText('1×');
  await expect(audio.locator('.chat-audio-avatar')).toBeHidden();
  await speed.click();
  await expect(speed).toHaveText('1,5×');

  // A tap past the middle of the waveform goes there (the note is 1:34).
  const wf = await audio.locator('.chat-audio-waveform').boundingBox();
  await page.mouse.click(wf.x + wf.width * 0.6, wf.y + wf.height / 2);
  await expect.poll(async () => Number(await audio.locator('.chat-audio-waveform').getAttribute('aria-valuenow'))).toBeGreaterThan(50);
  await expect(audio.locator('.chat-audio-waveform')).toHaveAttribute('role', 'slider');

  // The message's menu arrow, over the corner, stays reachable while it plays.
  await row.locator('.chat-msg-bubble').hover();
  const arrow = await row.locator('.chat-msg-chevron').boundingBox();
  const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('.chat-msg-chevron') != null,
    [arrow.x + arrow.width / 2, arrow.y + arrow.height / 2]);
  expect(hit).toBe(true);

  // On a phone, back to the list: the bar on top, as WhatsApp's, has no speed.
  if (page.viewportSize().width <= 600) {
    await page.locator('.chat-header-back').click();
    await expect(page.locator('.voice-note-bar')).toBeVisible();
    await expect(page.locator('.voice-note-bar button')).toHaveCount(3);
  }
});

test('a note not played yet goes where the waveform is tapped, paused', async ({ page }) => {
  await page.goto('/#/chat/nikolas-ferreira/msg/3');
  const audio = page.locator('.chat-msg-row[data-id="3"] .chat-audio');
  const wf = await audio.locator('.chat-audio-waveform').boundingBox();
  await page.mouse.click(wf.x + wf.width / 2, wf.y + wf.height / 2);
  await expect.poll(async () => Number(await audio.locator('.chat-audio-waveform').getAttribute('aria-valuenow'))).toBeGreaterThan(30);
  await expect(audio).not.toHaveClass(/playing/);
  // The arrows step five seconds.
  const before = Number(await audio.locator('.chat-audio-waveform').getAttribute('aria-valuenow'));
  await audio.locator('.chat-audio-waveform').focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => Number(await audio.locator('.chat-audio-waveform').getAttribute('aria-valuenow'))).toBe(before + 5);
});
