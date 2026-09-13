import type { ExtractedLiquidacion } from './types';
import { nthValidRut } from './rut';

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

export function extractLiquidacion(text: string): ExtractedLiquidacion {
  const rut = nthValidRut(text, 0);
  const employerRut = nthValidRut(text, 1);

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
