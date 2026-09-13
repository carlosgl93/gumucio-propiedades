import type { ExtractedLiquidacion } from './types';

const RUT_RE = /\b(\d{1,2}\.?\d{3}\.?\d{3})-?([\dK])\b/g;
const EMPLOYER_NAME_RE = /Empleador[:\s]+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9 \t.\-&]{2,79})/i;
const PERIOD_RE = /Periodo[:\s]+(\d{4}-\d{2})/i;
const MONEY_RE = (label: string) =>
  new RegExp(`${label}[:\\s]+\\$?\\s*([\\d.]+)`, 'i');
const GROSS_RE = MONEY_RE('Sueldo\\s+bruto');
const NET_RE = MONEY_RE('Sueldo\\s+l[ií]quido');

function parseMoney(s: string): number {
  return parseInt(s.replace(/\./g, '').replace(/\s/g, ''), 10);
}

function firstValidRut(text: string, skip = 0): string | null {
  let i = 0;
  for (const m of text.matchAll(RUT_RE)) {
    const num = m[1].replace(/\./g, '');
    const dv = m[2];
    let sum = 0;
    let mult = 2;
    for (let k = num.length - 1; k >= 0; k--) {
      sum += parseInt(num[k], 10) * mult;
      mult = mult === 7 ? 2 : mult + 1;
    }
    const expected = 11 - (sum % 11);
    const expectedDv = expected === 10 ? 'K' : expected === 11 ? '0' : String(expected);
    if (expectedDv.toUpperCase() === dv.toUpperCase()) {
      if (i === skip) return `${num}-${dv}`;
      i++;
    }
  }
  return null;
}

export function extractLiquidacion(text: string): ExtractedLiquidacion {
  const rut = firstValidRut(text, 0);
  const employerRut = firstValidRut(text, 1);
  const employerName = text.match(EMPLOYER_NAME_RE)?.[1]?.trim() ?? null;
  const period = text.match(PERIOD_RE)?.[1] ?? null;
  const grossRaw = text.match(GROSS_RE)?.[1];
  const netRaw = text.match(NET_RE)?.[1];
  return {
    rut,
    employerRut,
    employerName,
    grossIncome: grossRaw ? parseMoney(grossRaw) : null,
    netIncome: netRaw ? parseMoney(netRaw) : null,
    period,
  };
}
