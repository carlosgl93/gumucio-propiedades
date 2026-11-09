import { describe, it, expect } from 'vitest';
import { score } from './score';

const baseApplicant = {
  applicantName: 'JUAN PEREZ',
  applicantRut: '12345678-5',
  monthlyRent: 500000,
};

const goodEla = { global: 0.02, maxCell: 0.04 };
const badEla = { global: 0.05, maxCell: 0.20 };

describe('score', () => {
  it('returns pass (>=90) when all checks succeed and LLM works', () => {
    const r = score({
      extracted: { rut: '12345678-5', type: 'dicom' },
      ela: goodEla,
      crossCheckFlags: [],
      employerFormatFlags: [],
      llm: { score: 14, flags: [], confidence: 0.9 },
      monthlyRent: 500000,
      applicant: baseApplicant,
    });
    expect(r.verdict).toBe('pass');
    expect(r.score).toBeGreaterThanOrEqual(90);
    expect(r.llmUnavailable).toBe(false);
  });

  it('re-normalizes to 100 when LLM unavailable, still produces verdict', () => {
    const r = score({
      extracted: { rut: '12345678-5', type: 'dicom' },
      ela: goodEla,
      crossCheckFlags: [],
      employerFormatFlags: [],
      llm: null,
      monthlyRent: 500000,
      applicant: baseApplicant,
    });
    expect(r.llmUnavailable).toBe(true);
    expect(['pass', 'warn']).toContain(r.verdict);
    expect(r.score).toBeGreaterThanOrEqual(90);
  });

  it('returns fail (<70) when identity cross-check fails', () => {
    const r = score({
      extracted: { rut: '99999999-9', type: 'dicom' },
      ela: goodEla,
      crossCheckFlags: [{ code: 'identity_mismatch', weight: 20, message: 'x' }],
      employerFormatFlags: [],
      llm: { score: 14, flags: [], confidence: 0.9 },
      monthlyRent: 500000,
      applicant: baseApplicant,
    });
    expect(r.verdict).toBe('fail');
  });

  it('returns fail (<70) when ELA regional fires AND cross-check fires', () => {
    const r = score({
      extracted: { rut: '99999999-9', type: 'dicom' },
      ela: badEla,
      crossCheckFlags: [{ code: 'identity_mismatch', weight: 20, message: 'x' }],
      employerFormatFlags: [],
      llm: { score: 5, flags: ['ai_generated_suspected'], confidence: 0.7 },
      monthlyRent: 500000,
      applicant: baseApplicant,
    });
    expect(r.verdict).toBe('fail');
    expect(r.score).toBeLessThan(70);
  });

  it('emits income_below_threshold flag when liquid net income < rent/0.3', () => {
    const r = score({
      extracted: { netIncome: 100000, type: 'liquidacion' },
      ela: goodEla,
      crossCheckFlags: [],
      employerFormatFlags: [],
      llm: { score: 14, flags: [], confidence: 0.9 },
      monthlyRent: 500000,
      applicant: baseApplicant,
    });
    expect(r.flags.some(f => f.code === 'income_below_threshold')).toBe(true);
  });
});