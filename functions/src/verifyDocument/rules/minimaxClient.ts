// functions/src/verifyDocument/rules/minimaxClient.ts
// Thin wrapper around the MiniMax vision SDK. The real package name `minimax`
// does not exist on npm; this module is the local seam that production code
// and tests both target. Real HTTP / SDK impl lives behind `defaultClientFactory`.

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

/**
 * Default factory: throws because the real SDK is not wired up yet.
 * Production code is expected to override this via {@link setClientFactory}
 * once the real MiniMax SDK / HTTP client is integrated.
 */
export const defaultClientFactory: ClientFactory = () => {
  throw new Error(
    'MiniMax client not configured. Install the real SDK or implement an HTTP client and call setClientFactory().',
  );
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
