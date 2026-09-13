import type { ExtractedDicom } from './types';
import { RUT_RE, isValidRut } from './rut';

const NAME_RE = /Nombre[:\s]+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ \t]{4,79})/i;
const DATE_RE = /Fecha(?:\s+de\s+emisi[oó]n)?[:\s]+(\d{4}-\d{2}-\d{2})/i;
const PLAZO_RE = /Plazo\s+de\s+historial[:\s]+([^\n]+)/i;
const PROT_RE = /Protestos[:\s]+(\d+)/i;

export function extractDicom(text: string): ExtractedDicom {
  let rut: string | null = null;
  for (const m of text.matchAll(RUT_RE)) {
    const candidate = `${m[1].replace(/\./g, '')}-${m[2]}`;
    if (isValidRut(m[1], m[2])) {
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
