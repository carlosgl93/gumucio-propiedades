import type { DocType } from '../extractors/types';
import type { ApplicantContext } from '../extractors/types';

export interface LlmPromptParts {
  text: string;
  imageBase64: string;
}

const SYSTEM_INSTRUCTION = `You are a Chilean real-estate document fraud detector.
Analyze the provided PDF render image and the extracted fields.
Look for:
- Visual tampering (font mismatches, misaligned text, missing logos, copy-paste seams)
- Text-image inconsistency (text in the prompt doesn't match the image)
- Signs of AI-generated synthetic PDFs (perfect typography, missing micro-details typical of scans)
- Format anomalies for the document type

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
  const docLabel = type === 'dicom' ? 'DICOM (Equifax credit certificate)' : 'LIQUIDACION DE SUELDO (pay slip)';
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
