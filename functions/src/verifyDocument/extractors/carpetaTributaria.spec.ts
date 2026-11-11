import { describe, it, expect } from 'vitest';
import { extractCarpetaTributaria } from './carpetaTributaria';

describe('extractCarpetaTributaria', () => {
  it('extracts all fields from valid SII Carpeta Tributaria text', () => {
    const text = `CARPETA TRIBUTARIA REGULAR
PARA SOLICITAR CRÉDITO
Nombre del Emisor: REHABILITA VIDA - NEURORREHABILITACIÓN LIMITADA
RUT del Emisor: 78378389-4
Fecha de generación de la Carpeta: 19/10/2026 17:51
Datos del Contribuyente
Fecha de Inicio de Actividades: 30/03/2026
Categoría Tributaria: Primera Categoría
Régimen Tributario: REGIMEN PRO PYME GENERAL (14D)
Declaración Mensual y Pago Simultáneo de Impuestos Formulario 29
Declaración Mensual y Pago Simultáneo de Impuestos Formulario 29`;

    const res = extractCarpetaTributaria(text);
    expect(res.rut).toBe('78378389-4');
    expect(res.name).toBe('REHABILITA VIDA - NEURORREHABILITACIÓN LIMITADA');
    expect(res.fechaEmision).toBe('2026-10-19');
    expect(res.inicioActividades).toBe('2026-03-30');
    expect(res.categoriaTributaria).toBe('Primera Categoría');
    expect(res.regimenTributario).toBe('REGIMEN PRO PYME GENERAL (14D)');
    expect(res.declaracionesF29Count).toBe(2);
  });

  it('rejects invalid RUT check digit', () => {
    const text = `CARPETA TRIBUTARIA REGULAR
Nombre del Emisor: EMPRESA FALSA SPA
RUT del Emisor: 78378389-9
Fecha de generación de la Carpeta: 19/10/2026 17:51`;

    const res = extractCarpetaTributaria(text);
    expect(res.rut).toBeNull();
  });

  it('handles missing fields gracefully', () => {
    const text = `CARPETA TRIBUTARIA REGULAR
Texto sin datos de emisor`;

    const res = extractCarpetaTributaria(text);
    expect(res.rut).toBeNull();
    expect(res.name).toBeNull();
    expect(res.fechaEmision).toBeNull();
    expect(res.inicioActividades).toBeNull();
    expect(res.declaracionesF29Count).toBe(0);
  });
});
