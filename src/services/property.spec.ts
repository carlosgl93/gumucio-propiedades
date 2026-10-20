import { deleteObject, listAll, uploadBytes } from 'firebase/storage';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { processPropertyImageForUpload } from '@/utils/imageOptimizer';

import { PropertyService } from './property';

vi.mock('firebase/storage', () => ({
  ref: vi.fn((_storage, path) => ({ path })),
  uploadBytes: vi.fn(() => Promise.resolve()),
  getDownloadURL: vi.fn((ref) => Promise.resolve(`https://storage.mock/${ref.path}`)),
  listAll: vi.fn(),
  deleteObject: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/firebase', () => ({
  db: {},
  storage: {},
}));

vi.mock('@/utils/imageOptimizer', () => ({
  processPropertyImageForUpload: vi.fn(() =>
    Promise.resolve({
      main: new Blob(['main-bytes'], { type: 'image/webp' }),
      thumbnail: new Blob(['thumb-bytes'], { type: 'image/webp' }),
    }),
  ),
  processImageUrlForUpload: vi.fn(() =>
    Promise.resolve({
      main: new Blob(['main-bytes'], { type: 'image/webp' }),
      thumbnail: new Blob(['thumb-bytes'], { type: 'image/webp' }),
    }),
  ),
}));

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

describe('PropertyService - Image upload and deletion with WebP optimization', () => {
  const service = new PropertyService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('compresses file to WebP and uploads both main and thumbnail images', async () => {
    const file = new File(['fake-jpg'], 'photo.jpg', { type: 'image/jpeg' });
    const result = await service.uploadPropertyImage('prop-123', file, 'Foto principal');

    expect(processPropertyImageForUpload).toHaveBeenCalledWith(file);
    expect(uploadBytes).toHaveBeenCalledTimes(2);

    // Verify main upload
    expect(uploadBytes).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringMatching(/^properties\/prop-123\/images\/.*\.webp$/),
      }),
      expect.any(Blob),
      { contentType: 'image/webp' },
    );

    // Verify thumbnail upload
    expect(uploadBytes).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringMatching(/^properties\/prop-123\/images\/.*_thumb\.webp$/),
      }),
      expect.any(Blob),
      { contentType: 'image/webp' },
    );

    expect(result.id).toBeDefined();
    expect(result.url).toMatch(/^https:\/\/storage\.mock\/properties\/prop-123\/images\/.*\.webp$/);
    expect(result.thumbnailUrl).toMatch(
      /^https:\/\/storage\.mock\/properties\/prop-123\/images\/.*_thumb\.webp$/,
    );
    expect(result.caption).toBe('Foto principal');
    expect(result.order).toBe(0);
    expect(result.uploadedAt).toBeInstanceOf(Date);
  });

  it('deletes both main and thumbnail images for given imageId', async () => {
    const mockItems = [
      { name: '123_abc.webp' },
      { name: '123_abc_thumb.webp' },
      { name: '999_other.webp' },
    ];
    vi.mocked(listAll).mockResolvedValueOnce({ items: mockItems } as any);

    await service.deletePropertyImage('prop-123', '123_abc');

    expect(listAll).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'properties/prop-123/images' }),
    );
    expect(deleteObject).toHaveBeenCalledTimes(2);
    expect(deleteObject).toHaveBeenCalledWith({ name: '123_abc.webp' });
    expect(deleteObject).toHaveBeenCalledWith({ name: '123_abc_thumb.webp' });
  });

  it('warns if no matching images are found in storage', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(listAll).mockResolvedValueOnce({ items: [] } as any);

    await service.deletePropertyImage('prop-123', 'non-existent');

    expect(deleteObject).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('Image with ID non-existent not found in storage');
  });

  it('optimizes legacy images in property and skips already optimized webp images', async () => {
    const legacyImage = {
      id: 'img-1',
      url: 'https://storage.mock/properties/prop-1/images/img-1.jpg',
      order: 0,
      uploadedAt: new Date(),
    };
    const alreadyOptimized = {
      id: 'img-2',
      url: 'https://storage.mock/properties/prop-1/images/img-2.webp',
      thumbnailUrl: 'https://storage.mock/properties/prop-1/images/img-2_thumb.webp',
      order: 1,
      uploadedAt: new Date(),
    };

    const result = await service.optimizePropertyImages('prop-1', [legacyImage, alreadyOptimized]);

    expect(result).toHaveLength(2);
    // Legacy image got converted to webp and received thumbnailUrl
    expect(result[0].url).toMatch(/\.webp$/);
    expect(result[0].thumbnailUrl).toMatch(/_thumb\.webp$/);
    // Already optimized image remained untouched
    expect(result[1]).toEqual(alreadyOptimized);
  });
});
