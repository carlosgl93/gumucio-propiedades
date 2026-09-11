/**
 * Formats a price for display.
 * - UF: integer grouping via toLocaleString('es-CL')
 * - CLP: currency style via Intl.NumberFormat
 * - USD: en-US currency style
 * - NIO: es-NI currency style
 * - Other currencies: fall back to `<CURRENCY> <number>`
 */
export const formatPrice = (price: number, currency: string): string => {
  switch (currency) {
    case 'CLP':
      return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
      }).format(price);

    case 'UF':
      return `UF ${price.toLocaleString('es-CL', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`;

    case 'USD':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }).format(price);

    case 'NIO':
      return new Intl.NumberFormat('es-NI', {
        style: 'currency',
        currency: 'NIO',
        minimumFractionDigits: 2,
      }).format(price);

    default:
      return `${currency} ${price.toLocaleString('es-CL')}`;
  }
};

/**
 * Capitalizes the first letter of every word in a string.
 * Trims surrounding whitespace. Returns empty string for null/undefined/blank.
 */
const capitalizeWords = (value: string | undefined | null): string => {
  if (!value) return '';
  return value
    .trim()
    .split(/\s+/)
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
};

/**
 * Formats a commune + city pair for display.
 * Capitalizes each word, drops empty parts, joins with ", ".
 */
export const formatLocation = (commune: string | undefined, city: string | undefined): string => {
  const parts = [capitalizeWords(commune), capitalizeWords(city)].filter(Boolean);
  return parts.join(', ');
};
