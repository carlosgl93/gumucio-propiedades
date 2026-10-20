import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  calculateDimensions,
  compressImage,
  loadImage,
  processPropertyImageForUpload,
} from './imageOptimizer';

describe('imageOptimizer', () => {
  describe('calculateDimensions', () => {
    it('returns original dimensions if image is smaller than max limits', () => {
      const result = calculateDimensions(800, 600, 1920, 1080);
      expect(result).toEqual({ width: 800, height: 600 });
    });

    it('scales down landscape image constrained by maxWidth', () => {
      const result = calculateDimensions(3840, 1920, 1920, 1080);
      // ratio: min(1920 / 3840 = 0.5, 1080 / 1920 = 0.5625) = 0.5
      expect(result).toEqual({ width: 1920, height: 960 });
    });

    it('scales down portrait image constrained by maxHeight', () => {
      const result = calculateDimensions(1500, 3000, 1920, 1080);
      // ratio: min(1920 / 1500 = 1.28, 1080 / 3000 = 0.36) = 0.36
      expect(result).toEqual({ width: 540, height: 1080 });
    });

    it('scales down square image constrained by max limits', () => {
      const result = calculateDimensions(2000, 2000, 480, 480);
      expect(result).toEqual({ width: 480, height: 480 });
    });

    it('handles zero or negative dimensions safely', () => {
      const result = calculateDimensions(0, 0, 1920, 1080);
      expect(result).toEqual({ width: 0, height: 0 });
    });
  });

  describe('compressImage & processPropertyImageForUpload', () => {
    let originalImage: typeof Image;
    let mockCanvas: any;
    let mockContext: any;
    let createObjectURLSpy: any;
    let revokeObjectURLSpy: any;

    beforeEach(() => {
      originalImage = global.Image;

      // Mock URL.createObjectURL and revokeObjectURL
      createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      // Mock Image constructor
      global.Image = class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        src = '';
        width = 2400;
        height = 1600;
        naturalWidth = 2400;
        naturalHeight = 1600;

        constructor() {
          setTimeout(() => {
            if (this.onload) {
              this.onload();
            }
          }, 0);
        }
      } as any;

      mockContext = {
        drawImage: vi.fn(),
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      };

      mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => mockContext),
        toBlob: vi.fn((callback, format) => {
          const blob = new Blob(['mock-webp-bytes'], { type: format || 'image/webp' });
          callback(blob);
        }),
      };

      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'canvas') {
          return mockCanvas as any;
        }
        return document.createElement(tagName);
      });
    });

    afterEach(() => {
      global.Image = originalImage;
      vi.restoreAllMocks();
    });

    it('compresses an image element to WebP with target dimensions and quality', async () => {
      const img = new Image();
      img.width = 2400;
      img.height = 1600;

      const blob = await compressImage(img as HTMLImageElement, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.82,
        format: 'image/webp',
      });

      expect(mockCanvas.width).toBe(1620); // ratio = min(1920/2400=0.8, 1080/1600=0.675) -> 2400 * 0.675 = 1620
      expect(mockCanvas.height).toBe(1080);
      expect(mockContext.drawImage).toHaveBeenCalledWith(img, 0, 0, 1620, 1080);
      expect(mockCanvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/webp', 0.82);
      expect(blob.type).toBe('image/webp');
    });

    it('falls back to image/jpeg if WebP export is unsupported (returns null)', async () => {
      mockCanvas.toBlob = vi.fn((callback, format) => {
        if (format === 'image/webp') {
          callback(null);
        } else {
          callback(new Blob(['fallback-jpg'], { type: 'image/jpeg' }));
        }
      });

      const img = new Image();
      img.width = 800;
      img.height = 600;

      const blob = await compressImage(img as HTMLImageElement, { format: 'image/webp' });
      expect(blob.type).toBe('image/jpeg');
    });

    it('rejects if toBlob returns null for non-webp format or both fail', async () => {
      mockCanvas.toBlob = vi.fn((callback) => callback(null));

      const img = new Image();
      img.width = 800;
      img.height = 600;

      await expect(
        compressImage(img as HTMLImageElement, { format: 'image/jpeg' }),
      ).rejects.toThrow('Error al generar blob comprimido');
    });

    it('rejects if getContext returns null', async () => {
      mockCanvas.getContext = vi.fn(() => null);

      const img = new Image();
      img.width = 800;
      img.height = 600;

      await expect(compressImage(img as HTMLImageElement)).rejects.toThrow(
        'No se pudo inicializar el contexto de canvas',
      );
    });

    it('loads image from file using object URL and revokes it', async () => {
      const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
      const img = await loadImage(file);

      expect(img).toBeDefined();
      expect(createObjectURLSpy).toHaveBeenCalledWith(file);
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    });

    it('rejects loadImage if image fails to load and cleans up object URL', async () => {
      global.Image = class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        src = '';

        constructor() {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror();
            }
          }, 0);
        }
      } as any;

      const file = new File(['corrupt'], 'bad.jpg', { type: 'image/jpeg' });
      await expect(loadImage(file)).rejects.toThrow('No se pudo cargar la imagen para compresión');
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    });

    it('processes a file into both main WebP and thumbnail WebP blobs', async () => {
      const file = new File(['raw-image-data'], 'house.jpg', { type: 'image/jpeg' });
      const result = await processPropertyImageForUpload(file);

      expect(result.main).toBeDefined();
      expect(result.thumbnail).toBeDefined();
      expect(result.main.type).toBe('image/webp');
      expect(result.thumbnail.type).toBe('image/webp');
      expect(mockCanvas.toBlob).toHaveBeenCalledTimes(2);
    });
  });
});
