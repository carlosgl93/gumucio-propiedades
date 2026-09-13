import type { ExtractedLiquidacion } from './types';
import { nthValidRut, RUT_RE, isValidRut } from './rut';

// Employer name appears as the first non-empty line on most Chilean liquidaciones,
// or after "Empleador:". Skip lines that match the document header (e.g.
// "LIQUIDACIÓN DE SUELDO") — those are not employer names.
const EMPLOYER_NAME_DENYLIST = [
  /^LIQUIDACI[OÓ]N(\s+DE\s+SUELDO)?$/i,
  /^BOLETA\s+DE\s+HONORARIOS$/i,
  /^CERTIFICADO(\s+DE\s+REMUNERACIONES)?$/i,
  /^RESUMEN\s+DE\s+LIQUIDACI[OÓ]N$/i,
  /^COMPROBANTE\s+DE\s+SUELDO$/i,
  /^DETALLE\s+DE\s+LIQUIDACI[OÓ]N$/i,
];

const NAME_LINE_RE = /^([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ0-9 \t.\-&]{3,80})\s*$/;

function pickEmployerName(text: string): string | null {
  const labeled = matchFirst(/Empleador[:\s]+([A-ZÁÉÍÓÚÑ0-9 \t.\-&]{3,80})/i, text);
  if (labeled) return labeled;
  const razon = matchFirst(/Raz[oó]n\s+Social[:\s]+([A-ZÁÉÍÓÚÑ0-9 \t.\-&]{3,80})/i, text);
  if (razon) return razon;
  // Walk lines in order, skip denylisted (doc header) until we find a name-shaped one.
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (EMPLOYER_NAME_DENYLIST.some((re) => re.test(line))) continue;
    const m = line.match(NAME_LINE_RE);
    if (m) return m[1].replace(/\s+/g, ' ').trim();
  }
  return null;
}

// Period: "Mayo-2026", "Mayo 2026", "Periodo: 2026-05", "05/2026"
const PERIOD_RES: RegExp[] = [
  /Periodo[:\s]+(\d{4}-\d{2})/i,
  /\b(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)[-\s]+(\d{4})\b/i,
  /\b(\d{2})\/(\d{4})\b/,
];

// Gross income: "Totales: 14.092.056 ..." line OR "Sueldo Bruto:" label
const GROSS_RES: RegExp[] = [
  /Totales[:\s]+([\d.]+)\s+[\d.]+/,
  /Sueldo\s+bruto[:\s]+\$?\s*([\d.]+)/i,
  /Total\s+Haberes[:\s]+\$?\s*([\d.]+)/i,
];

// Net income: "Liquido a pagar: 10.253.408" or "Sueldo líquido:"
const NET_RES: RegExp[] = [
  /L[ií]quido\s+a\s+pagar[:\s]+\$?\s*([\d.]+)/i,
  /Sueldo\s+l[ií]quido[:\s]+\$?\s*([\d.]+)/i,
  /Liquido[:\s]+\$?\s*([\d.]+)/i,
];

function parseMoney(s: string): number {
  return parseInt(s.replace(/\./g, '').replace(/\s/g, ''), 10);
}

function matchFirst(re: RegExp, text: string, group = 1): string | null {
  const m = text.match(re);
  return m?.[group] ?? null;
}

// Worker RUT: labeled (RUT:, Rut Trabajador:, Trabajador RUT:). Fallback
// heuristic: the RUT that appears within ~60 chars AFTER a worker-name
// pattern (Sr./Sra. + capitalized name). This handles real PDFs where
// the worker's name and RUT sit on the same line:
//   "Sr. Alejandro Ramirez Valenzuela 17323127-K Dias Trabajados: ..."
const WORKER_LABEL_RES: RegExp[] = [
  /Rut\s+Trabajador[:\s]+(\d{1,2}\.?\d{3}\.?\d{3})-?([\dK])/i,
  /Trabajador[:\s]+(?:Rut|RUT)[:\s]+(\d{1,2}\.?\d{3}\.?\d{3})-?([\dK])/i,
  /\bRUT[:\s]+(\d{1,2}\.?\d{3}\.?\d{3})-?([\dK])/i,
];

