import { describe, expect, it } from 'vitest';

import {
  formatChileanNumber,
  formatLocation,
  formatNumberForInput,
  formatPrice,
} from './formatters';

describe('formatPrice', () => {
  it('formats UF with thousands separator for 4-digit values', () => {
    expect(formatPrice(4560, 'UF')).toBe('UF 4.560');
  });

  it('formats UF with thousands separator for 5-digit values', () => {
    expect(formatPrice(40000, 'UF')).toBe('UF 40.000');
  });

  it('formats UF with thousands separator for 5-digit values (21000)', () => {
    expect(formatPrice(21000, 'UF')).toBe('UF 21.000');
  });

  it('formats UF with decimals', () => {
    expect(formatPrice(15.5, 'UF')).toBe('UF 15,5');
    expect(formatPrice(1250.5, 'UF')).toBe('UF 1.250,5');
    expect(formatPrice(15.25, 'UF')).toBe('UF 15,25');
  });

  it('formats UF zero', () => {
    expect(formatPrice(0, 'UF')).toBe('UF 0');
  });

  it('formats CLP with currency style', () => {
    expect(formatPrice(1234567, 'CLP')).toBe('$1.234.567');
  });

  it('formats CLP zero', () => {
    expect(formatPrice(0, 'CLP')).toBe('$0');
  });

  it('formats negative UF', () => {
    expect(formatPrice(-4560, 'UF')).toBe('UF -4.560');
  });

  it('formats UF 1-digit value', () => {
    expect(formatPrice(5, 'UF')).toBe('UF 5');
  });
});

describe('formatChileanNumber', () => {
  it('formats numbers with es-CL locale (thousands with dots, decimals with comma)', () => {
    expect(formatChileanNumber(15.5)).toBe('15,5');
    expect(formatChileanNumber(1250.5)).toBe('1.250,5');
    expect(formatChileanNumber(80)).toBe('80');
    expect(formatChileanNumber(1.5)).toBe('1,5');
    expect(formatChileanNumber(0)).toBe('0');
  });

  it('returns empty string for null, undefined, and NaN', () => {
    expect(formatChileanNumber(undefined)).toBe('');
    expect(formatChileanNumber(null)).toBe('');
    expect(formatChileanNumber(NaN)).toBe('');
  });
});

describe('formatNumberForInput', () => {
  it('converts number to string with comma decimal and no thousands separator', () => {
    expect(formatNumberForInput(15.5)).toBe('15,5');
    expect(formatNumberForInput(15)).toBe('15');
    expect(formatNumberForInput(1250.5)).toBe('1250,5');
    expect(formatNumberForInput(0)).toBe('0');
  });

  it('returns empty string for undefined, null, and NaN', () => {
    expect(formatNumberForInput(undefined)).toBe('');
    expect(formatNumberForInput(null)).toBe('');
    expect(formatNumberForInput(NaN)).toBe('');
  });
});

describe('formatLocation', () => {
  it('capitalizes both commune and city when both are lowercase', () => {
    expect(formatLocation('rancagua', 'rancagua')).toBe('Rancagua, Rancagua');
  });

  it('capitalizes multi-word commune', () => {
    expect(formatLocation('las condes', 'santiago')).toBe('Las Condes, Santiago');
  });

  it('returns only city when commune is empty', () => {
    expect(formatLocation('', 'santiago')).toBe('Santiago');
  });

  it('returns only commune when city is undefined', () => {
    expect(formatLocation('rancagua', undefined)).toBe('Rancagua');
  });

  it('returns empty string when both undefined', () => {
    expect(formatLocation(undefined, undefined)).toBe('');
  });

  it('returns empty string when both empty strings', () => {
    expect(formatLocation('', '')).toBe('');
  });

  it('trims whitespace before capitalizing', () => {
    expect(formatLocation('  rancagua  ', '  santiago  ')).toBe('Rancagua, Santiago');
  });

  it('capitalizes already capitalized input without changes', () => {
    expect(formatLocation('Providencia', 'Santiago')).toBe('Providencia, Santiago');
  });
});
