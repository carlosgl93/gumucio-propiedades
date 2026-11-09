import { logger } from 'firebase-functions';

import { createClient } from './geminiClient';
import type { LlmPromptParts } from './llmPrompt';
import type { LlmEvaluation } from './types';
import type { DocType } from '../extractors/types';

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MODEL = 'gemini-3.5-flash';

export interface LlmEvalOptions {
  timeoutMs?: number;
}

export async function llmEvaluate(
  _imageBuf: Buffer,
  prompt: LlmPromptParts,
  _type: DocType,
  opts: LlmEvalOptions = {},
): Promise<LlmEvaluation | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.warn('GEMINI_API_KEY not set; LLM eval disabled');
    return null;
  }

  const client = createClient({ apiKey });
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await callWithTimeout(client, prompt, timeoutMs);
      const parsed = parseLlmResponse(res.text);
      if (parsed) return parsed;
      logger.warn(`LLM eval attempt ${attempt}: invalid JSON, retrying. raw=${res.text?.slice(0, 200)}`);
    } catch (err) {
      logger.warn(`LLM eval attempt ${attempt} failed:`, err);
      if (attempt === 2) return null;
    }
  }
  return null;
}

async function callWithTimeout(
  client: ReturnType<typeof createClient>,
  prompt: LlmPromptParts,
  timeoutMs: number,
): Promise<{ text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await client.vision.generate({
      model: DEFAULT_MODEL,
      prompt: prompt.text,
      imageBase64: prompt.imageBase64,
      responseFormat: 'json',
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

function parseLlmResponse(text: string | undefined): LlmEvaluation | null {
  if (!text) return null;
  // Strip code fences and reasoning blocks if present.
  const cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/^```json|^```|```$/gm, '')
    .trim();
  const candidates: string[] = [cleaned];
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(cleaned.slice(firstBrace, lastBrace + 1));
  }
  for (const candidate of candidates) {
    let obj: unknown;
    try {
      obj = JSON.parse(candidate);
    } catch {
      continue;
    }
    if (!obj || typeof obj !== 'object') continue;
    const o = obj as Record<string, unknown>;
    const score = Number(o.score);
    const confidence = Number(o.confidence);
    if (Number.isNaN(score) || Number.isNaN(confidence)) continue;
    const flags = Array.isArray(o.flags) ? o.flags.map(String) : [];
    return {
      score: Math.max(0, Math.min(15, score)),
      flags,
      confidence,
    };
  }
  return null;
}
