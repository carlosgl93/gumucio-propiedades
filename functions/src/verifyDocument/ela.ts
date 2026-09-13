import sharp from 'sharp';

const GRID = 4;
const REENCODE_QUALITY = 90;

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
  const cellW = Math.max(1, Math.floor(w / GRID));
  const cellH = Math.max(1, Math.floor(h / GRID));

  const reencoded = await img.clone().jpeg({ quality: REENCODE_QUALITY }).toBuffer();
  const origRaw = await sharp(pngBuf).raw().toBuffer();
  const reRaw = await sharp(reencoded).raw().toBuffer();
  const channels = meta.channels ?? 3;

  const cellSums = new Array<number>(GRID * GRID).fill(0);
  const cellCounts = new Array<number>(GRID * GRID).fill(0);
  let totalSum = 0;
  let totalCount = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * channels;
      let diff = 0;
      for (let c = 0; c < Math.min(channels, 3); c++) {
        diff += Math.abs(origRaw[idx + c] - reRaw[idx + c]);
      }
      diff /= Math.min(channels, 3) * 255;
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