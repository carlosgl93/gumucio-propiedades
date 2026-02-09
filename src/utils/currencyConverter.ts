/**
 * Currency Converter Service
 * Handles automatic currency conversion for PDF generation
 * Uses exchangerate-api.com for real-time rates with 24-hour cache
 */

interface ExchangeRates {
  [currency: string]: number;
}

interface CachedRates {
  rates: ExchangeRates;
  timestamp: number;
}

const CACHE_KEY = 'currency_exchange_rates';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const BASE_CURRENCY = 'USD'; // Use USD as base for conversions

/**
 * Fetch exchange rates from API
 */
async function fetchExchangeRates(): Promise<ExchangeRates | null> {
  try {
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${BASE_CURRENCY}`);

    if (!response.ok) {
      console.error('Failed to fetch exchange rates:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data.rates as ExchangeRates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return null;
  }
}

/**
 * Get exchange rates from cache or API
 */
async function getExchangeRates(): Promise<ExchangeRates | null> {
  // Try to get from cache first
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { rates, timestamp }: CachedRates = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is still valid
      if (now - timestamp < CACHE_DURATION) {
        return rates;
      }
    }
  } catch (error) {
    console.error('Error reading cached rates:', error);
  }

  // Fetch new rates
  const rates = await fetchExchangeRates();
  if (rates) {
    try {
      const cacheData: CachedRates = {
        rates,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error caching rates:', error);
    }
  }

  return rates;
}

/**
 * Convert amount from one currency to another
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
): Promise<number | null> {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const rates = await getExchangeRates();
  if (!rates) {
    return null;
  }

  // Convert to USD first (base currency)
  const amountInUSD = fromCurrency === BASE_CURRENCY ? amount : amount / (rates[fromCurrency] || 1);

  // Convert from USD to target currency
  const convertedAmount =
    toCurrency === BASE_CURRENCY ? amountInUSD : amountInUSD * (rates[toCurrency] || 1);

  return convertedAmount;
}

/**
 * Format price with currency conversion for display
 * Returns formatted string like "UF 6.990 (3.737.950 C$)"
 */
export async function formatPriceWithConversion(
  amount: number,
  currency: string,
  targetCurrency: string = 'NIO', // Nicaraguan Córdoba
): Promise<string> {
  // Format the original price
  const formattedPrice = formatPrice(amount, currency);

  // Skip conversion if same currency or target is empty
  if (currency === targetCurrency || !targetCurrency) {
    return formattedPrice;
  }

  // Try to convert
  const converted = await convertCurrency(amount, currency, targetCurrency);
  if (converted !== null) {
    const convertedFormatted = formatPrice(converted, targetCurrency);
    return `${formattedPrice} (${convertedFormatted})`;
  }

  // Return original if conversion failed
  return formattedPrice;
}

/**
 * Format price based on currency
 */
function formatPrice(amount: number, currency: string): string {
  switch (currency) {
    case 'CLP':
      return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
      }).format(amount);

    case 'USD':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }).format(amount);

    case 'NIO':
      return new Intl.NumberFormat('es-NI', {
        style: 'currency',
        currency: 'NIO',
        minimumFractionDigits: 2,
      })
        .format(amount)
        .replace('C$', 'C$');

    case 'UF':
      // UF (Unidad de Fomento) - Chilean unit
      return `UF ${amount.toLocaleString('es-CL', {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      })}`;

    default:
      return `${currency} ${amount.toLocaleString()}`;
  }
}

/**
 * Clear cached exchange rates (useful for testing or manual refresh)
 */
export function clearCachedRates(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Error clearing cached rates:', error);
  }
}
