import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { createJevActions, requestBody, PROVIDERS, providerConfig } from '../service/jev.mjs';

const input = { state: 'Write a presentation.', questions: {
  owner: { type: 'choice', instructions: 'Which agent?', criteria: { writer: 'Writes text', slides: 'Creates slides' } },
  quality: { type: 'score', instructions: 'Rate clarity.', criteria: ['unclear', 'clear', 'excellent'] },
  review: { type: 'noul', instructions: 'Need a reviewer?' },
} };
const result = { model: 'jev-1.13.0', answers: {
  owner: { type: 'choice', choice: 'slides', confidence: 0.9, probabilities: { writer: 0.05, slides: 0.95 } },
  quality: { type: 'score', score: 1.8, confidence: 0.8, probabilities: { 0: 0, 1: 0.2, 2: 0.8 }, legend: { 0: 'unclear', 1: 'clear', 2: 'excellent' } },
  review: { type: 'noul', noul: 0.7 },
}, usage: { input_tokens: 120, output_tokens: 24 } };
const service = (config, fetcher) => createJevActions({ getConfig: () => config, getApiKey: () => 'fixture-only-key', fetcher });
const typesafe = () => providerConfig('typesafe');

test('provider presets compose documented endpoints, models and key references', () => {
  assert.equal(providerConfig('typesafe').endpoint, 'https://api.typesafe.ai/v1/systemone');
  assert.equal(providerConfig('openrouter').endpoint, 'https://openrouter.ai/api/alpha/decisions');
  assert.equal(providerConfig('bocha').endpoint, 'https://jev.bocha.cn/v1/systemone');
  assert.equal(providerConfig('openrouter').model, 'typesafe/jev-latest');
  assert.equal(providerConfig('bocha').apiKeyRef, 'BOCHA_JEV_API_KEY');
  assert.equal(providerConfig('bocha').maxQuestions, 32);
  const overridden = providerConfig('openrouter', { baseURL: 'https://mirror.example.com/', model: 'typesafe/jev-1.13', apiKeyRef: 'SHARED_KEY' });
  assert.equal(overridden.endpoint, 'https://mirror.example.com/alpha/decisions');
  assert.equal(overridden.model, 'typesafe/jev-1.13');
  assert.equal(overridden.apiKeyRef, 'SHARED_KEY');
});

test('each provider sends its model and endpoint with sanitized typed output', async () => {
  for (const id of Object.keys(PROVIDERS)) {
    const config = providerConfig(id);
    const api = service(config, async (url, options) => {
      assert.equal(url, config.endpoint);
      assert.equal(options.redirect, 'error');
      assert.equal(options.headers.authorization, 'Bearer fixture-only-key');
      assert.equal(JSON.parse(options.body).model, config.model);
      return Response.json({ ...result, debug: 'not forwarded' });
    });
    assert.deepEqual(await api.actions.evaluate(input), { provider: config.label, ...result });
    const status = await api.actions.status();
    assert.deepEqual(Object.keys(status), ['provider', 'endpoint', 'model', 'apiKeyRef', 'configured', 'remoteVerified', 'primitives']);
    assert.equal(status.provider, config.label);
    assert.equal(status.endpoint, config.endpoint);
    assert.equal(status.model, config.model);
    assert.equal(status.apiKeyRef, config.apiKeyRef);
    assert.equal(status.configured, true);
    api.dispose();
  }
});

test('bocha rejects a 33rd question before any network call', async () => {
  let calls = 0;
  const api = service(providerConfig('bocha'), async () => { calls++; return Response.json(result); });
  const questions = Object.fromEntries(Array.from({ length: 33 }, (_item, index) => [`q${index}`, { type: 'noul', instructions: `Question ${index}?` }]));
  await assert.rejects(api.actions.evaluate({ state: 'many questions', questions }), /1–32/);
  assert.equal(calls, 0);
});

test('local status does not call provider, keys rotate without restarting', async () => {
  let key;
  let calls = 0;
  const api = createJevActions({ getConfig: typesafe, getApiKey: () => key, fetcher: async (_url, options) => {
    calls++;
    assert.equal(options.headers.authorization, `Bearer ${key}`);
    return Response.json(result);
  } });
  assert.equal((await api.actions.status()).configured, false);
  await assert.rejects(api.actions.evaluate(input), /TYPESAFE_API_KEY/);
  assert.equal(calls, 0);
  key = 'first';
  assert.equal((await api.actions.status()).remoteVerified, false);
  await api.actions.evaluate(input);
  key = 'second';
  await api.actions.evaluate(input);
  assert.equal(calls, 2);
});

