import sharp from 'sharp';

const GRID = 4;
// Re-encode at q85: high enough that authentic customer docs (Equifax DICOM,
// liquidaciones) sit at maxCell ~0.08-0.12 baseline, low enough that edited
// patches spike above 0.15. Calibrated against 4 real customer PDFs.
const REENCODE_QUALITY = 85;
// Per-channel diff amplification. Without this, q85→q85 roundtrip diffs are
// sub-1% and can't be discriminated from JPEG quantization noise.
const AMPLIFY = 50;

export interface ElaResult {
  global: number;
  maxCell: number;
}

export async function elaRegional(pngBuf: Buffer): Promise<ElaResult> {
  if (pngBuf.length === 0) return { global: 0, maxCell: 0 };

  const img = sharp(pngBuf);
  const meta = await img.metadata();
  const w = meta.width ?? 1;
  const h = meta.height ?? 1;

  // Re-encode as JPEG. Strip alpha from BOTH buffers so raw bytes line up
  // pixel-for-pixel (PNG may have alpha=4 channels, JPEG always 3).
  const reencoded = await img.clone().jpeg({ quality: REENCODE_QUALITY }).toBuffer();
  const origRaw = await sharp(pngBuf).removeAlpha().raw().toBuffer();
  const reRaw = await sharp(reencoded).removeAlpha().raw().toBuffer();
  const channels = 3;

  const pixelCount = origRaw.length / channels;
  const width = pixelCount > 0 && h > 0 ? Math.min(w, Math.floor(pixelCount / h)) : w;
  const height = h;
  const cellW = Math.max(1, Math.floor(width / GRID));
  const cellH = Math.max(1, Math.floor(height / GRID));

  // Sanity: skip if buffers don't line up after alpha strip.
  if (origRaw.length !== reRaw.length) return { global: 0, maxCell: 0 };

  const cellSums = new Array<number>(GRID * GRID).fill(0);
  const cellCounts = new Array<number>(GRID * GRID).fill(0);
  let totalSum = 0;
  let totalCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      if (idx + channels > origRaw.length) break;
      let diff = 0;
      for (let c = 0; c < channels; c++) {
        const o = origRaw[idx + c];
        const r = reRaw[idx + c];
        // Amplified per-channel diff, clamped to 255 then normalized.
        const d = (o === undefined || r === undefined) ? 0 : Math.abs(o - r);
        diff += Math.min(255, d * AMPLIFY);
      }
      diff /= channels * 255;
      const cell = Math.floor(x / cellW) * GRID + Math.floor(y / cellH);
      cellSums[cell] += diff;
      cellCounts[cell] += 1;
      totalSum += diff;
      totalCount += 1;
    }
  }

  const global = totalCount > 0 ? totalSum / totalCount : 0;
  let maxCell = 0;
  for (let i = 0; i < cellSums.length; i++) {
    const cellMean = cellCounts[i] > 0 ? cellSums[i] / cellCounts[i] : 0;
    if (cellMean > maxCell) maxCell = cellMean;
  }
  return { global, maxCell };
}
