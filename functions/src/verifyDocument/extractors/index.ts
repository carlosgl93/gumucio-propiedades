import type { DocType, ExtractedDicom, ExtractedLiquidacion } from './types';
import { extractDicom } from './dicom';
import { extractLiquidacion } from './liquidacion';

export type Extracted = ExtractedDicom | ExtractedLiquidacion;

export function extract(text: string, type: DocType): Extracted {
  return type === 'dicom' ? extractDicom(text) : extractLiquidacion(text);
}

export { extractDicom, extractLiquidacion };
export * from './types';
