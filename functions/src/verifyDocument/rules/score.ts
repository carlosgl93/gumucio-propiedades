import type { ScoreInput, VerificationResult, Flag, Verdict } from './types';

const W_RUT = 15;
const W_ELA = 25;
const W_FIELDS = 15;
const W_CROSS = 20;
const W_EMPLOYER = 10;
const W_LLM = 15;
const TOTAL = W_RUT + W_ELA + W_FIELDS + W_CROSS + W_EMPLOYER + W_LLM; // 100

const PASS_THRESHOLD = 90;
const WARN_THRESHOLD = 70;

function verdictFromScore(s: number): Verdict {
  if (s >= PASS_THRESHOLD) return 'pass';
  if (s >= WARN_THRESHOLD) return 'warn';
  return 'fail';
}

export function score(input: ScoreInput): VerificationResult {
  const flags: Flag[] = [];

  // 1) RUT valid
  const rutStr = String(input.extracted.rut ?? '');
  const rutValid = /^\d+-[\dK]$/i.test(rutStr);
  const rutPts = rutValid ? W_RUT : 0;
  if (!rutValid && rutStr) {
    flags.push({ code: 'rut_invalid', weight: W_RUT, message: `RUT inválido: ${rutStr}` });
  }

  // 2) ELA regional
  const elaOk = input.ela.global < 0.08 && input.ela.maxCell < 0.15;
  const elaPts = elaOk ? W_ELA : 0;
  if (!elaOk) {
    flags.push({
      code: `ela_high:${input.ela.global.toFixed(3)}/${input.ela.maxCell.toFixed(3)}`,
      weight: W_ELA,
      message: `ELA alta (global=${input.ela.global.toFixed(3)}, maxCell=${input.ela.maxCell.toFixed(3)})`,
    });
  }

  // 3) Fields present
  const typeStr = String(input.extracted.type ?? '');
  const requiredFields =
    typeStr === 'liquidacion' ? ['rut', 'grossIncome', 'netIncome'] : ['rut', 'name'];
  const missingKeys = requiredFields.filter(f => {
    const v = (input.extracted as Record<string, unknown>)[f];
    return v === null || v === undefined || v === '';
  });
  const missingCount = missingKeys.length;
  const fieldRatio = 1 - missingCount / requiredFields.length;
  const fieldsPts = Math.round(fieldRatio * W_FIELDS);
  if (missingCount > 0) {
    flags.push({
      code: `field_missing:${missingKeys.join(',')}`,
      weight: W_FIELDS - fieldsPts,
      message: `Faltan ${missingCount} campos: ${missingKeys.join(', ')}`,
    });
  }

  // 4) Cross-check
  const crossPts = input.crossCheckFlags.length === 0 ? W_CROSS : 0;
  flags.push(...input.crossCheckFlags);

  // 5) Employer format
  const employerPts = input.employerFormatFlags.length === 0 ? W_EMPLOYER : 0;
  flags.push(...input.employerFormatFlags);

  // 6) LLM
  const llmUnavailable = input.llm === null;
  if (llmUnavailable) {
    flags.push({ code: 'llm_unavailable', weight: 0, message: 'LLM eval no disponible; resto del score se re-normaliza' });
  }
  const llmPts = input.llm ? Math.round(input.llm.score) : 0;

  // Aggregate
  let totalPts = rutPts + elaPts + fieldsPts + crossPts + employerPts + llmPts;

  // Re-normalize if LLM unavailable
  if (llmUnavailable) {
    const deterministic = rutPts + elaPts + fieldsPts + crossPts + employerPts;
    const denom = TOTAL - W_LLM;
    totalPts = Math.round((deterministic / denom) * TOTAL);
  }

  // Income check
  const netIncome = Number((input.extracted as Record<string, unknown>).netIncome ?? 0);
  if (typeStr === 'liquidacion' && netIncome > 0 && netIncome * 0.3 < input.monthlyRent) {
    flags.push({
      code: 'income_below_threshold',
      weight: 0,
      message: `Sueldo líquido ${netIncome} no cubre regla 30% para renta ${input.monthlyRent}`,
    });
  }

  return {
    score: totalPts,
    verdict: verdictFromScore(totalPts),
    flags,
    extractedFields: input.extracted,
    llmUnavailable,
  };
}