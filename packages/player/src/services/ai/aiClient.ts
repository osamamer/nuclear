import omit from 'lodash-es/omit';
import { z } from 'zod';

import { getSetting } from '../../stores/settingsStore';
import type { AiBackend } from '../tauri/bindings';
import { commands } from '../tauri/bindings';
import { unwrapResult } from '../tauri/results';

export type AiBackendSetting = AiBackend | 'auto' | 'off';

const readBackendSetting = (): AiBackendSetting =>
  (getSetting('core.ai.backend') as AiBackendSetting | undefined) ?? 'auto';

const readApiKey = (): string =>
  ((getSetting('core.ai.anthropicApiKey') as string | undefined) ?? '').trim();

const readModel = (): string | null => {
  const model = (
    (getSetting('core.ai.model') as string | undefined) ?? ''
  ).trim();
  return model.length > 0 ? model : null;
};

export const resolveAiBackend = async (): Promise<AiBackend | null> => {
  const setting = readBackendSetting();
  if (setting === 'off') {
    return null;
  }
  if (setting !== 'auto') {
    return setting;
  }
  const availability = await commands.aiDetectBackends();
  if (availability.claudeCli) {
    return 'claudeCli';
  }
  if (availability.codexCli) {
    return 'codexCli';
  }
  if (readApiKey()) {
    return 'anthropicApi';
  }
  return null;
};

export const extractJson = (text: string): unknown => {
  const withoutFences = text.replace(/```(?:json)?/gi, '');
  const start = withoutFences.indexOf('{');
  const end = withoutFences.lastIndexOf('}');
  if (start === -1 || end <= start) {
    throw new Error('The AI assistant did not return JSON');
  }
  return JSON.parse(withoutFences.slice(start, end + 1));
};

export type AskAiJsonOptions<T> = {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
};

export const askAiJson = async <T>({
  system,
  prompt,
  schema,
}: AskAiJsonOptions<T>): Promise<T> => {
  const backend = await resolveAiBackend();
  if (!backend) {
    throw new Error('No AI assistant is configured');
  }

  const text = unwrapResult(
    await commands.aiComplete({
      backend,
      system,
      prompt,
      jsonSchema: JSON.stringify(omit(z.toJSONSchema(schema), '$schema')),
      apiKey: backend === 'anthropicApi' ? readApiKey() : null,
      model: readModel(),
    }),
  );
  return schema.parse(extractJson(text));
};