test('invalid questions and excessive context never reach the network', async () => {
  const api = service(typesafe(), () => { throw new Error('must not fetch'); });
  const cases = [null, {}, { ...input, extra: true }, { ...input, state: '' }, { ...input, questions: {} },
    { ...input, state: 'x'.repeat(256 * 1024) }, { ...input, state: { bad: Infinity } },
    ...[{ type: 'unknown', instructions: 'x' }, { type: 'choice', instructions: 'x', criteria: { a: null } },
      { type: 'score', instructions: 'x', criteria: ['x'] }, { type: 'noul', instructions: 'x', criteria: { maybe: 'x' } }]
      .map(question => ({ ...input, questions: { x: question } })),
  ];
  for (const value of cases) await assert.rejects(api.actions.evaluate(value));
  const cycle = {}; cycle.self = cycle;
  assert.throws(() => requestBody({ ...input, state: cycle }, { model: 'jev-latest' }), /JSON/);
});

test('rejects invalid or incomplete provider decisions instead of inventing values', async () => {
  for (const mutate of [r => delete r.answers.review, r => r.answers.review.noul = 2,
    r => r.answers.owner.choice = 'nonexistent', r => r.answers.owner.probabilities.writer = 0.9,
    r => r.answers.quality.score = 3, r => r.usage.input_tokens = -1]) {
    const body = structuredClone(result); mutate(body);
    await assert.rejects(service(typesafe(), async () => Response.json(body)).actions.evaluate(input), /无效/);
  }
  await assert.rejects(service(typesafe(), async () => new Response('not json')).actions.evaluate(input), /无法解析/);
  await assert.rejects(service(typesafe(), async () => new Response('x'.repeat(1024 * 1024 + 1))).actions.evaluate(input), /响应过大/);
});

test('HTTP and network errors never expose keys or upstream bodies', async () => {
  for (const status of [401, 422, 500]) {
    await assert.rejects(service(typesafe(), async () => new Response('fixture-only-key', { status })).actions.evaluate(input), error => !error.message.includes('fixture-only-key'));
  }
  await assert.rejects(service(typesafe(), async () => { throw new Error('Jev leaked fixture-only-key'); }).actions.evaluate(input), /网络请求失败/);
});

test('busy responses (429/503/529) retry a bounded number of times', async () => {
  for (const status of [429, 503, 529]) {
    let count = 0;
    const api = service(typesafe(), async () => ++count < 3 ? new Response('', { status }) : Response.json(result));
    assert.deepEqual((await api.actions.evaluate(input)).answers, result.answers);
    assert.equal(count, 3);
  }
  await assert.rejects(service(typesafe(), async () => new Response('', { status: 429, headers: { 'retry-after': '120' } })).actions.evaluate(input), /繁忙/);
});

test('invalid baseURL fails loudly before any request', async () => {
  let calls = 0;
  const api = service(providerConfig('typesafe', { baseURL: 'not a url' }), async () => { calls++; return Response.json(result); });
  await assert.rejects(api.actions.evaluate(input), /baseURL/);
  await assert.rejects(api.actions.status(), /baseURL/);
  assert.equal(calls, 0);
});

test('timeout, caller cancellation and plugin disposal abort in-flight requests', async () => {
  for (const mode of ['timeout', 'caller', 'dispose']) {
    const controller = new AbortController();
    const api = createJevActions({ getConfig: typesafe, getApiKey: () => 'fixture-only-key', timeoutMs: mode === 'timeout' ? 30 : 1000,
      fetcher: async (_url, options) => { await delay(5000, undefined, { signal: options.signal }); return Response.json(result); } });
    const call = api.actions.evaluate(input, { signal: controller.signal });
    const rejected = assert.rejects(call, mode === 'timeout' ? /超时/ : /取消/);
    if (mode === 'caller') controller.abort();
    if (mode === 'dispose') api.dispose();
    await rejected;
  }
});

test('connection check actually makes a minimal billable request', async () => {
  let calls = 0;
  const api = service(typesafe(), async (_url, options) => {
    calls++;
    const body = JSON.parse(options.body);
    assert.equal(body.questions.connected.type, 'noul');
    return Response.json({ model: 'jev-test', answers: { connected: { type: 'noul', noul: 1 } }, usage: { input_tokens: 10, output_tokens: 2 } });
  });
  assert.equal((await api.actions['check-connection']()).connected, true);
  assert.equal(calls, 1);
});
