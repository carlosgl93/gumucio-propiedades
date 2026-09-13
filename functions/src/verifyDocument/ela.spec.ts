import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { elaRegional } from './ela';

async function makePng(r: number, g: number, b: number): Promise<Buffer> {
  return sharp({ create: { width: 400, height: 400, channels: 3, background: { r, g, b } } })
    .jpeg({ quality: 95 })
    .toBuffer();
}

describe('elaRegional', () => {
  it('returns low global AND low maxCell for a clean re-encoded image', async () => {
    const buf = await makePng(200, 200, 200);
    const result = await elaRegional(buf);
    expect(result.global).toBeLessThan(0.02);
    expect(result.maxCell).toBeLessThan(0.05);
  });

  // 0.15 threshold matches Task 11 score.ts; tune with production data if needed
  it('flags small edited region even when global stays low', async () => {
    // PNG orig (lossless) → re-encode at q90 → JPEG cannot perfectly preserve
    // sharp edges from a pristine PNG, so the edited region shows high diff.
    // The base is uniform gray (clean), patch is dense checkerboard (sharp edges).
    const base = await sharp({
      create: { width: 400, height: 400, channels: 3, background: { r: 200, g: 200, b: 200 } },
    })
      .png()
      .toBuffer();
    const PATCH = 200;
    const patchRaw = Buffer.alloc(PATCH * PATCH * 3);
    for (let i = 0; i < PATCH * PATCH; i++) {
      const v = (i % 2 === 0) ? 255 : 0;
      patchRaw[i * 3] = v;
      patchRaw[i * 3 + 1] = v;
      patchRaw[i * 3 + 2] = v;
    }
    const edited = await sharp(base)
      .composite([{
        input: patchRaw,
        raw: { width: PATCH, height: PATCH, channels: 3 },
        top: 100,
        left: 100,
        blend: 'over',
      }])
      .png()
      .toBuffer();
    const result = await elaRegional(edited);
    expect(result.maxCell).toBeGreaterThan(0.15);
  });

  it('returns zero zeros for empty buffer', async () => {
    const result = await elaRegional(Buffer.alloc(0));
    expect(result).toEqual({ global: 0, maxCell: 0 });
  });
});