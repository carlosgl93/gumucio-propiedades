import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  setClientFactory,
  resetClientFactory,
  type GeminiVisionClient,
} from './geminiClient';
import { llmEvaluate } from './llmEval';
import type { LlmPromptParts } from './llmPrompt';

const fakePrompt: LlmPromptParts = {
  text: 'System instruction...',
  imageBase64: 'fake-png-base64',
};

const fakeClient: GeminiVisionClient = {
  vision: {
    generate: vi.fn(),
  },
};

describe('llmEvaluate', () => {
  const origEnv = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';
    setClientFactory(() => fakeClient);
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetClientFactory();
    if (origEnv !== undefined) {
      process.env.GEMINI_API_KEY = origEnv;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
  });

  it('returns parsed evaluation on clean JSON response', async () => {
    vi.mocked(fakeClient.vision.generate).mockResolvedValueOnce({
      text: JSON.stringify({ score: 14, flags: ['clean'], confidence: 0.95 }),
    });

    const res = await llmEvaluate(Buffer.from([]), fakePrompt, 'dicom');
    expect(res).toEqual({ score: 14, flags: ['clean'], confidence: 0.95 });
  });

  it('returns null when GEMINI_API_KEY missing', async () => {
    delete process.env.GEMINI_API_KEY;
    const res = await llmEvaluate(Buffer.from([]), fakePrompt, 'dicom');
    expect(res).toBeNull();
  });

  it('clamps score into [0, 15]', async () => {
    vi.mocked(fakeClient.vision.generate).mockResolvedValueOnce({
      text: JSON.stringify({ score: 99, flags: [], confidence: 1 }),
    });

    const res = await llmEvaluate(Buffer.from([]), fakePrompt, 'dicom');
    expect(res?.score).toBe(15);
  });
});
