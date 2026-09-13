import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { extractLiquidacion } from './liquidacion';

const fx = (n: string) => readFileSync(resolve(__dirname, '__fixtures__', n), 'utf8');

describe('extractLiquidacion', () => {
  it('extracts all fields from a valid liquidación', () => {
    const r = extractLiquidacion(fx('liquidacion-valid.txt'));
    expect(r.rut).toBe('15987654-3');
    expect(r.employerRut).toBe('76123456-0');
    expect(r.employerName).toBe('EMPRESA XYZ S.A.');
    expect(r.grossIncome).toBe(1_500_000);
    expect(r.netIncome).toBe(1_220_000);
    expect(r.period).toBe('2026-08');
  });

  it('returns nulls for missing fields, only sets the present one', () => {
    const r = extractLiquidacion(fx('liquidacion-partial.txt'));
    expect(r.grossIncome).toBe(800_000);
    expect(r.rut).toBeNull();
    expect(r.employerName).toBeNull();
    expect(r.netIncome).toBeNull();
  });
});
