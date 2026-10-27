import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as plugin from '../service/dsh.mjs';

const runtime = process.env.DSH_RUNTIME_ROOT;

async function mount(ctx, config) {
  const { default: Tools } = await import(pathToFileURL(createRequire(resolve(runtime, 'package.json')).resolve('@deepseek-ai/dsh-tools')).href);
  const { default: Skills } = await import(pathToFileURL(createRequire(resolve(runtime, 'package.json')).resolve('@deepseek-ai/dsh-skill')).href);
  const { default: SystemPrompt } = await import(pathToFileURL(createRequire(resolve(runtime, 'package.json')).resolve('@deepseek-ai/dsh-system-prompt')).href);
  await ctx.plugin(SystemPrompt, {});
  await ctx.plugin(Tools, {});
  await ctx.plugin(Skills, {});
  return ctx.plugin(plugin, config);
}

test('native DSH registries accept tools/skill and remove them when unmounted', { skip: !runtime }, async () => {
  const { Context } = await import(pathToFileURL(createRequire(resolve(runtime, 'package.json')).resolve('@deepseek-ai/cordis')).href);
  const ctx = new Context();
  let key;
  const resolved = [];
  ctx.provide('credentials', { resolve: async ref => {
    resolved.push(ref);
    if (ref === 'TYPESAFE_API_KEY') return key ? { value: key, source: 'test' } : undefined;
    return undefined;
  } });
  ctx.provide('settings', { configure: () => () => {} });
  const fetcher = globalThis.fetch;
  let endpoint;
  globalThis.fetch = async (url, options) => {
    endpoint = url;
    assert.equal(options.headers.authorization, 'Bearer fixture-key');
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json({ model: 'jev-test', answers: { x: { type: 'noul', noul: 0.9 } }, usage: { input_tokens: 10, output_tokens: 2 } });
  };
  try {
    const fiber = await mount(ctx);
    assert.equal(fiber.state, 2, 'plugin must reach ACTIVE state');
    const names = ctx.tools.schemas().map(tool => tool.name);
    assert.deepEqual(names.filter(name => name.startsWith('jev_')).sort(), ['jev_check_connection', 'jev_evaluate', 'jev_status']);
    const status = await ctx.tools.get('jev_status').execute({}, { signal: new AbortController().signal });
    assert.equal(status.configured, false);
    assert.equal(status.remoteVerified, false);
    assert.equal(status.provider, 'TypeSafe AI');
    assert.equal(status.endpoint, 'https://api.typesafe.ai/v1/systemone');
    assert.equal(status.apiKeyRef, 'TYPESAFE_API_KEY');
    await assert.rejects(ctx.tools.get('jev_evaluate').execute({ state: 'test', questions: { x: { type: 'noul', instructions: 'Yes?' } } }, { signal: new AbortController().signal }), /配置/);
    key = 'fixture-key';
    const answer = await ctx.tools.get('jev_evaluate').execute({ state: 'test', questions: { x: { type: 'noul', instructions: 'Yes?' } } }, { signal: new AbortController().signal });
    assert.equal(answer.answers.x.noul, 0.9);
    assert.equal(endpoint, 'https://api.typesafe.ai/v1/systemone');
    assert.ok((await ctx.skills.list()).some(skill => skill.name === 'jev-decision'));
    await fiber.dispose();
    assert.equal(ctx.tools.schemas().filter(tool => tool.name.startsWith('jev_')).length, 0);
    assert.equal((await ctx.skills.list()).some(skill => skill.name === 'jev-decision'), false);
    assert.ok(resolved.length >= 3 && resolved.every(ref => ref === 'TYPESAFE_API_KEY'));
  } finally { globalThis.fetch = fetcher; await ctx.fiber.dispose(); }
});

