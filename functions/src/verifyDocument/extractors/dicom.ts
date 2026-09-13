import type { ExtractedDicom } from './types';

const RUT_RE = /\b(\d{1,2}\.?\d{3}\.?\d{3})-?([\dK])\b/g;
const NAME_RE = /Nombre[:\s]+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ \t]{4,79})/i;
const DATE_RE = /Fecha(?:\s+de\s+emisi[oó]n)?[:\s]+(\d{4}-\d{2}-\d{2})/i;
const PLAZO_RE = /Plazo\s+de\s+historial[:\s]+([^\n]+)/i;
const PROT_RE = /Protestos[:\s]+(\d+)/i;

function rutValid(rut: string, dv: string): boolean {
  const num = rut.replace(/\./g, '');
  let sum = 0;
  let mult = 2;
  for (let i = num.length - 1; i >= 0; i--) {
    sum += parseInt(num[i], 10) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const expected = 11 - (sum % 11);
  const expectedDv = expected === 10 ? 'K' : expected === 11 ? '0' : String(expected);
  return expectedDv.toUpperCase() === dv.toUpperCase();
}

export function extractDicom(text: string): ExtractedDicom {
  let rut: string | null = null;
  for (const m of text.matchAll(RUT_RE)) {
    const candidate = `${m[1].replace(/\./g, '')}-${m[2]}`;
    if (rutValid(m[1], m[2])) {
      rut = candidate;
      break;
    }
  }

  const name = text.match(NAME_RE)?.[1]?.trim() ?? null;
  const fechaEmision = text.match(DATE_RE)?.[1] ?? null;
  const plazoHistorico = text.match(PLAZO_RE)?.[1]?.trim() ?? null;
  const protMatch = text.match(PROT_RE)?.[1];
  const protestos = protMatch !== undefined ? parseInt(protMatch, 10) : null;

  return { rut, name, fechaEmision, plazoHistorico, protestos };
}
