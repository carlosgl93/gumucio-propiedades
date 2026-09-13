// functions/src/verifyDocument/handler.ts
import { logger } from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';
import type { Request, Response } from 'express';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import sharp from 'sharp';

const minimaxApiKey = defineSecret('MINIMAX_API_KEY');

import { extract, type Extracted } from './extractors';
import type { ApplicantContext, DocType } from './extractors/types';
import { elaRegional } from './ela';
import { crossCheckForDicom, crossCheckForLiquidacion } from './rules/crossCheck';
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
): CrossResult {
  if (type === 'dicom') {
    return {
      crossCheckFlags: crossCheckForDicom(extracted as never, applicant),
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
    process.env.MINIMAX_API_KEY = minimaxApiKey.value();
    const file = (req as Request & { file?: Express.Multer.File }).file;
    const { type, applicantName, applicantRut, monthlyRent } = req.body as Record<string, string>;

    if (!type || !['dicom', 'liquidacion'].includes(type)) {
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
    let pdfParser: PDFParse | undefined;
    try {
      pdfParser = new PDFParse({ data: file.buffer });
      const parsed = await pdfParser.getText();
      text = parsed.text;
    } catch (err) {
      logger.warn('pdf-parse failed', err);
      res.status(422).json(FAIL_FLAGS.pdfUnreadable());
      return;
    } finally {
      if (pdfParser) {
        try { await pdfParser.destroy(); } catch { /* ignore */ }
      }
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
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(file.buffer) });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1 });
      const NodeCanvasFactory = (pdfjs as unknown as { NodeCanvasFactory: new () => unknown })
        .NodeCanvasFactory;
      const factory = new NodeCanvasFactory() as {
        create: (w: number, h: number) => {
          context: unknown;
          canvas: { toBuffer: (enc: string) => Buffer };
        };
      };
      const ctxCanvas = factory.create(viewport.width, viewport.height);
      await page
        .render({ canvasContext: ctxCanvas.context, viewport, canvasFactory: factory })
        .promise;
      const rawPng = ctxCanvas.canvas.toBuffer('image/png');
      pngBuf = await sharp(rawPng).png().toBuffer();
      if (typeof pdf.cleanup === 'function') await pdf.cleanup();
      if (typeof pdf.destroy === 'function') await pdf.destroy();
    } catch (err) {
      logger.warn('pdfjs render failed', err);
      res.status(422).json(FAIL_FLAGS.pdfUnrenderable());
      return;
    }

    const ela = await elaRegional(pngBuf);

    const extractedRaw = extract(text, docType);
    const extracted = { type: docType, ...extractedRaw } as Extracted & { type: DocType };

    const crossResult = crossCheckFor(docType, extractedRaw, applicant);

    const prompt = buildLlmPrompt(extracted, applicant, docType, pngBuf);
    const llm = await llmEvaluate(pngBuf, prompt, docType);

    const result = score({
      extracted,
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