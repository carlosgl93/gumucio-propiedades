// functions/src/verifyDocument/handler.ts
import { logger } from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';
import type { Request, Response } from 'express';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import sharp from 'sharp';

const minimaxApiKey = defineSecret('GEMINI_API_KEY');

import { extract, type Extracted } from './extractors';
import type { ApplicantContext, DocType } from './extractors/types';
import { elaRegional } from './ela';
import {
  crossCheckForDicom,
  crossCheckForLiquidacion,
  crossCheckForCarpetaTributaria,
} from './rules/crossCheck';
import { llmEvaluate } from './rules/llmEval';
import { buildLlmPrompt } from './rules/llmPrompt';
import { score } from './rules/score';
import type { Flag, VerificationResult } from './rules/types';

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('Only PDF allowed'));
      return;
    }
    cb(null, true);
  },
});

type CrossResult = { crossCheckFlags: Flag[]; employerFormatFlags: Flag[] };

function crossCheckFor(
  type: DocType,
  extracted: Extracted,
  applicant: ApplicantContext,
  fullText?: string,
): CrossResult {
  if (type === 'dicom') {
    return {
      crossCheckFlags: crossCheckForDicom(extracted as never, applicant),
      employerFormatFlags: [],
    };
  }
  if (type === 'carpeta_tributaria') {
    return {
      crossCheckFlags: crossCheckForCarpetaTributaria(extracted as never, applicant, fullText),
      employerFormatFlags: [],
    };
  }
  return crossCheckForLiquidacion(extracted as never, applicant);
}

const FAIL_FLAGS = {
  pdfUnreadable: (): VerificationResult => ({
    score: 0,
    verdict: 'fail',
    flags: [{ code: 'pdf_unreadable', weight: 0, message: 'No se pudo leer el PDF' }],
    extractedFields: {},
    llmUnavailable: true,
  }),
  pdfUnrenderable: (): VerificationResult => ({
    score: 0,
    verdict: 'fail',
    flags: [{ code: 'pdf_unrenderable', weight: 0, message: 'No se pudo renderizar el PDF' }],
    extractedFields: {},
    llmUnavailable: true,
  }),
};

export const verifyDocumentHandler = async (req: Request, res: Response): Promise<void> => {
  const start = Date.now();
  try {
    process.env.GEMINI_API_KEY = minimaxApiKey.value();
    const file = (req as Request & { file?: Express.Multer.File }).file;
    const { type, applicantName, applicantRut, monthlyRent } = req.body as Record<string, string>;

    if (!type || !['dicom', 'liquidacion', 'carpeta_tributaria'].includes(type)) {
      res.status(400).json({ error: 'Missing or invalid type' });
      return;
    }
    if (!file) {
      res.status(400).json({ error: 'Missing file' });
      return;
    }
    if (file.mimetype !== 'application/pdf') {
      res.status(400).json({ error: 'Only PDF allowed' });
      return;
    }

    const docType = type as DocType;

    let text: string;
    try {
      const textParser = new PDFParse({ data: new Uint8Array(file.buffer) });
      const parsed = await textParser.getText();
      text = parsed.text;
      await textParser.destroy();
    } catch (err) {
      logger.warn('pdf-parse failed', err);
      res.status(422).json(FAIL_FLAGS.pdfUnreadable());
      return;
    }

    if (!applicantName || !applicantRut || !monthlyRent) {
      res.status(400).json({ error: 'Missing applicant context' });
      return;
    }

    const applicant: ApplicantContext = {
      applicantName,
      applicantRut,
      monthlyRent: Number(monthlyRent),
    };

    let pngBuf: Buffer;
    try {
      // Use pdfjs-dist@5 (matches the bundled worker version in pdf-parse@2.4.5).
      // pdf-parse.getScreenshot() hits a DataCloneError on Node 22+ (pdf-parse#119),
      // so we render directly via pdfjs-dist + @napi-rs/canvas (prebuilt, no node-gyp).
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const { createCanvas } = await import('@napi-rs/canvas');
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(file.buffer),
        canvasFactory: {
          create(w: number, h: number) {
            const canvas = createCanvas(w, h);
            return { canvas, context: canvas.getContext('2d') };
          },
          reset(canvasAndContext: { canvas: { width: number; height: number } }, w: number, h: number) {
            canvasAndContext.canvas.width = w;
            canvasAndContext.canvas.height = h;
          },
          destroy(canvasAndContext: { canvas: { width: number; height: number } }) {
            canvasAndContext.canvas.width = 0;
            canvasAndContext.canvas.height = 0;
            (canvasAndContext.canvas as unknown as { _destroy?: () => void })._destroy?.();
          },
        },
      } as never);
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1 });
      const canvas = createCanvas(viewport.width, viewport.height);
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx as never, viewport, canvas: canvas as never }).promise;
      pngBuf = await sharp(await canvas.encode('png')).png().toBuffer();
      await pdf.destroy();
    } catch (err) {
      logger.warn('pdfjs render failed', err);
      res.status(422).json(FAIL_FLAGS.pdfUnrenderable());
      return;
    }

    const ela = await elaRegional(pngBuf);

    const extractedRaw = extract(text, docType);
    const extracted = { type: docType, ...extractedRaw } as Extracted & { type: DocType };

    const crossResult = crossCheckFor(docType, extractedRaw, applicant, text);

    const prompt = buildLlmPrompt(extracted as unknown as Record<string, unknown>, applicant, docType, pngBuf);
    let llm: Awaited<ReturnType<typeof llmEvaluate>>;
    try {
      llm = await llmEvaluate(pngBuf, prompt, docType);
    } catch (err) {
      logger.warn('llmEvaluate failed; scoring without LLM', err);
      llm = null;
    }

    const result = score({
      extracted: extracted as unknown as Record<string, unknown>,
      ela,
      crossCheckFlags: crossResult.crossCheckFlags,
      employerFormatFlags: crossResult.employerFormatFlags,
      llm,
      monthlyRent: applicant.monthlyRent,
      applicant,
    });

    logger.info('verify', {
      type: docType,
      sizeBytes: file.size,
      score: result.score,
      verdict: result.verdict,
      flags: result.flags.map((f) => f.code),
      durationMs: Date.now() - start,
    });

    res.status(200).json(result);
  } catch (err) {
    logger.error('verifyDocumentHandler error', err);
    res.status(500).json({ error: 'Internal error' });
  }
};