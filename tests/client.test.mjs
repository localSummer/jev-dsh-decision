import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * Minimal component runtime: a realize() pass that executes function/memo
 * components, per-instance hook stores keyed by tree path, dependency-aware
 * effects and value-identity setState bail-out. Enough to drive the settings
 * section's edit → save flow without real React.
 */
function createHooksReact() {
  const stores = new Map();
  const pendingEffects = [];
  const scheduled = new Set();
  let current = null;
  let rootRender = null;
  const react = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    memo: fn => ({ memoized: fn }),
    useCallback: (fn, deps) => {
      const slot = current.slots[current.index] ?? { deps: undefined, fn: undefined };
      const changed = !deps || !slot.deps || deps.length !== slot.deps.length
        || deps.some((item, i) => !Object.is(item, slot.deps[i]));
      if (changed) { slot.deps = deps; slot.fn = fn; }
      current.slots[current.index] = slot;
      current.index += 1;
      return slot.fn;
    },
    useEffect: (effect, deps) => {
      const slot = current.slots[current.index] ?? { deps: undefined };
      const changed = !deps || !slot.deps || deps.length !== slot.deps.length
        || deps.some((item, i) => !Object.is(item, slot.deps[i]));
      slot.deps = deps;
      current.slots[current.index] = slot;
      current.index += 1;
      if (changed) pendingEffects.push(effect);
    },
    useRef: value => {
      const slot = current.slots[current.index] ?? { ref: { current: value } };
      current.slots[current.index] = slot;
      current.index += 1;
      return slot.ref;
    },
    useState: (initial) => {
      const slot = current.slots[current.index] ?? { value: typeof initial === 'function' ? initial() : initial };
      current.slots[current.index] = slot;
      current.index += 1;
      return [slot.value, (next) => {
        const value = typeof next === 'function' ? next(slot.value) : next;
        if (Object.is(value, slot.value)) return;
        slot.value = value;
        scheduled.add(rerun);
      }];
    },
  };
  function realize(node, path) {
    if (node == null || typeof node !== 'object') return node;
    if (Array.isArray(node)) return node.flatMap(item => realize(item, path));
    const { type, props } = node;
    if (typeof type === 'string') return { ...node, children: (node.children ?? []).flatMap(item => realize(item, path)) };
    const fn = type.memoized || type;
    const childPath = `${path}/${props?.key ?? fn.name ?? ''}`;
    const store = stores.get(childPath) ?? { slots: [], index: 0 };
    store.index = 0;
    stores.set(childPath, store);
    const parent = current;
    current = store;
    const output = fn(props);
    current = parent;
    return realize(output, childPath);
  }
  async function rerun() {
    if (!rootRender) return;
    scheduled.delete(rerun);
    current = null;
    realizedTree = realize(rootRender(), 'root');
    const effects = pendingEffects.splice(0);
    for (const effect of effects) effect();
    // Effects may schedule another pass (a state landed).
    if (scheduled.size) { for (const run of [...scheduled]) run(); }
  }
  let realizedTree = null;
  const flush = async () => { if (rootRender && !realizedTree) await rerun(); while (scheduled.size) await rerun(); };
  return {
    react,
    mount: (renderFn) => { rootRender = renderFn; },
    flush,
    tree: () => realizedTree,
  };
}

/** Load the client bundle with a stubbed module loader and externals. */
function loadClient(react) {
  const loaded = [];
  globalThis.window = { __ModuleLoader__: { load: definition => loaded.push(definition) } };
  const styleTags = [];
  globalThis.document = {
    querySelector: () => null,
    createElement: () => ({ dataset: {}, style: {}, set textContent(value) { this._text = value; } }),
    head: { appendChild: tag => styleTags.push(tag) },
  };
  // SaveFlash's effect uses rAF; node:test has none.
  globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  const primitives = { IconCloseFillMedium: 'icon-close' };
  const requireStub = name => {
    if (name === 'react') return react;
    if (name === '@deepseek-ai/dsh-client-ui-primitives') return primitives;
    throw new Error(`unexpected require: ${name}`);
  };
  const bundle = readFileSync(new URL('../service/client.js', import.meta.url), 'utf8');
  new Function('window', 'require', bundle)(globalThis.window, requireStub);
  return { exports: loaded[0].factory(requireStub), styleTags };
}

