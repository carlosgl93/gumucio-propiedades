// functions/src/verifyDocument/rules/geminiClient.ts
import { GoogleGenAI } from '@google/genai';

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

export interface GeminiVisionClient {
  vision: {
    generate: (params: VisionGenerateParams) => Promise<VisionResponse>;
  };
}

export interface ClientFactoryOpts {
  apiKey: string;
}

export type ClientFactory = (opts: ClientFactoryOpts) => GeminiVisionClient;

export const defaultClientFactory: ClientFactory = ({ apiKey }) => {
  const ai = new GoogleGenAI({ apiKey });
  return {
    vision: {
      generate: async ({ model, prompt, imageBase64 }) => {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: 'image/png',
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
        });
        return { text: response.text ?? '' };
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

export function createClient(opts: ClientFactoryOpts): GeminiVisionClient {
  return currentFactory(opts);
}
