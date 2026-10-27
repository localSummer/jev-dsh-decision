import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/** Load the client bundle with a stubbed module loader and externals; no real React needed. */
function loadClient() {
  const loaded = [];
  globalThis.window = { __ModuleLoader__: { load: definition => loaded.push(definition) } };
  const styleTags = [];
  globalThis.document = {
    querySelector: () => null,
    createElement: () => ({ dataset: {}, style: {}, set textContent(value) { this._text = value; } }),
    head: { appendChild: tag => styleTags.push(tag) },
  };
  const react = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    memo: fn => ({ memoized: fn }),
    useCallback: fn => fn,
    useEffect: () => {},
    useRef: value => ({ current: value }),
    useState: value => [value, () => {}],
  };
  const primitives = { IconCloseFillMedium: 'icon-close' };
  const bundle = readFileSync(new URL('../service/client.js', import.meta.url), 'utf8');
  new Function('window', 'require', bundle)(globalThis.window, name =>
    name === 'react' ? react : name === '@deepseek-ai/dsh-client-ui-primitives' ? primitives : (() => { throw new Error(`unexpected require: ${name}`); })());
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].id, 'dsh-jev-decision-model');
  return { exports: loaded[0].factory(name => (name === 'react' ? react : primitives)), react, styleTags };
}

test('client bundle exports a settings-section plugin and registers it against the jev entry', () => {
  const { exports: client, react, styleTags } = loadClient();
  assert.equal(client.name, 'jev-decision-client');
  assert.deepEqual(client.inject, ['slots', 'configForms']);
  const registrations = [];
  const scope = { getSnapshot: () => ({ status: 'ready', writable: true, value: {} }), subscribe: () => () => {}, set: async () => true };
  const ctx = {
    configForms: { get: id => { assert.equal(id, 'jev-decision-model'); return scope; } },
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
  assert.deepEqual(spec.inject(), { settingsScope: scope });
  const element = render({ settingsScope: scope });
  assert.equal(element.type.memoized.name, 'SettingsSection');
  assert.equal(element.props.settingsScope, scope);
});
