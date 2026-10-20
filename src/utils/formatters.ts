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
        maximumFractionDigits: 2,
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
      return `${currency} ${price.toLocaleString('es-CL', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })}`;
  }
};

/**
 * Formats a decimal number using Chilean locale (dots for thousands, comma for decimals, up to maxFractionDigits).
 */
export const formatChileanNumber = (
  value: number | undefined | null,
  maxFractionDigits: number = 2,
): string => {
  if (value === undefined || value === null || isNaN(value)) return '';
  return value.toLocaleString('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  });
};

/**
 * Formats a number for display in inputs (comma for decimals, no thousands separator, clean for editing).
 * E.g., 15.5 -> "15,5", 15 -> "15", undefined/null -> ""
 */
export const formatNumberForInput = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '';
  }
  const rounded = Number(Math.round(Number(value + 'e+4')) + 'e-4');
  return rounded.toString().replace('.', ',');
};

export { parseChileanNumber } from './validations';

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
