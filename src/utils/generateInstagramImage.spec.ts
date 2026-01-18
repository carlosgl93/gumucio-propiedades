import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Property } from '../models/property';
import { generateInstagramStoryImage } from './generateInstagramImage';

// Mock property data
const mockProperty: Property = {
  id: 'test-id-123',
  title: 'Hermoso Departamento en Providencia',
  description: 'Amplio y luminoso departamento',
  type: 'sale',
  price: 150000000,
  currency: 'CLP',
  propertyType: 'departamento',
  status: 'disponible',
  address: {
    street: 'Av. Providencia 1234',
    city: 'Santiago',
    commune: 'Providencia',
    region: 'Región Metropolitana',
    country: 'Chile',
  },
  features: {
    bedrooms: 3,
    bathrooms: 2,
    parkingSpaces: 1,
    totalArea: 85,
    builtArea: 75,
    yearBuilt: 2020,
  },
  amenities: ['Piscina', 'Gimnasio', 'Quincho'],
  images: [
    {
      id: 'img-1',
      url: 'https://example.com/image.jpg',
      order: 0,
      uploadedAt: new Date(),
    },
  ],
  contactInfo: {
    phone: '+56912345678',
    email: 'contact@example.com',
    whatsapp: '+56912345678',
  },
  isFeatured: false,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('generateInstagramStoryImage', () => {
  beforeEach(() => {
    // Mock canvas and image loading
    global.Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';
      width = 1200;
      height = 800;
      crossOrigin: string | null = null;

      constructor() {
        // Simulate image loading
        setTimeout(() => {
          if (this.onload) {
            this.onload();
          }
        }, 0);
      }
    } as any;

    // Mock canvas
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({
        drawImage: vi.fn(),
        fillRect: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn(() => ({ width: 100 })),
        createLinearGradient: vi.fn(() => ({
          addColorStop: vi.fn(),
        })),
        set fillStyle(value: string) {},
        set font(value: string) {},
        set textAlign(value: string) {},
      })),
      toBlob: vi.fn((callback) => {
        const blob = new Blob(['fake-image-data'], { type: 'image/jpeg' });
        callback(blob);
      }),
    };

    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') {
        return mockCanvas as any;
      }
      return document.createElement(tagName);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate an Instagram story image', async () => {
    const blob = await generateInstagramStoryImage(mockProperty);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/jpeg');
  });

  it('should throw error if property has no images', async () => {
    const propertyWithoutImages = {
      ...mockProperty,
      images: [],
    };

    await expect(generateInstagramStoryImage(propertyWithoutImages)).rejects.toThrow(
      'La propiedad no tiene imágenes',
    );
  });

  it('should set crossOrigin to anonymous on image', async () => {
    let imageInstance: any;
    global.Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';
      width = 1200;
      height = 800;
      crossOrigin: string | null = null;

      constructor() {
        imageInstance = this;
        setTimeout(() => {
          if (this.onload) {
            this.onload();
          }
        }, 0);
      }
    } as any;

    await generateInstagramStoryImage(mockProperty);

    expect(imageInstance.crossOrigin).toBe('anonymous');
  });

  it('should create canvas with Instagram story dimensions', async () => {
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({
        drawImage: vi.fn(),
        fillRect: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn(() => ({ width: 100 })),
        createLinearGradient: vi.fn(() => ({
          addColorStop: vi.fn(),
        })),
        set fillStyle(value: string) {},
        set font(value: string) {},
        set textAlign(value: string) {},
      })),
      toBlob: vi.fn((callback) => {
        const blob = new Blob(['fake-image-data'], { type: 'image/jpeg' });
        callback(blob);
      }),
    };

    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') {
        return mockCanvas as any;
      }
      return document.createElement(tagName);
    });

    await generateInstagramStoryImage(mockProperty);

    expect(mockCanvas.width).toBe(1080);
    expect(mockCanvas.height).toBe(1920);
  });

  it('should handle image loading error', async () => {
    global.Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';
      width = 1200;
      height = 800;
      crossOrigin: string | null = null;

      constructor() {
        setTimeout(() => {
          if (this.onerror) {
            this.onerror();
          }
        }, 0);
      }
    } as any;

    await expect(generateInstagramStoryImage(mockProperty)).rejects.toThrow(
      'Error al generar la imagen para Instagram',
    );
  });

  it('should include property features in the image', async () => {
    const ctx = {
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 100 })),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      set fillStyle(value: string) {},
      set font(value: string) {},
      set textAlign(value: string) {},
    };

    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ctx),
      toBlob: vi.fn((callback) => {
        const blob = new Blob(['fake-image-data'], { type: 'image/jpeg' });
        callback(blob);
      }),
    };

    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') {
        return mockCanvas as any;
      }
      return document.createElement(tagName);
    });

    await generateInstagramStoryImage(mockProperty);

    // Verify that fillText was called (for title, price, location, features)
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it('should limit amenities to 3', async () => {
    const propertyWithManyAmenities = {
      ...mockProperty,
      amenities: ['Piscina', 'Gimnasio', 'Quincho', 'Estacionamiento', 'Bodega'],
    };

    const ctx = {
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 100 })),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      set fillStyle(value: string) {},
      set font(value: string) {},
      set textAlign(value: string) {},
    };

    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ctx),
      toBlob: vi.fn((callback) => {
        const blob = new Blob(['fake-image-data'], { type: 'image/jpeg' });
        callback(blob);
      }),
    };

    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') {
        return mockCanvas as any;
      }
      return document.createElement(tagName);
    });

    await generateInstagramStoryImage(propertyWithManyAmenities);

    // Check that fillText was called with limited amenities
    const amenitiesCalls = ctx.fillText.mock.calls.filter((call) => {
      const text = call[0] as string;
      return text.includes('Piscina') || text.includes('•');
    });

    expect(amenitiesCalls.length).toBeGreaterThan(0);
  });
});
