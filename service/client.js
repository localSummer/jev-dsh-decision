// Jev DSH 决策引擎 — 浏览器半。手写零构建 client bundle：window.__ModuleLoader__
// 工厂格式，react/primitives 由 shell 冻结模块表提供。
window.__ModuleLoader__.load({
  id: 'dsh-jev-decision-model',
  factory: (require) => {
    const module = { exports: {} };
    const exports = module.exports;
    const React = require('react');
    const P = require('@deepseek-ai/dsh-client-ui-primitives');
    const { createElement: h, memo, useCallback, useEffect, useState } = React;

    const ENTRY_ID = 'jev-decision-model';
    const PLUGIN_ID = 'dsh-jev-decision-model';
    const TAG_ID = 'dsh-jev-decision-model/styles.css';

    // 官方默认值，仅用于展示与 placeholder；生效值由 host 半归一化。
    const PROVIDERS = {
      typesafe: { label: 'TypeSafe AI', baseURL: 'https://api.typesafe.ai', model: 'jev-latest', apiKeyRef: 'TYPESAFE_API_KEY' },
      openrouter: { label: 'OpenRouter', baseURL: 'https://openrouter.ai/api', model: '~typesafe/jev-latest', apiKeyRef: 'OPENROUTER_API_KEY' },
      bocha: { label: '博查', baseURL: 'https://jev.bocha.cn', model: 'bocha-jev-v1', apiKeyRef: 'BOCHA_JEV_API_KEY' },
    };
    const ORDER = ['typesafe', 'openrouter', 'bocha'];
    const FIELDS = [
      ['model', '模型'],
      ['baseURL', 'API 根地址'],
      ['apiKeyRef', '凭据引用名'],
    ];

    const CSS = [
      '.jev-stg-page{display:flex;flex-direction:column;gap:20px;max-width:640px}',
      '.jev-stg-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}',
      '.jev-stg-title{margin:0;font-size:16px;font-weight:600;line-height:24px;color:var(--dsw-alias-label-primary)}',
      '.jev-stg-desc{margin:4px 0 0;font-size:12.5px;line-height:18px;color:var(--dsw-alias-label-tertiary)}',
      '.jev-stg-save{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--dsw-alias-state-success-secondary);opacity:0;transform:translateY(2px);transition:opacity .2s ease,transform .2s ease}',
      '.jev-stg-save[data-show]{opacity:1;transform:none}',
      '.jev-stg-save svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}',
      '.jev-stg-save path{stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset .3s ease .1s}',
      '.jev-stg-save[data-show] path{stroke-dashoffset:0}',
      '.jev-stg-gooey{display:flex;gap:2px;padding:3px;border-radius:10px;background:var(--dsw-alias-bg-layer-2);width:fit-content}',
      '.jev-stg-gooey[data-disabled]{opacity:.55;pointer-events:none}',
      '.jev-stg-gooey button{border:0;background:transparent;font:inherit;font-size:13px;line-height:20px;padding:5px 14px;border-radius:8px;color:var(--dsw-alias-label-secondary);cursor:pointer;transition:color .15s,background .15s,box-shadow .15s}',
      '.jev-stg-gooey button:hover{color:var(--dsw-alias-label-primary)}',
      '.jev-stg-gooey button.on{background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);box-shadow:0 1px 4px rgba(0,0,0,.14)}',
      '.jev-stg-field{display:flex;flex-direction:column;gap:6px}',
      '.jev-stg-fieldrow{display:flex;align-items:baseline;justify-content:space-between;gap:12px}',
      '.jev-stg-label{font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary);font-weight:500}',
      '.jev-stg-tag{font-size:11px;line-height:16px;color:var(--dsw-alias-label-caption);font-family:var(--dsw-font-mono,ui-monospace,Menlo,monospace)}',
      '.jev-stg-tag[data-overridden]{color:var(--dsw-alias-state-business-primary)}',
      '.jev-stg-inputwrap{display:flex;align-items:center;gap:6px}',
      '.jev-stg-input{flex:1;box-sizing:border-box;height:34px;padding:0 12px;font:inherit;font-size:13px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-3);border:.5px solid var(--dsw-alias-border-l4);border-radius:8px;outline:none;transition:border-color .15s,box-shadow .15s;min-width:0}',
      '.jev-stg-input:focus{border-color:var(--dsw-alias-state-business-primary);box-shadow:inset 0 0 0 .5px var(--dsw-alias-state-business-primary)}',
      '.jev-stg-input:disabled{opacity:.55}',
      '.jev-stg-clear{border:0;background:transparent;width:24px;height:24px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-caption);cursor:pointer;flex:none}',
      '.jev-stg-clear:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}',
      '.jev-stg-clear[data-hidden]{visibility:hidden}',
      '.jev-stg-hint{margin:0;font-size:12.5px;line-height:18px;color:var(--dsw-alias-label-tertiary)}',
      '.jev-stg-hint code{font-family:var(--dsw-font-mono,ui-monospace,Menlo,monospace);font-size:11.5px;background:var(--dsw-alias-bg-module-platform,rgba(127,127,127,.14));border-radius:4px;padding:1px 6px}',
      '.jev-stg-keyclear{border:none;background:transparent;font:inherit;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);cursor:pointer;padding:6px 8px;border-radius:6px;flex:none}',
      '.jev-stg-keyclear:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}',
      '.jev-stg-keyclear:disabled{opacity:.5;cursor:default}',
      '.jev-stg-savebar{display:flex;justify-content:flex-end}',
      '.jev-stg-savebtn{box-sizing:border-box;border:none;border-radius:var(--dsw-radius-md,8px);height:36px;padding:0 14px;font:inherit;font-size:14px;line-height:22px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:4px;background:var(--dsw-alias-button-primary-fill,var(--dsw-alias-state-business-primary));color:var(--dsw-alias-label-primary-foreground,#fff);transition:background .15s,opacity .15s}',
      '.jev-stg-savebtn:not(:disabled):hover{background:var(--dsw-alias-button-primary-hover,var(--dsw-alias-state-business-primary))}',
      '.jev-stg-savebtn:disabled{opacity:.4;cursor:default}',
      '.jev-stg-savebtn:disabled:not([data-state=saving]){background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);opacity:1}',
      '.jev-stg-savebtn:focus-visible{box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline:none}',
      '.jev-stg-savebtn[data-state=error]{background:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-primary-foreground,#fff)}',
    ].join('\n');

    function injectStyles() {
      if (document.querySelector(`style[data-plugin-css=${JSON.stringify(TAG_ID)}]`) === null) {
        const tag = document.createElement('style');
        tag.dataset.plugin = PLUGIN_ID;
        tag.dataset.pluginCss = TAG_ID;
        tag.textContent = CSS;
        document.head.appendChild(tag);
      }
    }

    const Icon = (comp, size) => h(comp, { size });

    const SaveFlash = memo(function SaveFlash(props) {
      const [show, setShow] = useState(false);
      useEffect(() => {
        if (!props.stamp) return;
        setShow(false);
        const raf = requestAnimationFrame(() => setShow(true));
        const t = setTimeout(() => setShow(false), 1800);
        return () => { cancelAnimationFrame(raf); clearTimeout(t); };
      }, [props.stamp]);
      return h('span', { className: 'jev-stg-save', 'data-show': show || undefined },
        h('svg', { viewBox: '0 0 16 16', 'aria-hidden': 'true' }, h('path', { d: 'M3.5 8.6l3.2 3.2 6-6.8', pathLength: 1 })),
        '已保存');
    });

    /** 单个文本字段行：行内草稿 + debounce 提交 + 清空回默认。 */
    const FieldRow = memo(function FieldRow(props) {
      const [draft, setDraft] = useState(props.value);
      useEffect(() => { setDraft(props.value); }, [props.value]);
      return h('div', { className: 'jev-stg-field' },
        h('div', { className: 'jev-stg-fieldrow' },
          h('span', { className: 'jev-stg-label' }, props.label),
          h('span', { className: 'jev-stg-tag', 'data-overridden': props.value ? '' : undefined, title: props.value ? '已覆盖官方默认' : '官方默认' }, props.value ? props.value : `默认 ${props.fallback}`)),
        h('div', { className: 'jev-stg-inputwrap' },
          h('input', { className: 'jev-stg-input', value: draft, disabled: props.disabled,
            placeholder: props.fallback, 'aria-label': props.label,
            onChange: (e) => { setDraft(e.target.value); props.onCommit(e.target.value); } }),
          h('button', { type: 'button', className: 'jev-stg-clear', 'aria-label': `清空${props.label}`,
            'data-hidden': draft === '' || undefined, disabled: props.disabled,
            onClick: () => { setDraft(''); props.onClear(); } }, Icon(P.IconCloseFillMedium, 12))));
    });

    /** API Key 行：暂存输入，保存时写入宿主凭据存储（不落配置文件）。 */
    const KeyField = memo(function KeyField(props) {
      const [draft, setDraft] = useState('');
      // Reset the staged input whenever the credential state flips (saved, cleared, ref changed).
      useEffect(() => { setDraft(''); }, [props.refName, props.configured]);
      return h('div', { className: 'jev-stg-field' },
        h('div', { className: 'jev-stg-fieldrow' },
          h('span', { className: 'jev-stg-label' }, 'API Key'),
          h('span', { className: 'jev-stg-tag', 'data-overridden': props.configured ? '' : undefined }, props.configured ? '已配置' : '未配置')),
        h('div', { className: 'jev-stg-inputwrap' },
          h('input', { type: 'password', className: 'jev-stg-input', value: draft, disabled: props.disabled,
            placeholder: '留空保持当前密钥', 'aria-label': 'API Key', autoComplete: 'new-password',
            onChange: (e) => { setDraft(e.target.value); props.onStage(e.target.value); } }),
          props.configured ? h('button', { type: 'button', className: 'jev-stg-keyclear', disabled: props.disabled,
            'aria-label': '清除已保存的 API Key', onClick: props.onClear }, '清除') : null));
    });

    const EMPTY_SECTION = { baseURL: '', apiKeyRef: '', model: '' };
    /** Normalize a host snapshot into the four draft keys, filling absent sections. */
    const normalize = (value) => ({
      provider: value?.provider || 'typesafe',
      typesafe: { ...EMPTY_SECTION, ...(value?.typesafe || {}) },
      openrouter: { ...EMPTY_SECTION, ...(value?.openrouter || {}) },
      bocha: { ...EMPTY_SECTION, ...(value?.bocha || {}) },
    });

    const SettingsSection = memo(function SettingsSection(props) {
      const scope = props.settingsScope;
      const [snap, setSnap] = useState(null);
      useEffect(() => {
        const read = () => { try { setSnap(scope.getSnapshot()); } catch { /* */ } };
        read();
        return scope.subscribe(read);
      }, [scope]);
      const ready = snap !== null && snap.status === 'ready';
      const writable = ready ? snap.writable !== false : false;
      const committed = ready ? normalize(snap.value) : null;
      const disabled = !writable;
      const [savedAt, setSavedAt] = useState(0);
      const [saveState, setSaveState] = useState('idle');

      // Edits stay local until the user saves; a new snapshot (external change
      // or our own save landing) resets the draft to it.
      const [draft, setDraft] = useState(null);
      useEffect(() => { setDraft(committed); }, [snap]);
      const current = draft ?? committed ?? normalize(undefined);
      const provider = current.provider;
      const section = current[provider];
      const dirty = committed !== null && JSON.stringify(current) !== JSON.stringify(committed);

      // Credential state for the active reference; describe on ref change.
      const credentials = props.credentials;
      const refName = (section.apiKeyRef || PROVIDERS[provider].apiKeyRef).trim();
      const [credential, setCredential] = useState(null);
      const readCredential = useCallback(async () => {
        try {
          // Remote wire answers with an {ok, value} envelope, not a bare map.
          const response = await credentials.describe([refName]);
          setCredential(response?.value?.[refName] ?? { configured: false, writable: false });
        } catch { /* leave stale */ }
      }, [credentials, refName]);
      useEffect(() => { setCredential(null); readCredential(); }, [readCredential]);
      // Key staged for the next save; '' keeps the currently stored key.
      const [stagedKey, setStagedKey] = useState('');
      useEffect(() => { setStagedKey(''); }, [refName]);
      const keyDirty = stagedKey.trim() !== '';
      const hasChanges = dirty || keyDirty;

      const onProvider = useCallback((key) => {
        setDraft((prev) => ({ ...(prev ?? committed), provider: key }));
      }, [committed]);
      const onField = useCallback((field, value) => {
        setDraft((prev) => {
          const base = prev ?? committed;
          return { ...base, [base.provider]: { ...base[base.provider], [field]: value } };
        });
      }, [committed]);
      const onClearKey = useCallback(async () => {
        try { await credentials.unset(refName); await readCredential(); } catch { /* */ }
      }, [credentials, readCredential, refName]);

      const save = useCallback(async () => {
        if (!hasChanges || saveState === 'saving') return;
        setSaveState('saving');
        try {
          for (const key of ['provider', 'typesafe', 'openrouter', 'bocha']) {
            if (JSON.stringify(current[key]) !== JSON.stringify(committed[key])) {
              const accepted = await scope.set(key, current[key]);
              if (!accepted) throw new Error('refused');
            }
          }
          if (keyDirty) {
            await credentials.set(refName, stagedKey.trim());
            setStagedKey('');
            await readCredential();
          }
          setSaveState('idle');
          setSavedAt(Date.now());
        } catch {
          setSaveState('error');
          setTimeout(() => setSaveState('idle'), 2500);
        }
      }, [committed, credentials, current, hasChanges, keyDirty, readCredential, refName, saveState, scope, stagedKey]);

      return h('div', { className: 'jev-stg-page' },
        h('div', { className: 'jev-stg-head' },
          h('div', null,
            h('h3', { className: 'jev-stg-title' }, 'Jev 决策引擎'),
            h('p', { className: 'jev-stg-desc' }, '结构化决策：在 TypeSafe AI、OpenRouter、博查之间选择一家生效，辅助工具、Skill 与 Agent 的选择和评估。')),
          h(SaveFlash, { stamp: savedAt })),
        h('div', { className: 'jev-stg-gooey', role: 'tablist', 'aria-label': 'Jev Provider', 'data-disabled': disabled || undefined },
          ORDER.map(id => h('button', { key: id, type: 'button', role: 'tab',
            'aria-selected': id === provider, className: id === provider ? 'on' : '',
            disabled, onClick: () => { if (id !== provider) onProvider(id); } }, PROVIDERS[id].label))),
        FIELDS.map(([field, label]) =>
          h(FieldRow, { key: field, label, value: section[field] || '', fallback: PROVIDERS[provider][field],
            disabled, onCommit: (v) => onField(field, v), onClear: () => onField(field, '') })),
        h(KeyField, { key: 'key', refName, configured: Boolean(credential?.configured), disabled,
          onStage: setStagedKey, onClear: onClearKey }),
        h('p', { className: 'jev-stg-hint' },
          'API Key 保存到 DSH 凭据存储，不写入配置文件；也可在凭据管理或启动环境中配置。连接验证对助手说',
          h('code', null, '使用 Jev，先检查配置，再测试连接'), '。'),
        h('div', { className: 'jev-stg-savebar' },
          h('button', { type: 'button', className: 'jev-stg-savebtn', 'data-state': saveState,
            disabled: disabled || !hasChanges || saveState === 'saving', onClick: save },
            saveState === 'saving' ? '保存中…' : saveState === 'error' ? '保存失败，点此重试' : '保存修改')));
    });

    const name = 'jev-decision-client';
    const inject = ['slots', 'configForms', 'remote', 'remote.credentials'];

    function apply(ctx) {
      injectStyles();
      const scope = ctx.configForms.get(ENTRY_ID);
      ctx.slots.inject('settings.section', () =>
        ctx.slots.register({
          name: 'settings.section',
          id: 'dsh-jev-decision-model',
          order: 59,
          label: () => 'Jev 决策引擎',
          inject: () => ({ settingsScope: scope, credentials: ctx.remote.credentials }),
        }, (props) => h(SettingsSection, props)));
    }

    exports.apply = apply;
    exports.inject = inject;
    exports.name = name;
    return module.exports;
  },
});
