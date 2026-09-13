import type { ExtractedDicom } from './types';
import { RUT_RE, isValidRut } from './rut';

// Name: "Nombre\nALEJANDRO RAMIREZ VALENZUELA" (label on its own line, value on the next)
// or "Nombre: NAME" inline. Prefer multi-line label+value.
const NAME_RES: RegExp[] = [
  /Nombre\s*\n([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ ]{4,79})/,
  /Nombre[:\s]+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ \t]{4,79})/i,
];

// Issue date: "Fecha: 21/08/2026 16:38" (Equifax layout) OR "Fecha de emisión: yyyy-mm-dd"
const DATE_RES: RegExp[] = [
  /Fecha[:\s]+(\d{2}\/\d{2}\/\d{4})/i,
  /Fecha(?:\s+de\s+emisi[oó]n)?[:\s]+(\d{4}-\d{2}-\d{2})/i,
];

// Plazo / historial length — Equifax uses "Cantidad de Documentos Impagos" or
// "Antigüedad en boletines". Fall back to first non-null numeric found.
const PLAZO_RES: RegExp[] = [
  /Plazo\s+de\s+historial[:\s]+([^\n]+)/i,
  /Antig[uü]edad\s+en\s+boletines[:\s]+([^\n]+)/i,
];

// Protestos: explicit "Protestos: N" or "Cantidad de protestos: N". If absent
// and "Sin información disponible" appears near a protestos heading, treat as 0.
const PROT_RES: RegExp[] = [
  /Cantidad\s+de\s+Protestos\s+y\s+Morosidades\s+Impagas[:\s]+(\d+)/i,
  /Protestos[:\s]+(\d+)/i,
];

function matchFirst(re: RegExp, text: string, group = 1): string | null {
  return text.match(re)?.[group] ?? null;
}

export function extractDicom(text: string): ExtractedDicom {
  let rut: string | null = null;
  for (const m of text.matchAll(RUT_RE)) {
    const candidate = `${m[1].replace(/\./g, '')}-${m[2]}`;
    if (isValidRut(m[1], m[2])) {
      rut = candidate;
      break;
    }
  }

  const name = NAME_RES.map((re) => matchFirst(re, text)).find((v) => v !== null) ?? null;
  const dateRaw = DATE_RES.map((re) => matchFirst(re, text)).find((v) => v !== null) ?? null;
  // Normalize dd/mm/yyyy → yyyy-mm-dd if needed
  let fechaEmision: string | null = null;
  if (dateRaw) {
    const slash = dateRaw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    fechaEmision = slash ? `${slash[3]}-${slash[2]}-${slash[1]}` : dateRaw;
  }
  const plazoHistorico =
    PLAZO_RES.map((re) => matchFirst(re, text)).find((v) => v !== null)?.trim() ?? null;

  let protestos: number | null = null;
  const protRaw = PROT_RES.map((re) => matchFirst(re, text)).find((v) => v !== null);
  if (protRaw !== null && protRaw !== undefined) protestos = parseInt(protRaw, 10);
  // If section exists but text says "Sin información disponible", treat as 0
  if (protestos === null && /Resumen de Protestos/i.test(text)) protestos = 0;

  return { rut, name, fechaEmision, plazoHistorico, protestos };
}
