import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const roundsLiteral = html.match(/const weatherRounds = (\[[\s\S]*?\n  \]);/);
assert.ok(roundsLiteral, 'weather round data should be present');
const rounds = new Function(`return ${roundsLiteral[1]}`)();

test('dashboard exposes a Weather button and modal overlay', () => {
  assert.match(html, /id="weatherButton"[^>]*onclick="openWeatherDay\(\)"/);
  assert.match(html, /id="weatherOverlay"[^>]*role="dialog"[^>]*aria-modal="true"/);
  assert.match(html, /id="weatherFeedback"[^>]*aria-live="polite"[^>]*aria-atomic="true"/);
});

test('four weather rounds each have one helpful answer among large choices', () => {
  assert.deepEqual(rounds.map(round => round.name), ['sunny', 'rainy', 'snowy', 'windy']);
  for (const round of rounds) {
    assert.equal(round.options.length, 3);
    assert.equal(round.options.filter(([, label]) => label === round.answer).length, 1);
    assert.ok(round.prompt.includes('?'));
    assert.match(round.success, /^Yes!/);
  }
  assert.match(html, /\.weather-option\s*\{[\s\S]*?min-height:\s*126px/);
});

test('feedback, completion, replay, and runtime events are implemented', () => {
  assert.match(html, /Try again!/);
  assert.match(html, /function completeWeatherDay\(\)/);
  assert.match(html, /Weather helper superstar!/);
  assert.match(html, /Play again/);
  for (const event of ['opened', 'try-again', 'matched', 'completed', 'closed']) {
    assert.match(html, new RegExp(`emitWeatherEvent\\('${event}'`));
  }
  assert.match(html, /new CustomEvent\('luna:weather-day'/);
});

test('runtime event stream exposes structured Weather Day evidence', () => {
  const events = [];
  const fakeDocument = { dispatchEvent: event => events.push(event) };
  class FakeCustomEvent {
    constructor(type, init) { this.type = type; this.detail = init.detail; }
  }
  const emit = new Function('document', 'CustomEvent', 'console', `
    let weatherRoundIndex = 1;
    ${html.match(/function emitWeatherEvent[\s\S]*?\n  }/)[0]}
    return emitWeatherEvent;
  `)(fakeDocument, FakeCustomEvent, { info() {} });
  emit('matched', { weather: 'rainy', choice: 'Umbrella' });
  assert.equal(events[0].type, 'luna:weather-day');
  assert.deepEqual(events[0].detail, { type: 'matched', round: 2, weather: 'rainy', choice: 'Umbrella' });
  console.log('Runtime event:', JSON.stringify(events[0].detail));
});

test('keyboard focus is trapped, Escape closes, and focus returns', () => {
  assert.match(html, /event\.key === 'Escape'/);
  assert.match(html, /event\.key === 'Tab'/);
  assert.match(html, /button:not\(:disabled\)/);
  assert.match(html, /weatherReturnFocus\.focus\(\)/);
  assert.match(html, /:focus-visible/);
});

test('mobile layout includes a narrow-screen adaptation', () => {
  assert.match(html, /@media \(max-width: 420px\), \(max-height: 700px\)/);
  assert.match(html, /\.weather-card\s*\{[\s\S]*?width:\s*min\(100%, 560px\)/);
  assert.match(html, /calc\(100dvh - 20px\)/);
});

test('completion celebration leaves the three-column option grid', () => {
  assert.match(html, /\.weather-options\.is-complete\s*\{[\s\S]*?display:\s*flex;[\s\S]*?flex-direction:\s*column;/);
  assert.match(html, /options\.classList\.add\('is-complete'\)/);
  assert.match(html, /options\.classList\.remove\('is-complete'\)/);
});
