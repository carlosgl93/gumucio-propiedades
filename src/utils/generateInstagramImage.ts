import { Property } from '@/models';

/**
 * Generates an Instagram Story image (1080x1920px) with property details
 * @param property The property to generate the image for
 * @returns Promise<Blob> The generated image as a Blob
 */
export const generateInstagramStoryImage = async (property: Property): Promise<Blob> => {
  // Instagram Story dimensions (9:16 aspect ratio)
  const CANVAS_WIDTH = 1080;
  const CANVAS_HEIGHT = 1920;

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No se pudo crear el contexto del canvas');
  }

  // Load and draw background image
  const firstImage = property.images?.[0]?.url;
  if (!firstImage) {
    throw new Error('La propiedad no tiene imágenes');
  }

  try {
    const img = await loadImage(firstImage);

    // Draw image - scale to cover canvas (mobile-first approach)
    const scale = Math.max(CANVAS_WIDTH / img.width, CANVAS_HEIGHT / img.height);
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    const x = (CANVAS_WIDTH - scaledWidth) / 2;
    const y = (CANVAS_HEIGHT - scaledHeight) / 2;

    ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

    // Add semi-transparent overlay at bottom for text
    const overlayHeight = 600;
    const gradient = ctx.createLinearGradient(0, CANVAS_HEIGHT - overlayHeight, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.7)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, CANVAS_HEIGHT - overlayHeight, CANVAS_WIDTH, overlayHeight);

    // Text styling - simple MVP style
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';

    // Title
    ctx.font = 'bold 60px Arial, sans-serif';
    const titleY = CANVAS_HEIGHT - 480;
    wrapText(ctx, property.title, CANVAS_WIDTH / 2, titleY, CANVAS_WIDTH - 100, 70);

    // Price
    const formattedPrice = formatPrice(property.price, property.currency);
    ctx.font = 'bold 70px Arial, sans-serif';
    ctx.fillText(formattedPrice, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 350);

    // Location
    ctx.font = '40px Arial, sans-serif';
    ctx.fillText(
      `${property.address.commune}, ${property.address.city}`,
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT - 280,
    );

    // Features in a row
    ctx.font = '35px Arial, sans-serif';
    const features: string[] = [];
    if (property.features.bedrooms) {
      features.push(`${property.features.bedrooms} dorm`);
    }
    if (property.features.bathrooms) {
      features.push(`${property.features.bathrooms} baños`);
    }
    if (property.features.totalArea) {
      features.push(`${property.features.totalArea}m²`);
    }

    const featuresText = features.join(' • ');
    ctx.fillText(featuresText, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 200);

    // Amenities (max 3)
    if (property.amenities && property.amenities.length > 0) {
      ctx.font = '30px Arial, sans-serif';
      const amenitiesText = property.amenities.slice(0, 3).join(' • ');
      ctx.fillText(amenitiesText, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 140);
    }

    // Convert canvas to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('No se pudo generar la imagen'));
          }
        },
        'image/jpeg',
        0.9,
      );
    });
  } catch (error) {
    console.error('Error generating Instagram image:', error);
    throw new Error('Error al generar la imagen para Instagram');
  }
};

/**
 * Loads an image with CORS support
 * @param url The URL of the image to load
 * @returns Promise<HTMLImageElement> The loaded image
 */
const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Enable CORS
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
    img.src = url;
  });
};

/**
 * Wraps text to fit within a specified width
 * @param ctx Canvas rendering context
 * @param text Text to wrap
 * @param x X position
 * @param y Y position
 * @param maxWidth Maximum width for text
 * @param lineHeight Height of each line
 */
const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) => {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
};

/**
 * Formats price for display
 * @param price The price to format
 * @param currency The currency (CLP or UF)
 * @returns Formatted price string
 */
const formatPrice = (price: number, currency: string): string => {
  if (currency === 'CLP') {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(price);
  }
  return `${currency} ${price.toLocaleString('es-CL')}`;
};
