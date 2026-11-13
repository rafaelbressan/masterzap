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

test('a transcript is cut at a few lines, and "Ler mais" shows the rest', async ({ page }) => {
  await page.goto('/#/chat/fabio-faria/msg/7');
  const transcript = audioRow(page).locator('.chat-audio-transcript');
  await expect(transcript).toBeVisible();
  await expect(audioRow(page).locator('.chat-audio-foot')).toHaveText('Áudio não recuperado · transcrição da perícia');
  const cut = await transcript.boundingBox();
  await transcript.getByRole('button', { name: 'Ler mais' }).click();
  await expect(transcript.getByRole('button', { name: 'Ler mais' })).toHaveCount(0);
  expect((await transcript.boundingBox()).height).toBeGreaterThan(cut.height * 2);
  await expect(transcript).toContainText('Um abraço. Valeu.');
});

test('a voice note with no transcript says only that it was not recovered', async ({ page }) => {
  await page.goto('/#/chat/martha-graeff/msg/965');
  await expect(audioRow(page).locator('.chat-audio-foot')).toHaveText('Áudio não recuperado');
  await expect(audioRow(page).locator('.chat-audio-play')).toBeDisabled();
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
    const play = audioRow(page).locator('.chat-audio-play');
    if (!plays) {
      await expect(play).toBeDisabled();
      return;
    }
    await expect(play).toBeEnabled();
    await play.click();
    // Playing: the button pauses, the bubble says so, the time shows.
    await expect(play).toHaveAttribute('aria-label', 'Pausar áudio');
    await expect(audioRow(page).locator('.chat-audio')).toHaveClass(/playing/);
    await expect(audioRow(page).locator('.chat-audio-foot')).toHaveText(/^\d+:\d{2}$/);
    // At the end it is back to play.
    await expect(play).toHaveAttribute('aria-label', 'Reproduzir áudio', { timeout: 6000 });
  });
}
