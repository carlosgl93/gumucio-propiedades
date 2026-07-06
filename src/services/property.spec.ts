import { describe, expect, it } from 'vitest';

import { PropertyService } from './property';

describe('PropertyService.formatPropertyData', () => {
  const service = new PropertyService();

  // Use bracket access to call the private method
  const format = (data: unknown, id: string) =>
    (
      service as unknown as { formatPropertyData: (d: unknown, id: string) => unknown }
    ).formatPropertyData(data, id);

  it('fills safe defaults when document is missing all fields', () => {
    const result = format(
      {
        id: 'uNd911onza9q6IrYEbS4',
        type: 'rent',
        description: 'Casa de dos pisos',
        createdAt: { toDate: () => new Date('2026-06-22') },
        updatedAt: { toDate: () => new Date('2026-06-22') },
      },
      'uNd911onza9q6IrYEbS4',
    ) as Record<string, unknown>;

    expect(result.title).toBe('');
    expect(result.price).toBe(0);
    expect(result.currency).toBe('CLP');
    expect(result.propertyType).toBe('casa');
    expect(result.status).toBe('disponible');
    expect(result.images).toEqual([]);
    expect(result.amenities).toEqual([]);
    expect(result.isActive).toBe(true);
    expect(result.isFeatured).toBe(false);
    expect(result.address).toEqual({
      street: '',
      city: '',
      commune: '',
      region: '',
      country: 'Chile',
    });
    expect(result.features).toEqual({
      bedrooms: 0,
      bathrooms: 0,
      parkingSpaces: 0,
      totalArea: 0,
      builtArea: 0,
      yearBuilt: 0,
    });
    expect(result.contactInfo).toEqual({
      phone: '',
      email: '',
      whatsapp: '',
    });
  });

  it('preserves valid fields when present', () => {
    const result = format(
      {
        title: 'Casa bonita',
        price: 500000,
        currency: 'UF',
        propertyType: 'departamento',
        status: 'arrendado',
        address: { street: 'Av. Test 123', city: 'Santiago' },
        features: { totalArea: 80, bedrooms: 3 },
        amenities: ['Piscina'],
        contactInfo: { phone: '+56912345678', email: 'a@b.cl' },
        images: [{ id: 'img1', url: 'http://x', order: 0 }],
        isActive: false,
        isFeatured: true,
        createdAt: { toDate: () => new Date('2026-01-01') },
        updatedAt: { toDate: () => new Date('2026-01-02') },
      },
      'prop-1',
    ) as Record<string, unknown>;

    expect(result.id).toBe('prop-1');
    expect(result.title).toBe('Casa bonita');
    expect(result.price).toBe(500000);
    expect(result.currency).toBe('UF');
    expect(result.propertyType).toBe('departamento');
    expect(result.status).toBe('arrendado');
    expect(result.address).toMatchObject({
      street: 'Av. Test 123',
      city: 'Santiago',
      country: 'Chile',
    });
    expect(result.features).toMatchObject({ totalArea: 80, bedrooms: 3 });
    expect(result.amenities).toEqual(['Piscina']);
    expect(result.contactInfo).toMatchObject({ phone: '+56912345678', email: 'a@b.cl' });
    expect(result.isActive).toBe(false);
    expect(result.isFeatured).toBe(true);
  });

  it('handles missing nested objects', () => {
    const result = format(
      {
        title: 'Test',
        createdAt: null,
        updatedAt: null,
      },
      'p',
    ) as Record<string, unknown>;

    expect(result.address).toBeDefined();
    expect(result.features).toBeDefined();
    expect(result.contactInfo).toBeDefined();
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('preserves no_disponible status from the document', () => {
    const result = format(
      {
        title: 'Casa retirada',
        status: 'no_disponible',
        createdAt: { toDate: () => new Date('2026-07-01') },
        updatedAt: { toDate: () => new Date('2026-07-01') },
      },
      'hidden-1',
    ) as Record<string, unknown>;

    expect(result.status).toBe('no_disponible');
  });
});
