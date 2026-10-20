import { describe, expect, it } from 'vitest';

import { Property } from '@/models';

import { parseChileanNumber, parseNumericInput, validateProperty } from './validations';

describe('parseChileanNumber', () => {
  it('parses numbers with Chilean format (. thousands, , decimals)', () => {
    expect(parseChileanNumber('1.250,5')).toBe(1250.5);
    expect(parseChileanNumber('15,5')).toBe(15.5);
    expect(parseChileanNumber('100')).toBe(100);
    expect(parseChileanNumber('1.234.567')).toBe(1234567);
    expect(parseChileanNumber('15,50')).toBe(15.5);
    expect(parseChileanNumber('0,5')).toBe(0.5);
    expect(parseChileanNumber(',5')).toBe(0.5);
    expect(parseChileanNumber('15,')).toBe(15);
  });

  it('handles spaces and whitespace', () => {
    expect(parseChileanNumber(' 1.250,5 ')).toBe(1250.5);
    expect(parseChileanNumber('  15,5  ')).toBe(15.5);
  });

  it('handles numeric input directly', () => {
    expect(parseChileanNumber(15.5)).toBe(15.5);
    expect(parseChileanNumber(100)).toBe(100);
    expect(parseChileanNumber(0)).toBe(0);
  });

  it('handles invalid or empty inputs by returning 0', () => {
    expect(parseChileanNumber('')).toBe(0);
    expect(parseChileanNumber('   ')).toBe(0);
    expect(parseChileanNumber('abc')).toBe(0);
    expect(parseChileanNumber(undefined)).toBe(0);
    expect(parseChileanNumber(null)).toBe(0);
    expect(parseChileanNumber(NaN)).toBe(0);
  });

  it('parseNumericInput alias behaves identically', () => {
    expect(parseNumericInput('1.250,5')).toBe(1250.5);
    expect(parseNumericInput('15,5')).toBe(15.5);
  });
});

describe('validateProperty with decimals', () => {
  const baseProperty: Partial<Property> = {
    title: 'Depto en Providencia',
    description: 'Excelente departamento con vista despejada',
    price: 15.5,
    currency: 'UF',
    propertyType: 'departamento',
    status: 'disponible',
    address: {
      street: 'Av. Providencia 1234',
      city: 'Santiago',
      commune: 'Providencia',
      region: 'RM',
      country: 'Chile',
    },
    features: {
      bedrooms: 2,
      bathrooms: 1.5,
      parkingSpaces: 1,
      totalArea: 80.5,
      builtArea: 65.5,
      yearBuilt: 2021,
    },
    contactInfo: {
      phone: '+56 9 1234 5678',
      email: 'contacto@propiedades.cl',
    },
  };

  it('validates successfully with decimal price, bathrooms, and areas', () => {
    const result = validateProperty(baseProperty);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects builtArea > totalArea with decimals', () => {
    const result = validateProperty({
      ...baseProperty,
      features: {
        ...baseProperty.features!,
        builtArea: 80.6,
        totalArea: 80.5,
      },
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      field: 'features.builtArea',
      message: 'La superficie construida no puede ser mayor a la superficie total',
    });
  });

  it('allows builtArea equal to totalArea with decimals', () => {
    const result = validateProperty({
      ...baseProperty,
      features: {
        ...baseProperty.features!,
        builtArea: 80.5,
        totalArea: 80.5,
      },
    });
    expect(result.isValid).toBe(true);
  });
});
