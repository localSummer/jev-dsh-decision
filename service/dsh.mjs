import { readFile } from 'node:fs/promises';
import z from '@deepseek-ai/schemastery';
import { createJevActions, providerConfig } from './jev.mjs';

export const name = 'jev-decision-model';
export const inject = ['tools', 'credentials', 'skills'];

const section = () => z.object({
  baseURL: z.string().description('覆盖 API 根地址，留空用官方默认'),
  apiKeyRef: z.string().role('credential-ref').description('凭据引用名，留空用官方默认'),
  model: z.string().description('覆盖模型名，留空用官方默认'),
}).default({ baseURL: '', apiKeyRef: '', model: '' }).volatile();

/** Settings pages write one top-level section per edit; volatile fields apply live without remount. */
export const Config = z.object({
  provider: z.union([z.const('typesafe'), z.const('openrouter'), z.const('bocha')]).default('typesafe').volatile().description('生效的 Jev Provider'),
  typesafe: section(),
  openrouter: section(),
  bocha: section(),
});

/** Resolve top-level volatile references to plain values; direct construction bypasses the Loader wrapper. */
function snapshot(config) {
  return Object.fromEntries(Object.entries(config ?? {}).map(([key, value]) => {
    const ref = value;
    return [key, typeof ref?.get === 'function' ? ref.get() : value];
  }));
}

export async function apply(ctx, config) {
  const manifest = JSON.parse(await readFile(new URL('../ipollowork.plugin.json', import.meta.url), 'utf8'));
  const skillFile = await readFile(new URL('../skills/jev-decision/SKILL.md', import.meta.url), 'utf8');
  const current = () => {
    const value = snapshot(config);
    return providerConfig(value.provider, value[value.provider] ?? {});
  };
  const service = createJevActions({
    getConfig: current,
    getApiKey: async () => (await ctx.credentials.resolve(current().apiKeyRef))?.value,
  });
  ctx.effect(() => service.dispose);
  // The bundled client renders its own settings section; disable the schema-generated form.
  ctx.inject(['settings'], child => {
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber));
  });
  const resource = manifest.resources.find(item => item.type === 'local-service');
  for (const action of resource.actions) {
    ctx.tools.register({
      name: `jev_${action.id.replaceAll('-', '_')}`,
      description: action.description,
      parameters: action.inputSchema,
      output: {
        schema: { type: 'object', additionalProperties: true },
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
      },
      timeoutMs: 25_000,
      isConcurrencySafe: () => true,
      execute: (args, exec) => service.actions[action.id](args, { signal: exec.signal }),
    });
  }
  const skill = manifest.resources.find(item => item.type === 'skill');
  ctx.skills.register({
    name: skill.id,
    description: skill.description,
    content: skillFile.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim(),
    source: 'bundled',
  });
}
