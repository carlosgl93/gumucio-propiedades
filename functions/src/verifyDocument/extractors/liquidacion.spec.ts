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

  it('skips invalid worker RUT when finding employer RUT (skip=1 path)', () => {
    const r = extractLiquidacion(fx('liquidacion-employer-only.txt'));
    expect(r.rut).toBeNull();
    expect(r.employerRut).toBe('76123456-0');
  });

  // Real Chilean liquidaciones often omit explicit labels — the worker RUT
  // sits next to "Sr. <Name>" and the employer RUT sits right after the
  // company name line. Positional "first/second RUT" picks the wrong one.
  it('identifies worker RUT via Sr./Sra. context when no labels present', () => {
    const r = extractLiquidacion(fx('liquidacion-unlabeled.txt'));
    expect(r.rut).toBe('17323127-K');
    expect(r.employerRut).toBe('79721580-5');
    expect(r.employerName).toBe('Agricola Los Olmos Spa');
    expect(r.grossIncome).toBe(14_092_056);
    expect(r.netIncome).toBe(10_253_408);
    expect(r.period).toBe('2026-05');
  });
});