test('provider config routes evaluate to the selected endpoint and credential', { skip: !runtime }, async () => {
  const { Context } = await import(pathToFileURL(createRequire(resolve(runtime, 'package.json')).resolve('@deepseek-ai/cordis')).href);
  const ctx = new Context();
  const resolved = [];
  ctx.provide('credentials', { resolve: async ref => {
    resolved.push(ref);
    return ref === 'OPENROUTER_API_KEY' ? { value: 'or-key', source: 'test' } : undefined;
  } });
  ctx.provide('settings', { configure: () => () => {} });
  const fetcher = globalThis.fetch;
  const seen = {};
  globalThis.fetch = async (url, options) => {
    seen.url = url;
    seen.model = JSON.parse(options.body).model;
    seen.auth = options.headers.authorization;
    return Response.json({ model: 'jev-test', answers: { x: { type: 'noul', noul: 0.4 } }, usage: { input_tokens: 10, output_tokens: 2 } });
  };
  try {
    const fiber = await mount(ctx, { provider: 'openrouter', openrouter: { baseURL: '', apiKeyRef: '', model: 'typesafe/jev-1.13' } });
    assert.equal(fiber.state, 2);
    const status = await ctx.tools.get('jev_status').execute({}, { signal: new AbortController().signal });
    assert.equal(status.provider, 'OpenRouter');
    assert.equal(status.endpoint, 'https://openrouter.ai/api/alpha/decisions');
    assert.equal(status.model, 'typesafe/jev-1.13');
    assert.equal(status.apiKeyRef, 'OPENROUTER_API_KEY');
    const answer = await ctx.tools.get('jev_evaluate').execute({ state: 'test', questions: { x: { type: 'noul', instructions: 'Yes?' } } }, { signal: new AbortController().signal });
    assert.equal(answer.provider, 'OpenRouter');
    assert.equal(seen.url, 'https://openrouter.ai/api/alpha/decisions');
    assert.equal(seen.model, 'typesafe/jev-1.13');
    assert.equal(seen.auth, 'Bearer or-key');
    assert.ok(resolved.length >= 2 && resolved.every(ref => ref === 'OPENROUTER_API_KEY'));
    await fiber.dispose();
  } finally { globalThis.fetch = fetcher; await ctx.fiber.dispose(); }
});

test('schema rejects unknown providers and defaults to typesafe', () => {
  const result = plugin.Config['~standard'].validate({ provider: 'unknown' });
  assert.ok(result.issues?.some(issue => issue.path.join('.').includes('provider')), JSON.stringify(result));
  const valid = plugin.Config['~standard'].validate({});
  assert.equal(valid.value.provider.get(), 'typesafe');
  assert.equal(valid.value.openrouter.get().baseURL, '');
});

test('native DSH CLI installs the tarball bundle and removes its configuration', { skip: !runtime || process.env.DSH_CLI_TEST !== '1', timeout: 30_000 }, async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'jev-dsh-cli-'));
  const cli = resolve(runtime, 'lib/bin.js');
  const run = async args => (await promisify(execFile)(process.execPath, [cli, ...args], { env: { ...process.env, DSH_HOME: root }, timeout: 20_000 })).stdout;
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const archive = new URL(`../dist/${manifest.name}-${manifest.version}.tgz`, import.meta.url);
  try {
    await run(['plugin', '--profile', 'jev-test', 'add', fileURLToPath(archive)]);
    const config = await run(['--profile', 'jev-test', '--dump-config']);
    assert.match(config, /name: dsh-jev-decision-model/);
    await run(['plugin', '--profile', 'jev-test', 'remove', 'dsh-jev-decision-model']);
    assert.doesNotMatch(await run(['--profile', 'jev-test', '--dump-config']), /name: dsh-jev-decision-model/);
    const profile = JSON.parse(await readFile(resolve(root, 'profiles/jev-test/package.json'), 'utf8'));
    assert.ok(!profile.dependencies?.['dsh-jev-decision-model']);
    assert.deepEqual(profile.dsh.profile.bundles, ['@deepseek-ai/dsh-base']);
  } finally { await rm(root, { recursive: true, force: true }); }
});
