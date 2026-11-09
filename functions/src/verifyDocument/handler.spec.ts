// functions/src/verifyDocument/handler.spec.ts
import { describe, it, expect, vi, beforeAll } from 'vitest';
import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import request from 'supertest';

let TINY_PNG: Buffer;

beforeAll(async () => {
  TINY_PNG = await sharp({
    create: { width: 64, height: 64, channels: 3, background: { r: 200, g: 200, b: 200 } },
  })
    .png()
    .toBuffer();
});

vi.mock('pdf-parse', () => ({
  PDFParse: vi.fn(),
}));

vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  getDocument: vi.fn(),
}));

vi.mock('@napi-rs/canvas', () => ({
  createCanvas: vi.fn().mockImplementation(() => ({
    getContext: () => ({}),
    encode: async () => TINY_PNG,
    width: 100,
    height: 100,
  })),
}));

import { PDFParse } from 'pdf-parse';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from '@napi-rs/canvas';
import { verifyDocumentHandler } from './handler';

const mockPDFParse = vi.mocked(PDFParse);
const mockGetDocument = vi.mocked(getDocument);
// createCanvas referenced indirectly via vi.mock factory above
void createCanvas;

function buildApp() {
  const app = express();
  app.post(
    '/verifyDocument',
    multer({ storage: multer.memoryStorage() }).single('file'),
    verifyDocumentHandler,
  );
  return app;
}

describe('verifyDocumentHandler', () => {
  it('rejects non-PDF file with 400', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/verifyDocument')
      .attach('file', Buffer.from('hello'), { filename: 'test.txt', contentType: 'text/plain' })
      .field('type', 'dicom');
    expect(res.status).toBe(400);
  });

  it('returns 400 when type missing', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/verifyDocument')
      .attach('file', Buffer.from('%PDF-1.4'), { filename: 'test.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(400);
  });

  it('returns 422 with pdf_unreadable flag when pdf-parse throws', async () => {
    mockPDFParse.mockImplementationOnce(() => {
      throw new Error('corrupt');
    });
    const app = buildApp();
    const res = await request(app)
      .post('/verifyDocument')
      .attach('file', Buffer.from('not real pdf'), {
        filename: 'test.pdf',
        contentType: 'application/pdf',
      })
      .field('type', 'dicom');
    expect(res.status).toBe(422);
    expect(res.body.verdict).toBe('fail');
    expect(res.body.flags.some((f: { code: string }) => f.code === 'pdf_unreadable')).toBe(true);
  });

  it('returns verdict on happy path', async () => {
    mockPDFParse.mockImplementationOnce(() => ({
      getText: async () => ({ text: 'RUT: 12.345.678-5\nNombre: JUAN PEREZ' }),
      destroy: async () => undefined,
    } as unknown as PDFParse));
    const fakePage = {
      getViewport: () => ({ width: 100, height: 100 }),
      render: () => ({ promise: Promise.resolve({} as unknown) }),
      cleanup: () => undefined,
    };
    mockGetDocument.mockReturnValueOnce({
      promise: Promise.resolve({ numPages: 1, getPage: () => Promise.resolve(fakePage), destroy: async () => undefined }),
    } as unknown as ReturnType<typeof getDocument>);

    const app = buildApp();
    const res = await request(app)
      .post('/verifyDocument')
      .attach('file', Buffer.from('%PDF-1.4'), {
        filename: 'test.pdf',
        contentType: 'application/pdf',
      })
      .field('type', 'dicom')
      .field('applicantName', 'JUAN PEREZ')
      .field('applicantRut', '12345678-5')
      .field('monthlyRent', '500000');
    expect(res.status).toBe(200);
    expect(['pass', 'warn', 'fail']).toContain(res.body.verdict);
  });
});