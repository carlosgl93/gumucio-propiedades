export const RUT_RE = /\b(\d{1,2}\.?\d{3}\.?\d{3})-?([\dK])\b/g;

export function isValidRut(num: string, dv: string): boolean {
  const clean = num.replace(/\./g, '');
  let sum = 0;
  let mult = 2;
  for (let i = clean.length - 1; i >= 0; i--) {
    sum += parseInt(clean[i], 10) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const expected = 11 - (sum % 11);
  const expectedDv = expected === 10 ? 'K' : expected === 11 ? '0' : String(expected);
  return expectedDv.toUpperCase() === dv.toUpperCase();
}

/**
 * Returns the Nth RUT (0-indexed, only valid mod-11) found in `text`, as `num-DV`.
 * Returns null if fewer than `skip + 1` valid RUTs are found.
 *
 * Fragility: relies on document order. For liquidación documents, the worker RUT
 * must appear before the employer RUT in the source text. If the order flips,
 * the returned RUTs will be mislabeled. Future improvement: parse by keyword
 * (`RUT:` → worker, `Empleador RUT:` → employer) for robustness.
 */
export function nthValidRut(text: string, skip: number): string | null {
  let i = 0;
  for (const m of text.matchAll(RUT_RE)) {
    if (isValidRut(m[1], m[2])) {
      if (i === skip) return `${m[1].replace(/\./g, '')}-${m[2]}`;
    }
    i++;
  }
  return null;
}
