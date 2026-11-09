import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  setClientFactory,
  resetClientFactory,
  type MiniMaxClient,
} from './minimaxClient';
import { llmEvaluate } from './llmEval';

const mockGenerate = vi.fn();
const fakeClient: MiniMaxClient = {
  vision: { generate: mockGenerate },
};

beforeEach(() => {
  process.env.MINIMAX_API_KEY = 'test-key';
  setClientFactory(() => fakeClient);
  mockGenerate.mockReset();
});

afterEach(() => {
  delete process.env.MINIMAX_API_KEY;
  resetClientFactory();
});

describe('llmEvaluate', () => {
  it('returns parsed result on success', async () => {
    mockGenerate.mockResolvedValue({
      text: JSON.stringify({ score: 12, flags: ['logo_missing'], confidence: 0.8 }),
    });
    const r = await llmEvaluate(
      Buffer.from([1, 2, 3]),
      { text: 'prompt', imageBase64: 'AAA' },
      'dicom',
    );
    expect(r).not.toBeNull();
    expect(r!.score).toBe(12);
    expect(r!.flags).toEqual(['logo_missing']);
    expect(r!.confidence).toBeCloseTo(0.8);
  });

  it('returns null when MINIMAX_API_KEY missing', async () => {
    delete process.env.MINIMAX_API_KEY;
    const r = await llmEvaluate(
      Buffer.from([1, 2, 3]),
      { text: 'prompt', imageBase64: 'AAA' },
      'dicom',
    );
    expect(r).toBeNull();
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('returns null on timeout', async () => {
    mockGenerate.mockImplementation(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 50)),
    );
    const r = await llmEvaluate(
      Buffer.from([1, 2, 3]),
      { text: 'prompt', imageBase64: 'AAA' },
      'dicom',
      { timeoutMs: 20 },
    );
    expect(r).toBeNull();
  });

  it('returns null on invalid JSON after one retry (2 calls total)', async () => {
    mockGenerate.mockResolvedValue({ text: 'not json' });
    const r = await llmEvaluate(
      Buffer.from([1, 2, 3]),
      { text: 'prompt', imageBase64: 'AAA' },
      'dicom',
    );
    expect(r).toBeNull();
    expect(mockGenerate).toHaveBeenCalledTimes(2);
  });

  it('returns null on API 5xx', async () => {
    mockGenerate.mockRejectedValue(new Error('503'));
    const r = await llmEvaluate(
      Buffer.from([1, 2, 3]),
      { text: 'prompt', imageBase64: 'AAA' },
      'dicom',
    );
    expect(r).toBeNull();
    expect(mockGenerate).toHaveBeenCalledTimes(2);
  });

  it('strips markdown fences from response text', async () => {
    mockGenerate.mockResolvedValue({
      text: '```json\n{"score":9,"flags":[],"confidence":0.5}\n```',
    });
    const r = await llmEvaluate(
      Buffer.from([1, 2, 3]),
      { text: 'prompt', imageBase64: 'AAA' },
      'dicom',
    );
    expect(r).not.toBeNull();
    expect(r!.score).toBe(9);
    expect(r!.confidence).toBeCloseTo(0.5);
  });

  it('clamps score to 0..15', async () => {
    mockGenerate.mockResolvedValue({
      text: JSON.stringify({ score: 999, flags: [], confidence: 0.9 }),
    });
    const r = await llmEvaluate(
      Buffer.from([1, 2, 3]),
      { text: 'prompt', imageBase64: 'AAA' },
      'dicom',
    );
    expect(r!.score).toBe(15);
  });
});
