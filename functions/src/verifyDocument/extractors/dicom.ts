import type { ExtractedDicom } from './types';
import { RUT_RE, isValidRut } from './rut';

// Name patterns in Chilean commercial reports:
// 1. Platino Razón Social: "Razón social:\nDONA ISIDORA SPA"
// 2. Platino Personal: "Informe 27/10/2026\nQUILILONGO QUINONES OLGA\nJOSELYNE\n11:43:29"
// 3. Equifax label+value on newlines: "Nombre\nALEJANDRO RAMIREZ VALENZUELA"
// 4. Inline: "Nombre: ALEJANDRO RAMIREZ VALENZUELA"
const NAME_RES: RegExp[] = [
  /Raz[oó]n\s+social[:\s]*\n([A-ZÁÉÍÓÚÑ0-9 .&-]{3,79})/i,
  /Informe\s+\d{2}\/\d{2}\/\d{4}\s*\n([A-ZÁÉÍÓÚÑ \t\r\n]+?)(?=\n\d{2}:\d{2}:\d{2}|\nRiesgo)/i,
  /Nombre\s*\n([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ ]{4,79})/,
  /Nombre[:\s]+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ \t]{4,79})/i,
];

// Issue date: "Informe 27/10/2026", "Fecha: 21/08/2026 16:38", "Fecha de emisión: yyyy-mm-dd"
const DATE_RES: RegExp[] = [
  /Informe\s+(\d{2}\/\d{2}\/\d{4})/i,
  /Fecha[:\s]+(\d{2}\/\d{2}\/\d{4})/i,
  /Fecha(?:\s+de\s+emisi[oó]n)?[:\s]+(\d{4}-\d{2}-\d{2})/i,
];

// Plazo / historial length — Equifax uses "Cantidad de Documentos Impagos" or
// "Antigüedad en boletines". Fall back to first non-null numeric found.
const PLAZO_RES: RegExp[] = [
  /Plazo\s+de\s+historial[:\s]+([^\n]+)/i,
  /Antig[uü]edad\s+en\s+boletines[:\s]+([^\n]+)/i,
];

// Protestos: explicit "Protestos: N" or "Cantidad de protestos: N".
const PROT_RES: RegExp[] = [
  /Cantidad\s+de\s+Protestos\s+y\s+Morosidades\s+Impagas[:\s]+(\d+)/i,
  /Protestos[:\s]+(\d+)/i,
];

function matchFirst(re: RegExp, text: string, group = 1): string | null {
  return text.match(re)?.[group] ?? null;
}

function cleanCandidateName(raw: string | null): string | null {
  if (!raw) return null;
  const singleLine = raw.replace(/\s+/g, ' ').trim();
  if (/^(del titular|titular)$/i.test(singleLine)) return null;
  return singleLine;
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

  let name: string | null = null;
  for (const re of NAME_RES) {
    const m = matchFirst(re, text);
    const candidate = cleanCandidateName(m);
    if (candidate) {
      name = candidate;
      break;
    }
  }

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
  // If zero protestos declared or section clean, treat as 0
  if (
    protestos === null &&
    (/Sin protestos/i.test(text) ||
      /Resumen de Protestos/i.test(text) ||
      /Total Documentos Impagos 0/i.test(text))
  ) {
    protestos = 0;
  }

  return { rut, name, fechaEmision, plazoHistorico, protestos };
}
