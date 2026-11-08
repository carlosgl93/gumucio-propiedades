/**
 * Currency Converter Service
 * Handles automatic currency conversion for PDF generation and pricing displays.
 * Fetches real-time UF from mindicador.cl (Banco Central de Chile) with 24-hour cache.
 * Falls back to exchangerate-api for standard fiat currencies.
 */
import { formatPrice } from './formatters';

interface ExchangeRates {
  [currency: string]: number;
}

interface CachedData<T> {
  data: T;
  timestamp: number;
}

const CACHE_KEY_RATES = 'currency_exchange_rates';
const CACHE_KEY_UF = 'uf_rate_mindicador';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const BASE_CURRENCY = 'USD';

/**
 * Fetch UF value directly from mindicador.cl (CLP value of 1 UF)
 */
export async function getUfValue(): Promise<number | null> {
  try {
    const cached = localStorage.getItem(CACHE_KEY_UF);
    if (cached) {
      const { data, timestamp }: CachedData<number> = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION && typeof data === 'number' && data > 0) {
        return data;
      }
    }
  } catch (error) {
    console.error('Error reading cached UF rate:', error);
  }

  try {
    const response = await fetch('https://mindicador.cl/api/uf');
    if (!response.ok) {
      console.error('Failed to fetch UF rate from mindicador:', response.statusText);
      return null;
    }

    const json = await response.json();
    const valor = json?.serie?.[0]?.valor;
    if (typeof valor === 'number' && valor > 0) {
      try {
        const cacheData: CachedData<number> = {
          data: valor,
          timestamp: Date.now(),
        };
        localStorage.setItem(CACHE_KEY_UF, JSON.stringify(cacheData));
      } catch (cacheError) {
        console.error('Error caching UF rate:', cacheError);
      }
      return valor;
    }
    return null;
  } catch (error) {
    console.error('Error fetching UF rate:', error);
    return null;
  }
}

/**
 * Fetch exchange rates from exchangerate-api
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
  try {
    const cached = localStorage.getItem(CACHE_KEY_RATES);
    if (cached) {
      const { data, timestamp }: CachedData<ExchangeRates> = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    }
  } catch (error) {
    console.error('Error reading cached rates:', error);
  }

  const rates = await fetchExchangeRates();
  if (rates) {
    try {
      const cacheData: CachedData<ExchangeRates> = {
        data: rates,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY_RATES, JSON.stringify(cacheData));
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

  // Direct CLP <-> UF conversions via mindicador.cl
  if (fromCurrency === 'CLP' && toCurrency === 'UF') {
    const ufValue = await getUfValue();
    return ufValue ? amount / ufValue : null;
  }

  if (fromCurrency === 'UF' && toCurrency === 'CLP') {
    const ufValue = await getUfValue();
    return ufValue ? amount * ufValue : null;
  }

  // General currency conversion fallback (USD, etc.)
  const rates = await getExchangeRates();
  if (!rates) {
    return null;
  }

  // Map UF to CLF in exchangerate-api if applicable
  const getRate = (curr: string) => {
    if (curr === 'UF') return rates['CLF'] || 1;
    return rates[curr] || 1;
  };

  const amountInUSD = fromCurrency === BASE_CURRENCY ? amount : amount / getRate(fromCurrency);
  const convertedAmount =
    toCurrency === BASE_CURRENCY ? amountInUSD : amountInUSD * getRate(toCurrency);

  return convertedAmount;
}

/**
 * Format price with currency conversion for display
 * Returns formatted string like "$ 80.000.000 (UF 2.000)"
 */
export async function formatPriceWithConversion(
  amount: number,
  currency: string,
  targetCurrency: string = 'UF',
): Promise<string> {
  const formattedPrice = formatPrice(amount, currency);

  if (currency === targetCurrency || !targetCurrency) {
    return formattedPrice;
  }

  const converted = await convertCurrency(amount, currency, targetCurrency);
  if (converted !== null) {
    const convertedFormatted = formatPrice(converted, targetCurrency);
    return `${formattedPrice} (${convertedFormatted})`;
  }

  return formattedPrice;
}

/**
 * Clear cached exchange rates (useful for testing or manual refresh)
 */
export function clearCachedRates(): void {
  try {
    localStorage.removeItem(CACHE_KEY_RATES);
    localStorage.removeItem(CACHE_KEY_UF);
  } catch (error) {
    console.error('Error clearing cached rates:', error);
  }
}