// Employer RUT: labeled (Empleador RUT:, Razon Social RUT:, RUT Empresa:).
// Fallback: the FIRST valid RUT that appears before any worker-name line.
const EMPLOYER_LABEL_RES: RegExp[] = [
  /Empleador\s+RUT[:\s]+(\d{1,2}\.?\d{3}\.?\d{3})-?([\dK])/i,
  /Raz[oó]n\s+Social\s+RUT[:\s]+(\d{1,2}\.?\d{3}\.?\d{3})-?([\dK])/i,
  /RUT\s+Empresa[:\s]+(\d{1,2}\.?\d{3}\.?\d{3})-?([\dK])/i,
];

function firstLabeledRut(reList: RegExp[], text: string): string | null {
  for (const re of reList) {
    const m = text.match(re);
    if (m && isValidRut(m[1], m[2])) {
      return `${m[1].replace(/\./g, '')}-${m[2]}`;
    }
  }
  return null;
}

// Find the RUT that appears within `window` chars after a worker-name
// marker (Sr./Sra.). Used as fallback when the liquidacion has no labels.
function workerRutByNameContext(text: string): string | null {
  const workerLineRe = /\bSr\.?\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3}.{0,80}?(\d{1,2}\.?\d{3}\.?\d{3})-?([\dK])\b/i;
  const m = text.match(workerLineRe);
  if (m && isValidRut(m[1], m[2])) {
    return `${m[1].replace(/\./g, '')}-${m[2]}`;
  }
  return null;
}

// Find the RUT that appears within `window` chars after a company-name
// marker (S.A., SpA, Ltda). Fallback for unlabeled employer RUT.
function employerRutByCompanyContext(text: string): string | null {
  const companyLineRe = /\b[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑ0-9 .&\-]{2,80}?\s+(S\.?A\.?|SpA|Spa|Ltda\.?|Limitada|E\.I\.R\.L\.?)\b[^a-z]{0,80}?(\d{1,2}\.?\d{3}\.?\d{3})-?([\dK])/;
  const m = text.match(companyLineRe);
  if (m && isValidRut(m[2], m[3])) {
    return `${m[2].replace(/\./g, '')}-${m[3]}`;
  }
  return null;
}

export function extractLiquidacion(text: string): ExtractedLiquidacion {
  // Worker RUT: label first, then name-proximity, then positional
  let rut = firstLabeledRut(WORKER_LABEL_RES, text);
  if (!rut) rut = workerRutByNameContext(text);
  if (!rut) rut = nthValidRut(text, 0);

  // Employer RUT: label first, then company-name proximity
  let employerRut = firstLabeledRut(EMPLOYER_LABEL_RES, text);
  if (!employerRut) employerRut = employerRutByCompanyContext(text);
  // Positional fallback: pick the first valid RUT that is NOT the worker RUT
  if (!employerRut) {
    for (const m of text.matchAll(RUT_RE)) {
      if (!isValidRut(m[1], m[2])) continue;
      const candidate = `${m[1].replace(/\./g, '')}-${m[2]}`;
      if (candidate !== rut) {
        employerRut = candidate;
        break;
      }
    }
  }

  // Try each employer pattern; first non-denylisted hit wins.
  const employerName = pickEmployerName(text);

  // Period: ISO yyyy-mm wins; otherwise convert "Mayo-2026" / "mm/yyyy"
  let period: string | null = null;
  const iso = matchFirst(PERIOD_RES[0], text);
  if (iso) period = iso;
  else {
    const named = text.match(PERIOD_RES[1]);
    if (named) {
      const months: Record<string, string> = {
        Enero: '01', Febrero: '02', Marzo: '03', Abril: '04', Mayo: '05',
        Junio: '06', Julio: '07', Agosto: '08', Septiembre: '09',
        Octubre: '10', Noviembre: '11', Diciembre: '12',
      };
      const mm = months[named[1]] ?? '00';
      period = `${named[2]}-${mm}`;
    } else {
      const slash = text.match(PERIOD_RES[2]);
      if (slash) period = `${slash[2]}-${slash[1]}`;
    }
  }

  const grossRaw = GROSS_RES.map((re) => matchFirst(re, text)).find((v) => v !== null) ?? null;
  const netRaw = NET_RES.map((re) => matchFirst(re, text)).find((v) => v !== null) ?? null;

  return {
    rut,
    employerRut,
    employerName,
    grossIncome: grossRaw ? parseMoney(grossRaw) : null,
    netIncome: netRaw ? parseMoney(netRaw) : null,
    period,
  };
}
