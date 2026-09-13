import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { extractDicom } from './dicom';

const fx = (n: string) => readFileSync(resolve(__dirname, '__fixtures__', n), 'utf8');

describe('extractDicom', () => {
  it('extracts all fields from a valid DICOM text', () => {
    const r = extractDicom(fx('dicom-valid.txt'));
    expect(r.rut).toBe('12345678-5');
    expect(r.name).toBe('JUAN PEREZ GONZALEZ');
    expect(r.fechaEmision).toBe('2026-08-15');
    expect(r.plazoHistorico).toBe('8 anos');
    expect(r.protestos).toBe(0);
  });

  it('returns nulls when RUT missing', () => {
    const r = extractDicom(fx('dicom-missing-rut.txt'));
    expect(r.rut).toBeNull();
    expect(r.name).toBe('MARIA LOPEZ');
    expect(r.protestos).toBe(2);
  });

  it('returns null when RUT check digit invalid (mod-11)', () => {
    const r = extractDicom(fx('dicom-bad-rut.txt'));
    expect(r.rut).toBeNull();
  });
});
