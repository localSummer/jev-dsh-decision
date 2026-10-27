// Jev DSH 决策引擎 — 浏览器半。手写零构建 client bundle：window.__ModuleLoader__
// 工厂格式，react/primitives 由 shell 冻结模块表提供。
window.__ModuleLoader__.load({
  id: 'dsh-jev-decision-model',
  factory: (require) => {
    const module = { exports: {} };
    const exports = module.exports;
    const React = require('react');
    const P = require('@deepseek-ai/dsh-client-ui-primitives');
    const { createElement: h, memo, useCallback, useEffect, useRef, useState } = React;

    const ENTRY_ID = 'jev-decision-model';
    const PLUGIN_ID = 'dsh-jev-decision-model';
    const TAG_ID = 'dsh-jev-decision-model/styles.css';

    // 官方默认值，仅用于展示与 placeholder；生效值由 host 半归一化。
    const PROVIDERS = {
      typesafe: { label: 'TypeSafe AI', baseURL: 'https://api.typesafe.ai', model: 'jev-latest', apiKeyRef: 'TYPESAFE_API_KEY' },
      openrouter: { label: 'OpenRouter', baseURL: 'https://openrouter.ai/api', model: 'typesafe/jev-latest', apiKeyRef: 'OPENROUTER_API_KEY' },
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
      const value = (ready ? snap.value : undefined) || {};
      const provider = value.provider || 'typesafe';
      const section = value[provider] || {};
      const disabled = !writable;
      const [savedAt, setSavedAt] = useState(0);

      // 写入失败静默：snap 不变，界面仍是旧值（与 mnemo 相同的契约）。
      const write = useCallback((field, next) => {
        scope.set(field, next).then((accepted) => { if (accepted) setSavedAt(Date.now()); }).catch(() => {});
      }, [scope]);
      // 待落盘 patch 按 section 累积：同 section 跨字段快改不互相吞写。
      const timers = useRef({});
      const pending = useRef({});
      const latest = useRef(section);
      latest.current = section;
      useEffect(() => () => { for (const t of Object.values(timers.current)) clearTimeout(t); }, []);
      const commitField = useCallback((field, next) => {
        pending.current[field] = next;
        clearTimeout(timers.current[field]);
        timers.current[field] = setTimeout(() => {
          const patch = { ...(latest.current || {}), ...pending.current };
          pending.current = {};
          write(provider, patch);
        }, 350);
      }, [provider, write]);
      const clearField = useCallback((field) => {
        clearTimeout(timers.current[field]);
        delete pending.current[field];
        write(provider, { ...(latest.current || {}), [field]: '' });
      }, [provider, write]);

      const onProvider = useCallback((key) => { write('provider', key); }, [write]);

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
            disabled, onCommit: (v) => commitField(field, v), onClear: () => clearField(field) })),
        h('p', { className: 'jev-stg-hint' },
          '密钥值不在设置页填写：在 DSH 凭据管理或启动环境中配置上表引用名对应的 API Key，然后对助手说',
          h('code', null, '使用 Jev，先检查配置，再测试连接'), '。'));
    });

    const name = 'jev-decision-client';
    const inject = ['slots', 'configForms'];

    function apply(ctx) {
      injectStyles();
      const scope = ctx.configForms.get(ENTRY_ID);
      ctx.slots.inject('settings.section', () =>
        ctx.slots.register({
          name: 'settings.section',
          id: 'dsh-jev-decision-model',
          order: 59,
          label: () => 'Jev 决策引擎',
          inject: () => ({ settingsScope: scope }),
        }, (props) => h(SettingsSection, props)));
    }

    exports.apply = apply;
    exports.inject = inject;
    exports.name = name;
    return module.exports;
  },
});