test('settings section keeps edits local until the user saves explicitly', async () => {
  const harness = createHooksReact();
  const { exports: client } = loadClient(harness.react);
  const registrations = [];
  // Host snapshot store: value starts default; set() persists and re-notifies.
  let snapshot = { status: 'ready', writable: true, value: {}, revision: 1 };
  const listeners = new Set();
  const scope = {
    getSnapshot: () => snapshot,
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    set: async (field, value) => {
      snapshot = { ...snapshot, value: { ...snapshot.value, [field]: value }, revision: snapshot.revision + 1 };
      for (const listener of listeners) listener();
      return true;
    },
  };
  // Credential store: set/unset/describe over an in-memory map.
  // describe answers with the remote wire envelope {ok, value}, like the host.
  const storedKeys = new Map();
  const credentials = {
    describe: async (refs) => ({ ok: true, value: Object.fromEntries((Array.isArray(refs) ? refs : [refs]).map(ref =>
      [ref, { configured: storedKeys.has(ref), writable: true }])) }),
    set: async (ref, value) => { storedKeys.set(ref, value); },
    unset: async (ref) => { storedKeys.delete(ref); },
  };
  const ctx = {
    configForms: { get: () => scope },
    slots: { inject: (_slot, register) => register(), register: (spec, render) => { registrations.push({ spec, render }); return () => {}; } },
    remote: { credentials },
  };
  client.apply(ctx);
  const render = registrations[0].render;
  harness.mount(() => render(registrations[0].spec.inject()));
  await harness.flush();

  const walk = (node, visit) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const item of node) walk(item, visit); return; }
    visit(node);
    for (const child of node.children ?? []) walk(child, visit);
  };
  const findNode = (predicate) => {
    let found;
    walk(harness.tree(), node => { if (!found && predicate(node)) found = node; });
    return found;
  };
  const findInput = (label) => findNode(node => node.type === 'input' && node.props?.['aria-label'] === label);
  const saveButton = () => findNode(node => node.type === 'button' && node.props?.className === 'jev-stg-savebtn');

  // Initial: defaults, save button idle/disabled (nothing dirty).
  assert.equal(findInput('模型').props.value, '');
  assert.equal(saveButton().props.disabled, true);
  assert.equal(snapshot.revision, 1);

  // Edit model of the active provider: stays local, button enabled, nothing written.
  findInput('模型').props.onChange({ target: { value: 'jev-fixed' } });
  await harness.flush();
  assert.equal(findInput('模型').props.value, 'jev-fixed');
  assert.equal(saveButton().props.disabled, false);
  assert.equal(snapshot.revision, 1, 'no write before explicit save');

  // Switching provider stays in the draft too.
  const bochaTab = findNode(node => node.type === 'button' && node.children?.[0] === '博查');
  bochaTab.props.onClick();
  await harness.flush();
  assert.equal(findInput('API 根地址').props.placeholder, 'https://jev.bocha.cn');
  assert.equal(snapshot.revision, 1, 'provider switch stays local');

  // Save: provider + the dirty typesafe section are written; clean sections are not.
  await saveButton().props.onClick();
  await harness.flush();
  assert.equal(snapshot.value.provider, 'bocha');
  assert.deepEqual(snapshot.value.typesafe, { baseURL: '', apiKeyRef: '', model: 'jev-fixed' });
  assert.equal(snapshot.value.openrouter, undefined, 'untouched section not written');
  assert.equal(saveButton().props.disabled, true, 'clean after save lands');

  // API key: staging alone enables save; save writes the credential store, not the config.
  const keyInput = () => findInput('API Key');
  assert.equal(keyInput().props.value, '');
  let configuredTag;
  configuredTag = findNode(node => node.type === 'span' && node.props?.className === 'jev-stg-tag' && node.children?.[0] === '未配置');
  assert.ok(configuredTag, 'starts unconfigured');
  keyInput().props.onChange({ target: { value: 'sk-fixture' } });
  await harness.flush();
  assert.equal(saveButton().props.disabled, false, 'staged key enables save');
  await saveButton().props.onClick();
  await harness.flush();
  assert.equal(storedKeys.get('BOCHA_JEV_API_KEY'), 'sk-fixture', 'key written to credential store');
  assert.equal(snapshot.value.bocha, undefined, 'key never lands in the config section');
  assert.equal(keyInput().props.value, '', 'input cleared after save');
  configuredTag = findNode(node => node.type === 'span' && node.props?.className === 'jev-stg-tag' && node.children?.[0] === '已配置');
  assert.ok(configuredTag, 'shows configured after save');

  // Switch away and back: a fresh describe must still report the stored key.
  findNode(node => node.type === 'button' && node.children?.[0] === 'TypeSafe AI').props.onClick();
  await harness.flush();
  findNode(node => node.type === 'button' && node.children?.[0] === '博查').props.onClick();
  await harness.flush();
  configuredTag = findNode(node => node.type === 'span' && node.props?.className === 'jev-stg-tag' && node.children?.[0] === '已配置');
  assert.ok(configuredTag, 'still configured after switching away and back');

  // Clear: removes the stored credential immediately.
  const clearKey = findNode(node => node.type === 'button' && node.props?.['aria-label'] === '清除已保存的 API Key');
  await clearKey.props.onClick();
  await harness.flush();
  assert.equal(storedKeys.has('BOCHA_JEV_API_KEY'), false, 'clear removes the credential');
});

test('client bundle exports a settings-section plugin and registers it against the jev entry', () => {
  const staticReact = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    memo: fn => ({ memoized: fn }),
    useCallback: fn => fn,
    useEffect: () => {},
    useRef: value => ({ current: value }),
    useState: value => [value, () => {}],
  };
  const { exports: client, styleTags } = loadClient(staticReact);
  assert.equal(client.name, 'jev-decision-client');
  assert.deepEqual(client.inject, ['slots', 'configForms', 'remote', 'remote.credentials']);
  const registrations = [];
  const scope = { getSnapshot: () => ({ status: 'ready', writable: true, value: {} }), subscribe: () => () => {}, set: async () => true };
  const fakeCredentials = { describe: async () => ({ ok: true, value: {} }), set: async () => {}, unset: async () => {} };
  const ctx = {
    configForms: { get: id => { assert.equal(id, 'jev-decision-model'); return scope; } },
    remote: { credentials: fakeCredentials },
    slots: {
      inject: (_slot, register) => { register(); },
      register: (spec, render) => { registrations.push({ spec, render }); return () => {}; },
    },
  };
  client.apply(ctx);
  assert.equal(styleTags.length, 1, 'style tag injected once');
  assert.match(styleTags[0]._text, /\.jev-stg-page/);
  assert.equal(registrations.length, 1);
  const { spec, render } = registrations[0];
  assert.equal(spec.name, 'settings.section');
  assert.equal(spec.id, 'dsh-jev-decision-model');
  assert.equal(spec.label(), 'Jev 决策引擎');
  assert.deepEqual(spec.inject(), { settingsScope: scope, credentials: fakeCredentials });
  const element = render({ settingsScope: scope, credentials: fakeCredentials });
  assert.equal(element.type.memoized.name, 'SettingsSection');
  assert.equal(element.props.settingsScope, scope);
});
