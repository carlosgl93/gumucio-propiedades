import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearCachedRates,
  convertCurrency,
  formatPriceWithConversion,
  getUfValue,
} from './currencyConverter';

describe('currencyConverter', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearCachedRates();
  });

  describe('getUfValue', () => {
    it('fetches UF from mindicador.cl and returns valor', async () => {
      const mockResponse = {
        codigo: 'uf',
        serie: [{ fecha: '2026-11-08T03:00:00.000Z', valor: 40000 }],
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const uf = await getUfValue();
      expect(uf).toBe(40000);
      expect(fetch).toHaveBeenCalledWith('https://mindicador.cl/api/uf', expect.any(Object));
    });

    it('caches UF value in localStorage', async () => {
      const mockResponse = {
        codigo: 'uf',
        serie: [{ fecha: '2026-11-08T03:00:00.000Z', valor: 40000 }],
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await getUfValue();
      // Second call should not hit fetch
      const cachedUf = await getUfValue();
      expect(cachedUf).toBe(40000);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('returns null if fetch fails and no cache exists', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));
      const uf = await getUfValue();
      expect(uf).toBeNull();
    });

    it('falls back to stale cache if fetch fails', async () => {
      // Seed stale cache (> 24 hours ago)
      const staleTimestamp = Date.now() - 48 * 60 * 60 * 1000;
      localStorage.setItem(
        'uf_rate_mindicador',
        JSON.stringify({ data: 39500, timestamp: staleTimestamp }),
      );

      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('502 Bad Gateway'));
      const uf = await getUfValue();
      expect(uf).toBe(39500);
    });
  });

  describe('convertCurrency', () => {
    it('returns original amount if from and to currency are identical', async () => {
      const result = await convertCurrency(5000, 'UF', 'UF');
      expect(result).toBe(5000);
    });

    it('converts CLP to UF accurately using mindicador rate', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          serie: [{ valor: 40000 }],
        }),
      } as Response);

      const uf = await convertCurrency(80000000, 'CLP', 'UF');
      expect(uf).toBe(2000);
    });

    it('converts UF to CLP accurately', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          serie: [{ valor: 40000 }],
        }),
      } as Response);

      const clp = await convertCurrency(100, 'UF', 'CLP');
      expect(clp).toBe(4000000);
    });
  });

  describe('formatPriceWithConversion', () => {
    it('formats original and converted price in parentheses', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          serie: [{ valor: 40000 }],
        }),
      } as Response);

      const result = await formatPriceWithConversion(80000000, 'CLP', 'UF');
      expect(result).toMatch(/80\.000\.000/);
      expect(result).toContain('(UF 2.000)');
    });

    it('skips conversion when currency matches target', async () => {
      const result = await formatPriceWithConversion(5000, 'UF', 'UF');
      expect(result).toBe('UF 5.000');
    });
  });
});
