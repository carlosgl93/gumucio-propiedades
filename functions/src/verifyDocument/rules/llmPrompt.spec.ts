import { describe, it, expect } from 'vitest';
import { buildLlmPrompt } from './llmPrompt';

const applicant = {
  applicantName: 'JUAN PEREZ',
  applicantRut: '12345678-5',
  monthlyRent: 500000,
};

describe('buildLlmPrompt', () => {
  it('returns prompt text and base64 image', () => {
    const r = buildLlmPrompt(
      { rut: '12345678-5', name: 'JUAN PEREZ' },
      applicant,
      'dicom',
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
    );
    expect(r.text).toContain('DICOM');
    expect(r.text).toContain('JUAN PEREZ');
    expect(r.imageBase64).toBeTruthy();
    expect(r.imageBase64).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it('mentions liquidación type in prompt when type=liquidacion', () => {
    const r = buildLlmPrompt(
      { rut: '12345678-5', netIncome: 1_500_000 },
      applicant,
      'liquidacion',
      Buffer.from([1, 2, 3]),
    );
    expect(r.text).toContain('LIQUIDACION');
    expect(r.text).toContain('1500000');
  });
});
