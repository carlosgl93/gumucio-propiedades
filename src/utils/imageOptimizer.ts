export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'image/webp' | 'image/jpeg';
}

export interface ProcessedPropertyImages {
  main: Blob;
  thumbnail: Blob;
}

/**
 * Calculates proportional target dimensions preserving aspect ratio.
 */
export const calculateDimensions = (
  origWidth: number,
  origHeight: number,
  maxWidth: number,
  maxHeight: number,
): ImageDimensions => {
  if (origWidth <= 0 || origHeight <= 0) {
    return { width: Math.max(0, origWidth), height: Math.max(0, origHeight) };
  }

  if (origWidth <= maxWidth && origHeight <= maxHeight) {
    return { width: Math.round(origWidth), height: Math.round(origHeight) };
  }

  const ratio = Math.min(maxWidth / origWidth, maxHeight / origHeight);
  return {
    width: Math.max(1, Math.round(origWidth * ratio)),
    height: Math.max(1, Math.round(origHeight * ratio)),
  };
};

/**
 * Loads an image file or blob asynchronously.
 */
export const loadImage = (source: Blob | File | string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const isString = typeof source === 'string';
    const url = isString ? source : URL.createObjectURL(source);

    const cleanup = () => {
      if (!isString) {
        URL.revokeObjectURL(url);
      }
    };

    img.onload = () => {
      cleanup();
      resolve(img);
    };

    img.onerror = () => {
      cleanup();
      reject(new Error('No se pudo cargar la imagen para compresión'));
    };

    img.src = url;
  });
};

/**
 * Resizes and compresses an image element to a Blob in WebP format using Canvas.
 */
export const compressImage = async (
  image: HTMLImageElement,
  options: ImageOptimizationOptions = {},
): Promise<Blob> => {
  const { maxWidth = 1920, maxHeight = 1080, quality = 0.82, format = 'image/webp' } = options;

  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;

  const { width, height } = calculateDimensions(sourceWidth, sourceHeight, maxWidth, maxHeight);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No se pudo inicializar el contexto de canvas');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, width, height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          // Graceful fallback to JPEG if WebP export is unsupported
          if (format === 'image/webp') {
            canvas.toBlob(
              (fallbackBlob) => {
                if (fallbackBlob) {
                  resolve(fallbackBlob);
                } else {
                  reject(new Error('Error al generar blob comprimido'));
                }
              },
              'image/jpeg',
              quality,
            );
            return;
          }
          reject(new Error('Error al generar blob comprimido'));
          return;
        }
        resolve(blob);
      },
      format,
      quality,
    );
  });
};

/**
 * Processes a single property image file into an optimized main image and a thumbnail in WebP format.
 */
export const processPropertyImageForUpload = async (
  file: File,
): Promise<ProcessedPropertyImages> => {
  const img = await loadImage(file);

  const [main, thumbnail] = await Promise.all([
    compressImage(img, {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 0.82,
      format: 'image/webp',
    }),
    compressImage(img, {
      maxWidth: 480,
      maxHeight: 480,
      quality: 0.75,
      format: 'image/webp',
    }),
  ]);

  return {
    main,
    thumbnail,
  };
};

/**
 * Processes an image from an existing URL into an optimized main image and a thumbnail in WebP format.
 */
export const processImageUrlForUpload = async (
  imageUrl: string,
): Promise<ProcessedPropertyImages> => {
  const img = await loadImage(imageUrl);

  const [main, thumbnail] = await Promise.all([
    compressImage(img, {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 0.82,
      format: 'image/webp',
    }),
    compressImage(img, {
      maxWidth: 480,
      maxHeight: 480,
      quality: 0.75,
      format: 'image/webp',
    }),
  ]);

  return {
    main,
    thumbnail,
  };
};
