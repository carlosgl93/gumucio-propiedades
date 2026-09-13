// functions/src/verifyDocument/rules/minimaxClient.ts
// Thin wrapper around the MiniMax vision API. MiniMax exposes an OpenAI-
// compatible endpoint, so we use the `openai` SDK pointed at
// https://api.minimax.io/v1. The real HTTP impl lives behind
// `defaultClientFactory`; tests can override via `setClientFactory`.

import OpenAI from 'openai';

export interface VisionGenerateParams {
  model: string;
  prompt: string;
  imageBase64: string;
  responseFormat: 'json';
  signal?: AbortSignal;
}

export interface VisionResponse {
  text: string;
}

export interface MiniMaxClient {
  vision: {
    generate: (params: VisionGenerateParams) => Promise<VisionResponse>;
  };
}

export interface ClientFactoryOpts {
  apiKey: string;
}

export type ClientFactory = (opts: ClientFactoryOpts) => MiniMaxClient;

const MINIMAX_BASE_URL = 'https://api.minimax.io/v1';

/**
 * Default factory: builds a real MiniMax vision client using the OpenAI SDK.
 * Sends the prompt + the PDF render as a chat completion with the image
 * attached via data URL.
 */
export const defaultClientFactory: ClientFactory = ({ apiKey }) => {
  const openai = new OpenAI({ apiKey, baseURL: MINIMAX_BASE_URL });
  return {
    vision: {
      generate: async ({ model, prompt, imageBase64, signal }) => {
        const res = await openai.chat.completions.create(
          {
            model,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } },
                ],
              },
            ],
          },
          { signal },
        );
        const text = res.choices[0]?.message?.content ?? '';
        return { text: typeof text === 'string' ? text : JSON.stringify(text) };
      },
    },
  };
};

let currentFactory: ClientFactory = defaultClientFactory;

export function setClientFactory(factory: ClientFactory): void {
  currentFactory = factory;
}

export function resetClientFactory(): void {
  currentFactory = defaultClientFactory;
}

export function createClient(opts: ClientFactoryOpts): MiniMaxClient {
  return currentFactory(opts);
}
