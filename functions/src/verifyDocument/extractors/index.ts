import type {
  DocType,
  ExtractedDicom,
  ExtractedLiquidacion,
  ExtractedCarpetaTributaria,
} from './types';
import { extractDicom } from './dicom';
import { extractLiquidacion } from './liquidacion';
import { extractCarpetaTributaria } from './carpetaTributaria';

export type Extracted =
  | ExtractedDicom
  | ExtractedLiquidacion
  | ExtractedCarpetaTributaria;

export function extract(text: string, type: DocType): Extracted {
  if (type === 'dicom') return extractDicom(text);
  if (type === 'carpeta_tributaria') return extractCarpetaTributaria(text);
  return extractLiquidacion(text);
}

export { extractDicom, extractLiquidacion, extractCarpetaTributaria };
export * from './types';
