import type { DocType } from '../extractors/types';
import type { ApplicantContext } from '../extractors/types';

export interface LlmPromptParts {
  text: string;
  imageBase64: string;
}

const SYSTEM_INSTRUCTION = `You are a Chilean real-estate document fraud detector.
Current reference context: Today is November 2026. Dates in 2026 are current and authentic (do NOT flag 2026 as future_date or synthetic).
Analyze the provided PDF render image and the extracted fields.
Look for:
- Visual tampering (font mismatches, misaligned text, missing logos, copy-paste seams)
- Text-image inconsistency (text in the prompt doesn't match the image)
- Signs of AI-generated synthetic PDFs (perfect typography, missing micro-details typical of scans)
- Format anomalies for the document type

Chilean document guidelines:
- DICOM / Informes Comerciales: May be issued by Equifax (Informe Platinum 360, Ley 19.628), Informes Comerciales (Platino-D, Platino-Empresa), Sinacofi, or Destácame. Both individual persons and companies are valid.
- LIQUIDACION DE SUELDO: Monthly pay slips with legal social security deductions (AFP, Fonasa/Isapre).
- CARPETA TRIBUTARIA: Official Servicio de Impuestos Internos (SII) tax folder for companies and independent contractors, showing Formulario 29 (F29) declarations and tax initiation dates.

You may think step-by-step, but your FINAL reply must be ONLY a single JSON object, no markdown, no code block:
{
  "score": <integer 0-15, where 15 = clearly authentic>,
  "flags": [<string codes like "ai_generated_suspected", "font_mismatch", "logo_missing", "text_image_inconsistent">],
  "confidence": <float 0.1-1.0>
}
Be conservative: if uncertain, lower the score. The JSON object must be the last thing in your response.`;

export function buildLlmPrompt(
  extracted: Record<string, unknown>,
  applicant: ApplicantContext,
  type: DocType,
  imageBuf: Buffer,
): LlmPromptParts {
  let docLabel = 'LIQUIDACION DE SUELDO (pay slip)';
  if (type === 'dicom') {
    docLabel = 'DICOM / Informe Comercial (Equifax, Informes Comerciales Platino, Sinacofi)';
  } else if (type === 'carpeta_tributaria') {
    docLabel = 'CARPETA TRIBUTARIA (SII official tax folder)';
  }

  const text = [
    SYSTEM_INSTRUCTION,
    '',
    `Document type: ${docLabel}`,
    `Applicant name (from form): ${applicant.applicantName}`,
    `Applicant RUT (from form): ${applicant.applicantRut}`,
    `Expected monthly rent: ${applicant.monthlyRent} CLP`,
    '',
    'Extracted fields (may be partial):',
    JSON.stringify(extracted, null, 2),
  ].join('\n');

  return { text, imageBase64: imageBuf.toString('base64') };
}
