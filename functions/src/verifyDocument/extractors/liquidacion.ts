import type { ExtractedLiquidacion } from './types';
import { nthValidRut } from './rut';

const EMPLOYER_NAME_RE = /Empleador[:\s]+([A-ZÁÉÍÓÚÑ0-9 \t.\-&]{3,80})/i;
const PERIOD_RE = /Periodo[:\s]+(\d{4}-\d{2})/i;
const MONEY_RE = (label: string) =>
  new RegExp(`${label}[:\\s]+\\$?\\s*([\\d.]+)`, 'i');
const GROSS_RE = MONEY_RE('Sueldo\\s+bruto');
const NET_RE = MONEY_RE('Sueldo\\s+l[ií]quido');

function parseMoney(s: string): number {
  return parseInt(s.replace(/\./g, '').replace(/\s/g, ''), 10);
}

export function extractLiquidacion(text: string): ExtractedLiquidacion {
  const rut = nthValidRut(text, 0);
  const employerRut = nthValidRut(text, 1);
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
