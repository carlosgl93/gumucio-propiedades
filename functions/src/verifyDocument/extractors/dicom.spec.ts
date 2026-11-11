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

  it('extracts Informes Comerciales Platino personal report correctly', () => {
    const platinoText = `✓ informescomerciales 	PLATINO-D
platino-d
RUT Titular · 13.563.683-5
Informe	27/10/2026
QUILILONGO QUINONES OLGA
JOSELYNE
11:43:29
Riesgo bajo · puntaje 999/999
Sin protestos ni morosidades ni señales de riesgo relevantes en el período consultado.
Información Personal
Nacionalidad:
Chilena
Activos
✓ Sin activos: se consultó el registro y no se encontraron vehículos ni propiedades a nombre del titular.`;
    const r = extractDicom(platinoText);
    expect(r.rut).toBe('13563683-5');
    expect(r.name).toBe('QUILILONGO QUINONES OLGA JOSELYNE');
    expect(r.fechaEmision).toBe('2026-10-27');
    expect(r.protestos).toBe(0);
  });

  it('extracts Informes Comerciales Platino Empresa report correctly', () => {
    const platinoEmpresaText = `✓ informescomerciales 	PLATINO-EMPRESA
platino-empresa
RUT Titular · 78.093.438-7
Informe	27/10/2026
DONA ISIDORA SPA
11:05:15
Riesgo bajo · puntaje 999/999
Sin protestos ni morosidades ni señales de riesgo relevantes en el período consultado.
Información Personal
Razón social:
DONA ISIDORA SPA
Giro:
VENTA AL POR MENOR
Activos
✓ Sin activos: se consultó el registro y no se encontraron vehículos ni propiedades a nombre del titular.`;
    const r = extractDicom(platinoEmpresaText);
    expect(r.rut).toBe('78093438-7');
    expect(r.name).toBe('DONA ISIDORA SPA');
    expect(r.fechaEmision).toBe('2026-10-27');
    expect(r.protestos).toBe(0);
  });

  it('does not capture "del titular" from "a nombre del titular" as applicant name', () => {
    const textWithTitular = `RUT Titular · 15.345.678-K
Informe 10/10/2026
Sin activos: a nombre del titular.`;
    const r = extractDicom(textWithTitular);
    expect(r.name).not.toBe('del titular');
  });
});
