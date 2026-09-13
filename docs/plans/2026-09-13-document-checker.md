# Document Checker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tenant document verification feature to the Gumucio Propiedades admin dashboard so the agency can detect forged DICOM and liquidación de sueldo PDFs before approving rentals.

**Architecture:** Sync upload from new `Postulaciones` tab inside `AdminDashboard` → POST `/api/verifyDocument` on the existing Express Functions app. Server runs a pipeline: PDF text extraction → ELA regional (4×4 grid) → regex extractors → cross-check vs applicant context → MiniMax M3 vision LLM eval → weighted score with thresholds 90/70. PDFs persist to Firebase Storage, verdicts to Firestore subcollection. Admin always confirms final status (no auto-approve).

**Tech Stack:** Existing: Firebase Functions (Node 20, Express, cors), Firebase Storage, Firestore, React 19 + Vite 6 + MUI 6 + TanStack Query + React Router 7. New server libs: `pdf-parse`, `pdfjs-dist` (legacy build, server-side), `sharp`, `multer`, MiniMax M3 SDK. New env: `MINIMAX_API_KEY` via Firebase secrets.

**Spec source:** `docs/superpowers/specs/2026-09-11-document-checker-design.md`

**Test framework:** Vitest (existing, both client and Functions).

---

## File map

| File | Action | Responsibility |
|---|---|---|
| `functions/src/verifyDocument/ela.ts` | CREATE | Regional ELA: re-encode + 4×4 grid diff |
| `functions/src/verifyDocument/extractors/types.ts` | CREATE | `ExtractedDicom`, `ExtractedLiquidacion`, `DocType`, `ApplicantContext` |
| `functions/src/verifyDocument/extractors/dicom.ts` | CREATE | Regex extractor for DICOM PDFs |
| `functions/src/verifyDocument/extractors/liquidacion.ts` | CREATE | Regex extractor for liquidación PDFs |
| `functions/src/verifyDocument/extractors/index.ts` | CREATE | Dispatcher |
| `functions/src/verifyDocument/rules/types.ts` | CREATE | `Flag`, `Verdict`, `VerificationResult`, `LlmEvaluation` |
| `functions/src/verifyDocument/rules/crossCheck.ts` | CREATE | Applicant vs extracted field validation |
| `functions/src/verifyDocument/rules/llmPrompt.ts` | CREATE | Prompt + image base64 builder |
| `functions/src/verifyDocument/rules/llmEval.ts` | CREATE | MiniMax M3 vision call + timeout |
| `functions/src/verifyDocument/rules/score.ts` | CREATE | Weighted aggregate + re-normalize + thresholds |
| `functions/src/verifyDocument/rules/index.ts` | CREATE | Re-exports |
| `functions/src/verifyDocument/handler.ts` | CREATE | Express handler with multer + pipeline |
| `functions/src/index.ts` | MODIFY | Mount `/verifyDocument` route |
| `functions/package.json` | MODIFY | Add deps |
| `firestore.rules` | MODIFY | `postulaciones` rules |
| `storage.rules` | MODIFY | `postulaciones/{id}/**` rules |
| `src/models/application.ts` | CREATE | `Postulacion`, `Documento`, `VerificationResult` |
| `src/services/application.ts` | CREATE | TanStack Query mutations + queries |
| `src/sections/Postulaciones/PostulacionesList.tsx` | CREATE | List view |
| `src/sections/Postulaciones/PostulacionForm.tsx` | CREATE | New-application modal |
| `src/sections/Postulaciones/PostulacionDetail.tsx` | CREATE | Single application view |
| `src/sections/Postulaciones/DocumentUploader.tsx` | CREATE | Per-type uploader with verdict flow |
| `src/sections/Postulaciones/VerdictPanel.tsx` | CREATE | MUI verdict display |
| `src/sections/Postulaciones/index.ts` | CREATE | Re-exports |
| `src/pages/AdminDashboard/AdminDashboard.tsx` | MODIFY | Add `Postulaciones` tab |
| `e2e/postulaciones.spec.ts` | CREATE | Playwright happy path |
| `functions/src/verifyDocument/__fixtures__/*.pdf` | CREATE | 4 redacted fixtures |

---

## Task 1: Add server dependencies

**Files:**
- Modify: `functions/package.json`

- [ ] **Step 1: Add deps**

```bash
cd /Users/consultor/cgl/gumucio-properties/functions
pnpm add pdf-parse pdfjs-dist@4.7.76 sharp multer
pnpm add -D @types/multer
```

(`pdfjs-dist@4.7.76` is pinned to the latest version with stable legacy build; bump if newer works.)

- [ ] **Step 2: Verify install**

Run: `cd functions && pnpm list pdf-parse pdfjs-dist sharp multer`
Expected: All four packages appear with version numbers.

- [ ] **Step 3: Commit**

```bash
git add functions/package.json functions/pnpm-lock.yaml
git commit -m "feat(functions): add pdf-parse, pdfjs-dist, sharp, multer deps"
```

---

## Task 2: ELA regional module

**Files:**
- Create: `functions/src/verifyDocument/ela.ts`
- Test: `functions/src/verifyDocument/ela.spec.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// functions/src/verifyDocument/ela.spec.ts
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
    const result = elaRegional(buf);
    expect(result.global).toBeLessThan(0.02);
    expect(result.maxCell).toBeLessThan(0.05);
  });

  it('flags small edited region even when global stays low', async () => {
    const base = await makePng(200, 200, 200);
    const edited = await sharp(base)
      .composite([{ input: Buffer.from(Uint8Array.from({ length: 30 * 30 * 3 }, () => 0)), raw: { width: 30, height: 30, channels: 3 }, tile: false, blend: 'over' }])
      .jpeg({ quality: 90 })
      .toBuffer();
    const result = elaRegional(edited);
    expect(result.maxCell).toBeGreaterThan(0.15);
  });

  it('returns zero zeros for empty buffer', () => {
    const result = elaRegional(Buffer.alloc(0));
    expect(result).toEqual({ global: 0, maxCell: 0 });
  });
});
```

- [ ] **Step 2: Run tests, expect fail**

Run: `cd functions && pnpm vitest run src/verifyDocument/ela.spec.ts`
Expected: FAIL — `elaRegional` not exported.

- [ ] **Step 3: Implement `ela.ts`**

```typescript
// functions/src/verifyDocument/ela.ts
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
```

- [ ] **Step 4: Run tests, expect pass**

Run: `cd functions && pnpm vitest run src/verifyDocument/ela.spec.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add functions/src/verifyDocument/ela.ts functions/src/verifyDocument/ela.spec.ts
git commit -m "feat(verifyDocument): add regional ELA with 4x4 grid cell diff"
```

---

## Task 3: Extractor types

**Files:**
- Create: `functions/src/verifyDocument/extractors/types.ts`

- [ ] **Step 1: Create types**

```typescript
// functions/src/verifyDocument/extractors/types.ts
export type DocType = 'dicom' | 'liquidacion';

export interface ExtractedDicom {
  rut: string | null;
  name: string | null;
  fechaEmision: string | null;
  plazoHistorico: string | null;
  protestos: number | null;
}

export interface ExtractedLiquidacion {
  rut: string | null;
  employerRut: string | null;
  employerName: string | null;
  grossIncome: number | null;
  netIncome: number | null;
  period: string | null;
}

export interface ApplicantContext {
  applicantName: string;
  applicantRut: string;
  monthlyRent: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add functions/src/verifyDocument/extractors/types.ts
git commit -m "feat(verifyDocument): add extractor type definitions"
```

---

## Task 4: DICOM extractor (TDD)

**Files:**
- Create: `functions/src/verifyDocument/extractors/dicom.ts`
- Create: `functions/src/verifyDocument/extractors/__fixtures__/dicom-valid.txt`
- Create: `functions/src/verifyDocument/extractors/__fixtures__/dicom-missing-rut.txt`
- Create: `functions/src/verifyDocument/extractors/__fixtures__/dicom-bad-rut.txt`
- Test: `functions/src/verifyDocument/extractors/dicom.spec.ts`

- [ ] **Step 1: Create fixtures**

`functions/src/verifyDocument/extractors/__fixtures__/dicom-valid.txt`:
```
CERTIFICADO DE ANTECEDENTES COMERCIALES
Equifax Chile S.A.
RUT: 12.345.678-5
Nombre: JUAN PEREZ GONZALEZ
Fecha de emision: 2026-08-15
Plazo de historial: 8 anos
Protestos: 0
```

`functions/src/verifyDocument/extractors/__fixtures__/dicom-missing-rut.txt`:
```
CERTIFICADO DE ANTECEDENTES COMERCIALES
Nombre: MARIA LOPEZ
Fecha de emision: 2026-07-01
Protestos: 2
```

`functions/src/verifyDocument/extractors/__fixtures__/dicom-bad-rut.txt`:
```
CERTIFICADO
RUT: 99.999.999-0
Nombre: PEDRO SOTO
Fecha de emision: 2026-01-01
Protestos: 0
```

- [ ] **Step 2: Write failing tests**

```typescript
// functions/src/verifyDocument/extractors/dicom.spec.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { extractDicom } from './dicom';

const fx = (n: string) => readFileSync(resolve(__dirname, '__fixtures__', n), 'utf8');

describe('extractDicom', () => {
  it('extracts all fields from a valid DICOM text', () => {
    const r = extractDicom(fx('dicom-valid.txt'));
    expect(r.rut).toBe('12345678-5');
    expect(r.name).toBe('JUAN PEREZ GONZALEZ');
    expect(r.fechaEmision).toBe('2026-08-15');
    expect(r.plazoHistorico).toBe('8 anos');
    expect(r.protestos).toBe(0);
  });

  it('returns nulls when RUT missing', () => {
    const r = extractDicom(fx('dicom-missing-rut.txt'));
    expect(r.rut).toBeNull();
    expect(r.name).toBe('MARIA LOPEZ');
    expect(r.protestos).toBe(2);
  });

  it('returns null when RUT check digit invalid (mod-11)', () => {
    const r = extractDicom(fx('dicom-bad-rut.txt'));
    expect(r.rut).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests, expect fail**

Run: `cd functions && pnpm vitest run src/verifyDocument/extractors/dicom.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement**

```typescript
// functions/src/verifyDocument/extractors/dicom.ts
import type { ExtractedDicom } from './types';

const RUT_RE = /\b(\d{1,2}\.?\d{3}\.?\d{3})-?([\dK])\b/g;
const NAME_RE = /Nombre[:\s]+([A-ZÁÉÍÓÚÑ\s]{5,80})/i;
const DATE_RE = /Fecha(?:\s+de\s+emisi[oó]n)?[:\s]+(\d{4}-\d{2}-\d{2})/i;
const PLAZO_RE = /Plazo\s+de\s+historial[:\s]+([^\n]+)/i;
const PROT_RE = /Protestos[:\s]+(\d+)/i;

function rutValid(rut: string, dv: string): boolean {
  const num = rut.replace(/\./g, '');
  let sum = 0;
  let mult = 2;
  for (let i = num.length - 1; i >= 0; i--) {
    sum += parseInt(num[i], 10) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const expected = 11 - (sum % 11);
  const expectedDv = expected === 10 ? 'K' : expected === 11 ? '0' : String(expected);
  return expectedDv.toUpperCase() === dv.toUpperCase();
}

export function extractDicom(text: string): ExtractedDicom {
  let rut: string | null = null;
  for (const m of text.matchAll(RUT_RE)) {
    const candidate = `${m[1].replace(/\./g, '')}-${m[2]}`;
    if (rutValid(m[1], m[2])) {
      rut = candidate;
      break;
    }
  }

  const name = text.match(NAME_RE)?.[1]?.trim() ?? null;
  const fechaEmision = text.match(DATE_RE)?.[1] ?? null;
  const plazoHistorico = text.match(PLAZO_RE)?.[1]?.trim() ?? null;
  const protMatch = text.match(PROT_RE)?.[1];
  const protestos = protMatch !== undefined ? parseInt(protMatch, 10) : null;

  return { rut, name, fechaEmision, plazoHistorico, protestos };
}
```

- [ ] **Step 5: Run tests, expect pass**

Run: `cd functions && pnpm vitest run src/verifyDocument/extractors/dicom.spec.ts`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add functions/src/verifyDocument/extractors/
git commit -m "feat(verifyDocument): add DICOM extractor with RUT mod-11 validation"
```

---

## Task 5: Liquidación extractor (TDD)

**Files:**
- Create: `functions/src/verifyDocument/extractors/liquidacion.ts`
- Create: `functions/src/verifyDocument/extractors/__fixtures__/liquidacion-valid.txt`
- Create: `functions/src/verifyDocument/extractors/__fixtures__/liquidacion-partial.txt`
- Test: `functions/src/verifyDocument/extractors/liquidacion.spec.ts`

- [ ] **Step 1: Create fixtures**

`__fixtures__/liquidacion-valid.txt`:
```
LIQUIDACION DE SUELDO
Empleador: EMPRESA XYZ S.A.
Empleador RUT: 76.123.456-7
Trabajador: ANA RAMIREZ
RUT: 15.987.654-2
Periodo: 2026-08
Sueldo bruto: 1.500.000
Descuentos legales: 280.000
Sueldo liquido: 1.220.000
```

`__fixtures__/liquidacion-partial.txt`:
```
LIQUIDACION
Periodo: 2026-07
Sueldo bruto: 800.000
```

- [ ] **Step 2: Write failing tests**

```typescript
// functions/src/verifyDocument/extractors/liquidacion.spec.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { extractLiquidacion } from './liquidacion';

const fx = (n: string) => readFileSync(resolve(__dirname, '__fixtures__', n), 'utf8');

describe('extractLiquidacion', () => {
  it('extracts all fields from a valid liquidación', () => {
    const r = extractLiquidacion(fx('liquidacion-valid.txt'));
    expect(r.rut).toBe('15987654-2');
    expect(r.employerRut).toBe('76123456-7');
    expect(r.employerName).toBe('EMPRESA XYZ S.A.');
    expect(r.grossIncome).toBe(1_500_000);
    expect(r.netIncome).toBe(1_220_000);
    expect(r.period).toBe('2026-08');
  });

  it('returns nulls for missing fields, only sets the present one', () => {
    const r = extractLiquidacion(fx('liquidacion-partial.txt'));
    expect(r.grossIncome).toBe(800_000);
    expect(r.rut).toBeNull();
    expect(r.employerName).toBeNull();
    expect(r.netIncome).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests, expect fail**

Run: `cd functions && pnpm vitest run src/verifyDocument/extractors/liquidacion.spec.ts`
Expected: FAIL.

- [ ] **Step 4: Implement**

```typescript
// functions/src/verifyDocument/extractors/liquidacion.ts
import type { ExtractedLiquidacion } from './types';

const RUT_RE = /\b(\d{1,2}\.?\d{3}\.?\d{3})-?([\dK])\b/g;
const EMPLOYER_NAME_RE = /Empleador[:\s]+([A-ZÁÉÍÓÚÑ0-9\s\.\-&]{3,80})/i;
const PERIOD_RE = /Periodo[:\s]+(\d{4}-\d{2})/i;
const MONEY_RE = (label: string) =>
  new RegExp(`${label}[:\\s]+\\$?\\s*([\\d.]+)`, 'i');
const GROSS_RE = MONEY_RE('Sueldo\\s+bruto');
const NET_RE = MONEY_RE('Sueldo\\s+l[ií]quido');

function parseMoney(s: string): number {
  return parseInt(s.replace(/\./g, '').replace(/\s/g, ''), 10);
}

function firstValidRut(text: string, skip = 0): string | null {
  let i = 0;
  for (const m of text.matchAll(RUT_RE)) {
    const num = m[1].replace(/\./g, '');
    const dv = m[2];
    let sum = 0;
    let mult = 2;
    for (let k = num.length - 1; k >= 0; k--) {
      sum += parseInt(num[k], 10) * mult;
      mult = mult === 7 ? 2 : mult + 1;
    }
    const expected = 11 - (sum % 11);
    const expectedDv = expected === 10 ? 'K' : expected === 11 ? '0' : String(expected);
    if (expectedDv.toUpperCase() === dv.toUpperCase()) {
      if (i === skip) return `${num}-${dv}`;
      i++;
    }
  }
  return null;
}

export function extractLiquidacion(text: string): ExtractedLiquidacion {
  const rut = firstValidRut(text, 0);
  const employerRut = firstValidRut(text, 1);
  const employerName = text.match(EMPLOYER_NAME_RE)?.[1]?.trim() ?? null;
  const period = text.match(PERIOD_RE)?.[1] ?? null;
  const grossRaw = text.match(GROSS_RE)?.[1];
  const netRaw = text.match(NET_RE)?.[1];
  return {
    rut,
    employerRut,
    employerName,
    grossIncome: grossRaw ? parseMoney(grossRaw) : null,
    netIncome: netRaw ? parseMoney(netRaw) : null,
    period,
  };
}
```

- [ ] **Step 5: Run tests, expect pass**

Run: `cd functions && pnpm vitest run src/verifyDocument/extractors/liquidacion.spec.ts`
Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```bash
git add functions/src/verifyDocument/extractors/liquidacion.ts functions/src/verifyDocument/extractors/__fixtures__/liquidacion-*.txt functions/src/verifyDocument/extractors/liquidacion.spec.ts
git commit -m "feat(verifyDocument): add liquidación extractor with money parsing"
```

---

## Task 6: Extractor dispatcher

**Files:**
- Create: `functions/src/verifyDocument/extractors/index.ts`

- [ ] **Step 1: Implement**

```typescript
// functions/src/verifyDocument/extractors/index.ts
import type { DocType, ExtractedDicom, ExtractedLiquidacion } from './types';
import { extractDicom } from './dicom';
import { extractLiquidacion } from './liquidacion';

export type Extracted = ExtractedDicom | ExtractedLiquidacion;

export function extract(text: string, type: DocType): Extracted {
  return type === 'dicom' ? extractDicom(text) : extractLiquidacion(text);
}

export { extractDicom, extractLiquidacion };
export * from './types';
```

- [ ] **Step 2: Commit**

```bash
git add functions/src/verifyDocument/extractors/index.ts
git commit -m "feat(verifyDocument): add extractor dispatcher"
```

---

## Task 7: Rule types

**Files:**
- Create: `functions/src/verifyDocument/rules/types.ts`

- [ ] **Step 1: Create**

```typescript
// functions/src/verifyDocument/rules/types.ts
import type { ApplicantContext } from '../extractors/types';

export type Verdict = 'pass' | 'warn' | 'fail';

export interface Flag {
  code: string;
  weight: number; // 0..max for this check
  message: string;
}

export interface LlmEvaluation {
  score: number; // 0..15
  flags: string[];
  confidence: number; // 0..1
}

export interface VerificationResult {
  score: number;
  verdict: Verdict;
  flags: Flag[];
  extractedFields: Record<string, unknown>;
  llmUnavailable: boolean;
}

export interface ScoreInput {
  extracted: Record<string, unknown>;
  ela: { global: number; maxCell: number };
  crossCheckFlags: Flag[];
  employerFormatFlags: Flag[];
  llm: LlmEvaluation | null;
  monthlyRent: number;
  applicant: ApplicantContext;
}
```

- [ ] **Step 2: Commit**

```bash
git add functions/src/verifyDocument/rules/types.ts
git commit -m "feat(verifyDocument): add rule type definitions"
```

---

## Task 8: Cross-check module (TDD)

**Files:**
- Create: `functions/src/verifyDocument/rules/crossCheck.ts`
- Test: `functions/src/verifyDocument/rules/crossCheck.spec.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// functions/src/verifyDocument/rules/crossCheck.spec.ts
import { describe, it, expect } from 'vitest';
import { crossCheckForDicom, crossCheckForLiquidacion } from './crossCheck';

const applicant = {
  applicantName: 'JUAN PEREZ GONZALEZ',
  applicantRut: '12345678-5',
  monthlyRent: 500000,
};

describe('crossCheckForDicom', () => {
  it('returns no flags when name and RUT match', () => {
    const flags = crossCheckForDicom(
      { rut: '12345678-5', name: 'JUAN PEREZ GONZALEZ', fechaEmision: null, plazoHistorico: null, protestos: null },
      applicant,
    );
    expect(flags).toHaveLength(0);
  });

  it('returns identity_mismatch when name differs', () => {
    const flags = crossCheckForDicom(
      { rut: '12345678-5', name: 'OTRO NOMBRE', fechaEmision: null, plazoHistorico: null, protestos: null },
      applicant,
    );
    expect(flags.some(f => f.code === 'identity_mismatch')).toBe(true);
  });

  it('returns identity_mismatch when RUT differs', () => {
    const flags = crossCheckForDicom(
      { rut: '99999999-9', name: 'JUAN PEREZ GONZALEZ', fechaEmision: null, plazoHistorico: null, protestos: null },
      applicant,
    );
    expect(flags.some(f => f.code === 'identity_mismatch')).toBe(true);
  });
});

describe('crossCheckForLiquidacion', () => {
  it('returns no flags when name, RUT, employer RUT are all valid and well-formed', () => {
    const flags = crossCheckForLiquidacion(
      {
        rut: '12345678-5',
        employerRut: '76123456-7',
        employerName: 'EMPRESA',
        grossIncome: 1500000,
        netIncome: 1200000,
        period: '2026-08',
      },
      applicant,
    );
    expect(flags.some(f => f.code === 'identity_mismatch')).toBe(false);
    expect(flags.some(f => f.code === 'employer_rut_invalid')).toBe(false);
  });

  it('flags employer_rut_invalid when employer RUT fails mod-11', () => {
    const flags = crossCheckForLiquidacion(
      {
        rut: '12345678-5',
        employerRut: '12.345.678-9',
        employerName: 'EMPRESA',
        grossIncome: 1500000,
        netIncome: 1200000,
        period: '2026-08',
      },
      applicant,
    );
    expect(flags.some(f => f.code === 'employer_rut_invalid')).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests, expect fail**

Run: `cd functions && pnpm vitest run src/verifyDocument/rules/crossCheck.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```typescript
// functions/src/verifyDocument/rules/crossCheck.ts
import type { ExtractedDicom, ExtractedLiquidacion, ApplicantContext } from '../extractors/types';
import type { Flag } from './types';

function normalize(s: string | null): string {
  return (s ?? '').replace(/\s+/g, ' ').trim().toUpperCase();
}

function normalizeRut(s: string | null): string {
  return (s ?? '').replace(/\./g, '').toUpperCase();
}

function rutValid(rut: string): boolean {
  const m = rut.match(/^(\d+)-([\dK])$/i);
  if (!m) return false;
  const num = m[1];
  const dv = m[2].toUpperCase();
  let sum = 0;
  let mult = 2;
  for (let i = num.length - 1; i >= 0; i--) {
    sum += parseInt(num[i], 10) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const expected = 11 - (sum % 11);
  const expectedDv = expected === 10 ? 'K' : expected === 11 ? '0' : String(expected);
  return expectedDv === dv;
}

export function crossCheckForDicom(
  extracted: ExtractedDicom,
  applicant: ApplicantContext,
): Flag[] {
  const flags: Flag[] = [];
  const nameMatch = normalize(extracted.name) === normalize(applicant.applicantName);
  const rutMatch = normalizeRut(extracted.rut) === normalizeRut(applicant.applicantRut);

  if (extracted.name !== null && extracted.rut !== null && (!nameMatch || !rutMatch)) {
    flags.push({
      code: 'identity_mismatch',
      weight: 20,
      message: `Nombre/RUT del documento (${extracted.name} / ${extracted.rut}) no coincide con el postulante (${applicant.applicantName} / ${applicant.applicantRut})`,
    });
  } else if (extracted.name === null || extracted.rut === null) {
    flags.push({
      code: 'field_missing:identity',
      weight: 0,
      message: 'No se pudo extraer nombre o RUT para cross-check',
    });
  }
  return flags;
}

export function crossCheckForLiquidacion(
  extracted: ExtractedLiquidacion,
  applicant: ApplicantContext,
): { crossCheckFlags: Flag[]; employerFormatFlags: Flag[] } {
  const crossCheckFlags: Flag[] = [];
  const employerFormatFlags: Flag[] = [];

  const rutMatch = normalizeRut(extracted.rut) === normalizeRut(applicant.applicantRut);

  if (extracted.rut !== null && !rutMatch) {
    crossCheckFlags.push({
      code: 'identity_mismatch',
      weight: 20,
      message: `RUT del trabajador (${extracted.rut}) no coincide con el postulante (${applicant.applicantRut})`,
    });
  } else if (extracted.rut === null) {
    crossCheckFlags.push({
      code: 'field_missing:rut',
      weight: 0,
      message: 'No se pudo extraer RUT del trabajador',
    });
  }

  if (extracted.employerRut !== null && !rutValid(extracted.employerRut)) {
    employerFormatFlags.push({
      code: 'employer_rut_invalid',
      weight: 10,
      message: `RUT del empleador (${extracted.employerRut}) no pasa validación mod-11`,
    });
  }

  return { crossCheckFlags, employerFormatFlags };
}
```

- [ ] **Step 4: Run tests, expect pass**

Run: `cd functions && pnpm vitest run src/verifyDocument/rules/crossCheck.spec.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add functions/src/verifyDocument/rules/crossCheck.ts functions/src/verifyDocument/rules/crossCheck.spec.ts
git commit -m "feat(verifyDocument): add cross-check for name/RUT/employer coherence"
```

---

## Task 9: LLM prompt builder (TDD)

**Files:**
- Create: `functions/src/verifyDocument/rules/llmPrompt.ts`
- Test: `functions/src/verifyDocument/rules/llmPrompt.spec.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// functions/src/verifyDocument/rules/llmPrompt.spec.ts
import { describe, it, expect } from 'vitest';
import { buildLlmPrompt } from './llmPrompt';

const applicant = {
  applicantName: 'JUAN PEREZ',
  applicantRut: '12345678-5',
  monthlyRent: 500000,
};

describe('buildLlmPrompt', () => {
  it('returns prompt text and base64 image', () => {
    const r = buildLlmPrompt(
      { rut: '12345678-5', name: 'JUAN PEREZ' },
      applicant,
      'dicom',
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
    );
    expect(r.text).toContain('DICOM');
    expect(r.text).toContain('JUAN PEREZ');
    expect(r.imageBase64).toBeTruthy();
    expect(r.imageBase64).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it('mentions liquidación type in prompt when type=liquidacion', () => {
    const r = buildLlmPrompt(
      { rut: '12345678-5', netIncome: 1_500_000 },
      applicant,
      'liquidacion',
      Buffer.from([1, 2, 3]),
    );
    expect(r.text).toContain('LIQUIDACION');
    expect(r.text).toContain('1500000');
  });
});
```

- [ ] **Step 2: Run tests, expect fail**

Run: `cd functions && pnpm vitest run src/verifyDocument/rules/llmPrompt.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```typescript
// functions/src/verifyDocument/rules/llmPrompt.ts
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

Respond with a single JSON object, no markdown, no code block:
{
  "score": <integer 0-15, where 15 = clearly authentic>,
  "flags": [<string codes like "ai_generated_suspected", "font_mismatch", "logo_missing", "text_image_inconsistent">],
  "confidence": <float 0.1-1.0>
}
Be conservative: if uncertain, lower the score. Only output the JSON.`;

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
```

- [ ] **Step 4: Run tests, expect pass**

Run: `cd functions && pnpm vitest run src/verifyDocument/rules/llmPrompt.spec.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add functions/src/verifyDocument/rules/llmPrompt.ts functions/src/verifyDocument/rules/llmPrompt.spec.ts
git commit -m "feat(verifyDocument): add LLM prompt builder for MiniMax M3 vision"
```

---

## Task 10: LLM evaluator with MiniMax SDK (TDD, mocked)

**Files:**
- Create: `functions/src/verifyDocument/rules/llmEval.ts`
- Test: `functions/src/verifyDocument/rules/llmEval.spec.ts`

- [ ] **Step 1: Decide SDK**

Check the MiniMax M3 SDK package name in their docs. Likely `@minimax/sdk` or similar. For MVP assume `minimax` (verify before implementing). If unavailable, fall back to direct HTTP fetch to documented endpoint. Update Task 1 install command if package name differs.

- [ ] **Step 2: Write failing tests (mocked SDK)**

```typescript
// functions/src/verifyDocument/rules/llmEval.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('minimax', () => ({
  MiniMaxClient: vi.fn(),
}));

import { MiniMaxClient } from 'minimax';
import { llmEvaluate } from './llmEval';

const mockGenerate = vi.fn();

beforeEach(() => {
  vi.mocked(MiniMaxClient).mockImplementation(() => ({
    vision: { generate: mockGenerate },
  }) as never);
  mockGenerate.mockReset();
});

describe('llmEvaluate', () => {
  it('returns parsed result on success', async () => {
    mockGenerate.mockResolvedValue({
      text: JSON.stringify({ score: 12, flags: ['logo_missing'], confidence: 0.8 }),
    });
    const r = await llmEvaluate(
      Buffer.from([1, 2, 3]),
      { text: 'prompt', imageBase64: 'AAA' },
      'dicom',
    );
    expect(r).not.toBeNull();
    expect(r!.score).toBe(12);
    expect(r!.flags).toEqual(['logo_missing']);
    expect(r!.confidence).toBeCloseTo(0.8);
  });

  it('returns null on timeout', async () => {
    mockGenerate.mockImplementation(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 50)),
    );
    const r = await llmEvaluate(
      Buffer.from([1, 2, 3]),
      { text: 'prompt', imageBase64: 'AAA' },
      'dicom',
      { timeoutMs: 20 },
    );
    expect(r).toBeNull();
  });

  it('returns null on invalid JSON (after one retry)', async () => {
    mockGenerate.mockResolvedValue({ text: 'not json' });
    const r = await llmEvaluate(
      Buffer.from([1, 2, 3]),
      { text: 'prompt', imageBase64: 'AAA' },
      'dicom',
    );
    expect(r).toBeNull();
    expect(mockGenerate).toHaveBeenCalledTimes(2);
  });

  it('returns null on API 5xx', async () => {
    mockGenerate.mockRejectedValue(new Error('503'));
    const r = await llmEvaluate(
      Buffer.from([1, 2, 3]),
      { text: 'prompt', imageBase64: 'AAA' },
      'dicom',
    );
    expect(r).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests, expect fail**

Run: `cd functions && pnpm vitest run src/verifyDocument/rules/llmEval.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement**

```typescript
// functions/src/verifyDocument/rules/llmEval.ts
import { logger } from 'firebase-functions';
import { MiniMaxClient } from 'minimax';

import type { LlmEvaluation } from './types';
import type { LlmPromptParts } from './llmPrompt';
import type { DocType } from '../extractors/types';

const DEFAULT_TIMEOUT_MS = 10_000;

export interface LlmEvalOptions {
  timeoutMs?: number;
}

export async function llmEvaluate(
  _imageBuf: Buffer,
  prompt: LlmPromptParts,
  _type: DocType,
  opts: LlmEvalOptions = {},
): Promise<LlmEvaluation | null> {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    logger.warn('MINIMAX_API_KEY not set; LLM eval disabled');
    return null;
  }

  const client = new MiniMaxClient({ apiKey });
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const call = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await client.vision.generate({
        model: 'MiniMax-M3',
        prompt: prompt.text,
        imageBase64: prompt.imageBase64,
        responseFormat: 'json',
        signal: controller.signal,
      });
      return res;
    } finally {
      clearTimeout(timer);
    }
  };

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await call();
      const parsed = parseLlmResponse(res.text);
      if (parsed) return parsed;
      logger.warn(`LLM eval attempt ${attempt}: invalid JSON, retrying`);
    } catch (err) {
      logger.warn(`LLM eval attempt ${attempt} failed:`, err);
    }
  }
  return null;
}

function parseLlmResponse(text: string | undefined): LlmEvaluation | null {
  if (!text) return null;
  const cleaned = text.replace(/^```json|^```|```$/gm, '').trim();
  try {
    const obj = JSON.parse(cleaned);
    const score = Number(obj.score);
    const confidence = Number(obj.confidence);
    const flags = Array.isArray(obj.flags) ? obj.flags.map(String) : [];
    if (Number.isNaN(score) || Number.isNaN(confidence)) return null;
    return { score: Math.max(0, Math.min(15, score)), flags, confidence };
  } catch {
    return null;
  }
}
```

(Note: SDK call shape may differ — adjust to actual `minimax` package API. The retry-once + 10s timeout + null-on-fail behavior is what tests cover.)

- [ ] **Step 5: Run tests, expect pass**

Run: `cd functions && pnpm vitest run src/verifyDocument/rules/llmEval.spec.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add functions/src/verifyDocument/rules/llmEval.ts functions/src/verifyDocument/rules/llmEval.spec.ts
git commit -m "feat(verifyDocument): add LLM evaluator with retry + timeout"
```

---

## Task 11: Score aggregator (TDD)

**Files:**
- Create: `functions/src/verifyDocument/rules/score.ts`
- Test: `functions/src/verifyDocument/rules/score.spec.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// functions/src/verifyDocument/rules/score.spec.ts
import { describe, it, expect } from 'vitest';
import { score } from './score';

const baseApplicant = {
  applicantName: 'JUAN PEREZ',
  applicantRut: '12345678-5',
  monthlyRent: 500000,
};

const goodEla = { global: 0.02, maxCell: 0.04 };
const badEla = { global: 0.05, maxCell: 0.20 };

describe('score', () => {
  it('returns pass (≥90) when all checks succeed and LLM works', () => {
    const r = score({
      extracted: { rut: '12345678-5', type: 'dicom' },
      ela: goodEla,
      crossCheckFlags: [],
      employerFormatFlags: [],
      llm: { score: 14, flags: [], confidence: 0.9 },
      monthlyRent: 500000,
      applicant: baseApplicant,
    });
    expect(r.verdict).toBe('pass');
    expect(r.score).toBeGreaterThanOrEqual(90);
    expect(r.llmUnavailable).toBe(false);
  });

  it('re-normalizes to 100 when LLM unavailable, still produces verdict', () => {
    const r = score({
      extracted: { rut: '12345678-5', type: 'dicom' },
      ela: goodEla,
      crossCheckFlags: [],
      employerFormatFlags: [],
      llm: null,
      monthlyRent: 500000,
      applicant: baseApplicant,
    });
    expect(r.llmUnavailable).toBe(true);
    expect(['pass', 'warn']).toContain(r.verdict);
    expect(r.score).toBeGreaterThanOrEqual(90);
  });

  it('returns warn (70-89) when cross-check fails', () => {
    const r = score({
      extracted: { rut: '99999999-9', type: 'dicom' },
      ela: goodEla,
      crossCheckFlags: [{ code: 'identity_mismatch', weight: 20, message: 'x' }],
      employerFormatFlags: [],
      llm: { score: 14, flags: [], confidence: 0.9 },
      monthlyRent: 500000,
      applicant: baseApplicant,
    });
    expect(r.verdict).toBe('warn');
  });

  it('returns fail (<70) when ELA regional fires AND cross-check fires', () => {
    const r = score({
      extracted: { rut: '99999999-9', type: 'dicom' },
      ela: badEla,
      crossCheckFlags: [{ code: 'identity_mismatch', weight: 20, message: 'x' }],
      employerFormatFlags: [],
      llm: { score: 5, flags: ['ai_generated_suspected'], confidence: 0.7 },
      monthlyRent: 500000,
      applicant: baseApplicant,
    });
    expect(r.verdict).toBe('fail');
    expect(r.score).toBeLessThan(70);
  });

  it('emits income_below_threshold flag when liquid net income < rent/0.3', () => {
    const r = score({
      extracted: { netIncome: 100000, type: 'liquidacion' },
      ela: goodEla,
      crossCheckFlags: [],
      employerFormatFlags: [],
      llm: { score: 14, flags: [], confidence: 0.9 },
      monthlyRent: 500000,
      applicant: baseApplicant,
    });
    expect(r.flags.some(f => f.code === 'income_below_threshold')).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests, expect fail**

Run: `cd functions && pnpm vitest run src/verifyDocument/rules/score.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```typescript
// functions/src/verifyDocument/rules/score.ts
import type { ScoreInput, VerificationResult, Flag, Verdict } from './types';

const W_RUT = 15;
const W_ELA = 25;
const W_FIELDS = 15;
const W_CROSS = 20;
const W_EMPLOYER = 10;
const W_LLM = 15;
const TOTAL = W_RUT + W_ELA + W_FIELDS + W_CROSS + W_EMPLOYER + W_LLM; // 100

const PASS_THRESHOLD = 90;
const WARN_THRESHOLD = 70;

function verdictFromScore(s: number): Verdict {
  if (s >= PASS_THRESHOLD) return 'pass';
  if (s >= WARN_THRESHOLD) return 'warn';
  return 'fail';
}

export function score(input: ScoreInput): VerificationResult {
  const flags: Flag[] = [];

  // 1) RUT valid
  const rutStr = String(input.extracted.rut ?? '');
  const rutValid = /^\d+-[\dK]$/i.test(rutStr);
  const rutPts = rutValid ? W_RUT : 0;
  if (!rutValid && rutStr) {
    flags.push({ code: 'rut_invalid', weight: W_RUT, message: `RUT inválido: ${rutStr}` });
  }

  // 2) ELA regional
  const elaOk = input.ela.global < 0.08 && input.ela.maxCell < 0.15;
  const elaPts = elaOk ? W_ELA : 0;
  if (!elaOk) {
    flags.push({
      code: `ela_high:${input.ela.global.toFixed(3)}/${input.ela.maxCell.toFixed(3)}`,
      weight: W_ELA,
      message: `ELA alta (global=${input.ela.global.toFixed(3)}, maxCell=${input.ela.maxCell.toFixed(3)})`,
    });
  }

  // 3) Fields present
  const typeStr = String(input.extracted.type ?? '');
  const requiredFields =
    typeStr === 'liquidacion' ? ['rut', 'grossIncome', 'netIncome'] : ['rut', 'name'];
  const missingKeys = requiredFields.filter(f => {
    const v = (input.extracted as Record<string, unknown>)[f];
    return v === null || v === undefined || v === '';
  });
  const missingCount = missingKeys.length;
  const fieldRatio = 1 - missingCount / requiredFields.length;
  const fieldsPts = Math.round(fieldRatio * W_FIELDS);
  if (missingCount > 0) {
    flags.push({
      code: `field_missing:${missingKeys.join(',')}`,
      weight: W_FIELDS - fieldsPts,
      message: `Faltan ${missingCount} campos: ${missingKeys.join(', ')}`,
    });
  }

  // 4) Cross-check
  const crossPts = input.crossCheckFlags.length === 0 ? W_CROSS : 0;
  flags.push(...input.crossCheckFlags);

  // 5) Employer format
  const employerPts = input.employerFormatFlags.length === 0 ? W_EMPLOYER : 0;
  flags.push(...input.employerFormatFlags);

  // 6) LLM
  const llmUnavailable = input.llm === null;
  if (llmUnavailable) {
    flags.push({ code: 'llm_unavailable', weight: 0, message: 'LLM eval no disponible; resto del score se re-normaliza' });
  }
  const llmPts = input.llm ? Math.round(input.llm.score) : 0;

  // Aggregate
  let totalPts = rutPts + elaPts + fieldsPts + crossPts + employerPts + llmPts;

  // Re-normalize if LLM unavailable
  if (llmUnavailable) {
    const deterministic = rutPts + elaPts + fieldsPts + crossPts + employerPts;
    const denom = TOTAL - W_LLM;
    totalPts = Math.round((deterministic / denom) * TOTAL);
  }

  // Income check
  const netIncome = Number((input.extracted as Record<string, unknown>).netIncome ?? 0);
  if (typeStr === 'liquidacion' && netIncome > 0 && netIncome * 0.3 < input.monthlyRent) {
    flags.push({
      code: 'income_below_threshold',
      weight: 0,
      message: `Sueldo líquido ${netIncome} no cubre regla 30% para renta ${input.monthlyRent}`,
    });
  }

  return {
    score: totalPts,
    verdict: verdictFromScore(totalPts),
    flags,
    extractedFields: input.extracted,
    llmUnavailable,
  };
}
```

- [ ] **Step 4: Run tests, expect pass**

Run: `cd functions && pnpm vitest run src/verifyDocument/rules/score.spec.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add functions/src/verifyDocument/rules/score.ts functions/src/verifyDocument/rules/score.spec.ts
git commit -m "feat(verifyDocument): add weighted score with LLM re-normalization"
```

---

## Task 12: Rules index re-exports

**Files:**
- Create: `functions/src/verifyDocument/rules/index.ts`

- [ ] **Step 1: Implement**

```typescript
// functions/src/verifyDocument/rules/index.ts
export * from './types';
export * from './crossCheck';
export * from './llmPrompt';
export * from './llmEval';
export * from './score';
```

- [ ] **Step 2: Commit**

```bash
git add functions/src/verifyDocument/rules/index.ts
git commit -m "feat(verifyDocument): add rules barrel re-exports"
```

---

## Task 13: Express handler (TDD)

**Files:**
- Create: `functions/src/verifyDocument/handler.ts`
- Test: `functions/src/verifyDocument/handler.spec.ts`

- [ ] **Step 1: Write failing test**

```typescript
// functions/src/verifyDocument/handler.spec.ts
import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import multer from 'multer';
import request from 'supertest';

vi.mock('pdf-parse', () => ({
  default: vi.fn(),
}));
vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  getDocument: vi.fn(),
  NodeCanvasFactory: vi.fn().mockImplementation(() => ({
    create: (_w: number, _h: number) => ({
      context: {},
      canvas: { toBuffer: () => Buffer.from([0xff, 0xd8, 0xff, 0xe0]) },
    }),
  })),
}));

import pdfParse from 'pdf-parse';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { verifyDocumentHandler } from './handler';

const mockPdfParse = vi.mocked(pdfParse);
const mockGetDocument = vi.mocked(getDocument);

function buildApp() {
  const app = express();
  app.post('/verifyDocument', multer({ storage: multer.memoryStorage() }).single('file'), verifyDocumentHandler);
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
    mockPdfParse.mockRejectedValueOnce(new Error('corrupt'));
    const app = buildApp();
    const res = await request(app)
      .post('/verifyDocument')
      .attach('file', Buffer.from('not real pdf'), { filename: 'test.pdf', contentType: 'application/pdf' })
      .field('type', 'dicom');
    expect(res.status).toBe(422);
    expect(res.body.verdict).toBe('fail');
    expect(res.body.flags.some((f: any) => f.code === 'pdf_unreadable')).toBe(true);
  });

  it('returns verdict on happy path', async () => {
    mockPdfParse.mockResolvedValueOnce({ text: 'RUT: 12.345.678-5\nNombre: JUAN PEREZ' });
    const fakePage = {
      getViewport: () => ({ width: 100, height: 100 }),
      render: () => ({ promise: Promise.resolve({} as any) }),
      cleanup: () => {},
    };
    mockGetDocument.mockReturnValueOnce({
      promise: Promise.resolve({ numPages: 1, getPage: () => Promise.resolve(fakePage) }),
    } as any);

    const app = buildApp();
    const res = await request(app)
      .post('/verifyDocument')
      .attach('file', Buffer.from('%PDF-1.4'), { filename: 'test.pdf', contentType: 'application/pdf' })
      .field('type', 'dicom')
      .field('applicantName', 'JUAN PEREZ')
      .field('applicantRut', '12345678-5')
      .field('monthlyRent', '500000');
    expect(res.status).toBe(200);
    expect(['pass', 'warn', 'fail']).toContain(res.body.verdict);
  });
});
```

- [ ] **Step 2: Run tests, expect fail**

Run: `cd functions && pnpm vitest run src/verifyDocument/handler.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement handler**

```typescript
// functions/src/verifyDocument/handler.ts
import { logger } from 'firebase-functions';
import type { Request, Response } from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import sharp from 'sharp';

import type { DocType } from './extractors/types';
import { extract } from './extractors';
import { elaRegional } from './ela';
import { crossCheckForDicom, crossCheckForLiquidacion } from './rules/crossCheck';
import { buildLlmPrompt } from './rules/llmPrompt';
import { llmEvaluate } from './rules/llmEval';
import { score } from './rules/score';
import type { VerificationResult } from './rules/types';

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') return cb(new Error('Only PDF allowed'));
    cb(null, true);
  },
});

export const verifyDocumentHandler = async (req: Request, res: Response) => {
  const start = Date.now();
  try {
    const file = (req as Request & { file?: Express.Multer.File }).file;
    const { type, applicantName, applicantRut, monthlyRent } = req.body;

    if (!type || !['dicom', 'liquidacion'].includes(type)) {
      return res.status(400).json({ error: 'Missing or invalid type' });
    }
    if (!file) {
      return res.status(400).json({ error: 'Missing file' });
    }
    if (!applicantName || !applicantRut || !monthlyRent) {
      return res.status(400).json({ error: 'Missing applicant context' });
    }

    const docType = type as DocType;
    const applicant = {
      applicantName,
      applicantRut,
      monthlyRent: Number(monthlyRent),
    };

    let text: string;
    try {
      const parsed = await pdfParse(file.buffer);
      text = parsed.text;
    } catch (err) {
      logger.warn('pdf-parse failed', err);
      const fail: VerificationResult = {
        score: 0,
        verdict: 'fail',
        flags: [{ code: 'pdf_unreadable', weight: 0, message: 'No se pudo leer el PDF' }],
        extractedFields: {},
        llmUnavailable: true,
      };
      return res.status(422).json(fail);
    }

    let pngBuf: Buffer;
    try {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(file.buffer) });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1 });
      const NodeCanvasFactory = (pdfjs as any).NodeCanvasFactory;
      const factory = new NodeCanvasFactory();
      const ctxCanvas = factory.create(viewport.width, viewport.height);
      await page.render({ canvasContext: ctxCanvas.context, viewport, canvasFactory: factory }).promise;
      const rawPng = ctxCanvas.canvas.toBuffer('image/png');
      pngBuf = await sharp(rawPng).png().toBuffer();
      await pdf.cleanup();
      await pdf.destroy();
    } catch (err) {
      logger.warn('pdfjs render failed', err);
      return res.status(422).json({
        score: 0,
        verdict: 'fail',
        flags: [{ code: 'pdf_unrenderable', weight: 0, message: 'No se pudo renderizar el PDF' }],
        extractedFields: {},
        llmUnavailable: true,
      });
    }

    const ela = await elaRegional(pngBuf);

    const extractedRaw = extract(text, docType);
    const extracted = { type: docType, ...extractedRaw };

    const crossResult =
      docType === 'dicom'
        ? { crossCheckFlags: crossCheckForDicom(extractedRaw as any, applicant), employerFormatFlags: [] as never[] }
        : crossCheckForLiquidacion(extractedRaw as any, applicant);

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
      flags: result.flags.map(f => f.code),
      durationMs: Date.now() - start,
    });

    return res.status(200).json(result);
  } catch (err) {
    logger.error('verifyDocumentHandler error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};
```

- [ ] **Step 4: Add supertest dev dep**

```bash
cd functions && pnpm add -D supertest @types/supertest
```

- [ ] **Step 5: Run tests, expect pass**

Run: `cd functions && pnpm vitest run src/verifyDocument/handler.spec.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add functions/src/verifyDocument/handler.ts functions/src/verifyDocument/handler.spec.ts functions/package.json functions/pnpm-lock.yaml
git commit -m "feat(verifyDocument): add Express handler with full verification pipeline"
```

---

## Task 14: Mount route in main Functions index

**Files:**
- Modify: `functions/src/index.ts:1-19`

- [ ] **Step 1: Add import + route**

Replace `functions/src/index.ts` content with:

```typescript
import * as dotenv from 'dotenv';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import cors from 'cors';
import express from 'express';

import { newDiaryEntry } from './newDiaryEntry';
import { verifyDocumentHandler, upload } from './verifyDocument/handler';

dotenv.config();
admin.initializeApp();
export const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.post('/newDiaryEntry', newDiaryEntry);
app.post('/verifyDocument', upload.single('file'), verifyDocumentHandler);

export const api = functions.https.onRequest(app);
```

- [ ] **Step 2: Verify build**

Run: `cd functions && pnpm build`
Expected: compiles without errors.

- [ ] **Step 3: Commit**

```bash
git add functions/src/index.ts
git commit -m "feat(functions): mount /verifyDocument route in API"
```

---

## Task 15: Set MINIMAX_API_KEY via Firebase secrets

**Files:**
- Modify: `functions/src/verifyDocument/handler.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Set secret in Firebase**

Run:
```bash
firebase functions:secrets:set MINIMAX_API_KEY
```
Paste the API key when prompted. Confirm secret is set:
```bash
firebase functions:secrets:access MINIMAX_API_KEY
```

- [ ] **Step 2: Update handler to read from secret**

At the top of `functions/src/verifyDocument/handler.ts`, add:
```typescript
import { defineSecret } from 'firebase-functions/params';
const minimaxApiKey = defineSecret('MINIMAX_API_KEY');
```

In `llmEvaluate` (or in the handler before calling it), read the secret value:
```typescript
process.env.MINIMAX_API_KEY = minimaxApiKey.value();
```
(Insert this just before the `llmEvaluate(...)` call in `verifyDocumentHandler`.)

- [ ] **Step 3: Wire secret into exported function in `index.ts`**

Replace the last line:
```typescript
export const api = functions.runWith({ secrets: [minimaxApiKey] }).https.onRequest(app);
```

Add the import at the top:
```typescript
import { defineSecret } from 'firebase-functions/params';
const minimaxApiKey = defineSecret('MINIMAX_API_KEY');
```

- [ ] **Step 4: Rebuild + verify**

Run: `cd functions && pnpm build`
Expected: compiles, secret binding present in output.

- [ ] **Step 5: Commit**

```bash
git add functions/src/verifyDocument/handler.ts functions/src/index.ts
git commit -m "feat(functions): wire MINIMAX_API_KEY via Firebase secret"
```

---

## Task 16: Firestore + Storage rules

**Files:**
- Modify: `firestore.rules`
- Modify: `storage.rules`

- [ ] **Step 1: Read existing rules to match style**

```bash
cat firestore.rules
cat storage.rules
```

- [ ] **Step 2: Add Firestore rules**

Append (matching existing style) a match block:
```
match /postulaciones/{postulacionId} {
  allow read, write: if request.auth != null && request.auth.token.admin == true;
  match /documentos/{docId} {
    allow read, write: if request.auth != null && request.auth.token.admin == true;
  }
}
```

(If project uses `role == 'admin'` instead of `admin == true` custom claim, adapt to match.)

- [ ] **Step 3: Add Storage rules**

Append:
```
match /postulaciones/{postulacionId}/{fileName} {
  allow read: if request.auth != null && request.auth.token.admin == true;
  allow write: if request.auth != null
    && request.auth.token.admin == true
    && request.resource.size < 10 * 1024 * 1024
    && request.resource.contentType == 'application/pdf';
}
```

- [ ] **Step 4: Verify via emulator**

Run: `pnpm emulators`
Expected: Auth + Firestore + Storage emulators start. In another terminal:
```bash
firebase emulators:exec --only firestore,storage "echo rules ok"
```

- [ ] **Step 5: Commit**

```bash
git add firestore.rules storage.rules
git commit -m "feat(rules): add postulaciones admin-only access rules"
```

---

## Task 17: Client model types

**Files:**
- Create: `src/models/application.ts`

- [ ] **Step 1: Create**

```typescript
// src/models/application.ts
import type { Timestamp } from 'firebase/firestore';

export type DocType = 'dicom' | 'liquidacion';
export type Verdict = 'pass' | 'warn' | 'fail';
export type ApplicationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'needs_more_docs';

export interface VerificationResult {
  score: number;
  verdict: Verdict;
  flags: { code: string; weight: number; message: string }[];
  extractedFields: Record<string, unknown>;
  llmUnavailable: boolean;
}

export interface Documento {
  id: string;
  type: DocType;
  fileUrl: string;
  score: number;
  verdict: Verdict;
  flags: { code: string; weight: number; message: string }[];
  extractedFields: Record<string, unknown>;
  uploadedAt: Timestamp;
  uploadedBy: string;
}

export interface Postulacion {
  id: string;
  propertyId: string;
  applicantName: string;
  applicantRut: string;
  monthlyRent: number;
  status: ApplicationStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  documentos?: Documento[];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/models/application.ts
git commit -m "feat(models): add application types for postulaciones"
```

---

## Task 18: Client service layer

**Files:**
- Create: `src/services/application.ts`

- [ ] **Step 1: Implement**

```typescript
// src/services/application.ts
import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';

import { db } from '@/firebase';
import type { Postulacion, DocType, VerificationResult } from '@/models/application';

export async function createApplication(input: {
  propertyId: string;
  applicantName: string;
  applicantRut: string;
  monthlyRent: number;
}): Promise<string> {
  const ref = await addDoc(collection(db, 'postulaciones'), {
    ...input,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listApplications(): Promise<Postulacion[]> {
  const snap = await getDocs(query(collection(db, 'postulaciones'), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Postulacion));
}

export async function addDocumentWithVerdict(
  postulacionId: string,
  payload: {
    type: DocType;
    fileUrl: string;
    verification: VerificationResult;
    uploadedBy: string;
  },
): Promise<string> {
  const docRef = await addDoc(
    collection(db, 'postulaciones', postulacionId, 'documentos'),
    {
      type: payload.type,
      fileUrl: payload.fileUrl,
      score: payload.verification.score,
      verdict: payload.verification.verdict,
      flags: payload.verification.flags,
      extractedFields: payload.verification.extractedFields,
      uploadedAt: serverTimestamp(),
      uploadedBy: payload.uploadedBy,
    },
  );
  return docRef.id;
}

export async function setApplicationStatus(
  postulacionId: string,
  status: Postulacion['status'],
  reviewerUid: string,
): Promise<void> {
  await updateDoc(doc(db, 'postulaciones', postulacionId), {
    status,
    reviewedBy: reviewerUid,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/application.ts
git commit -m "feat(services): add application CRUD mirroring property.ts pattern"
```

---

## Task 19: PostulacionesList component

**Files:**
- Create: `src/sections/Postulaciones/PostulacionesList.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/sections/Postulaciones/PostulacionesList.tsx
import { useQuery } from '@tanstack/react-query';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { useState } from 'react';

import { listApplications } from '@/services/application';
import type { Postulacion } from '@/models/application';
import { PostulacionForm } from './PostulacionForm';
import { PostulacionDetail } from './PostulacionDetail';

interface Props {
  uploadedBy: string;
}

export const PostulacionesList = ({ uploadedBy }: Props) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Postulacion | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['postulaciones'],
    queryFn: listApplications,
  });

  if (selected) {
    return (
      <PostulacionDetail
        postulacion={selected}
        uploadedBy={uploadedBy}
        onBack={() => setSelected(null)}
      />
    );
  }

  if (isLoading) return <CircularProgress />;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Postulaciones</Typography>
        <Button variant="contained" onClick={() => setOpen(true)}>
          Nueva postulación
        </Button>
      </Stack>
      {data?.length === 0 && (
        <Typography color="text.secondary">No hay postulaciones todavía.</Typography>
      )}
      {data?.map((p) => (
        <Box
          key={p.id}
          sx={{ p: 2, mb: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, cursor: 'pointer' }}
          onClick={() => setSelected(p)}
        >
          <Typography>
            {p.applicantName} ({p.applicantRut}) — propiedad {p.propertyId} —{' '}
            <strong>{p.status}</strong>
          </Typography>
        </Box>
      ))}
      <PostulacionForm open={open} onClose={() => setOpen(false)} />
    </Box>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/sections/Postulaciones/PostulacionesList.tsx
git commit -m "feat(Postulaciones): add list view with new-application button"
```

---

## Task 20: PostulacionForm modal

**Files:**
- Create: `src/sections/Postulaciones/PostulacionForm.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/sections/Postulaciones/PostulacionForm.tsx
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Stack,
} from '@mui/material';
import { useState } from 'react';

import { createApplication } from '@/services/application';
import { listProperties } from '@/services/property';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const PostulacionForm = ({ open, onClose }: Props) => {
  const qc = useQueryClient();
  const { data: properties } = useQuery({ queryKey: ['properties'], queryFn: listProperties });
  const [propertyId, setPropertyId] = useState('');
  const [applicantName, setApplicantName] = useState('');
  const [applicantRut, setApplicantRut] = useState('');

  const monthlyRent = properties?.find((p) => p.id === propertyId)?.price ?? 0;

  const create = useMutation({
    mutationFn: createApplication,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['postulaciones'] });
      onClose();
      setPropertyId('');
      setApplicantName('');
      setApplicantRut('');
    },
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Nueva postulación</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            select
            label="Propiedad"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            fullWidth
          >
            {properties?.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.title}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Renta objetivo (CLP)"
            value={monthlyRent}
            disabled
            fullWidth
            helperText="Auto-calculado desde el precio de la propiedad"
          />
          <TextField
            label="Nombre del postulante"
            value={applicantName}
            onChange={(e) => setApplicantName(e.target.value)}
            fullWidth
            name="applicantName"
          />
          <TextField
            label="RUT del postulante"
            value={applicantRut}
            onChange={(e) => setApplicantRut(e.target.value)}
            fullWidth
            placeholder="12.345.678-5"
            name="applicantRut"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          disabled={!propertyId || !applicantName || !applicantRut}
          onClick={() =>
            create.mutate({
              propertyId,
              applicantName,
              applicantRut,
              monthlyRent,
            })
          }
        >
          Crear
        </Button>
      </DialogActions>
    </Dialog>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/sections/Postulaciones/PostulacionForm.tsx
git commit -m "feat(Postulaciones): add new-application modal with auto-rent"
```

---

## Task 21: VerdictPanel component

**Files:**
- Create: `src/sections/Postulaciones/VerdictPanel.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/sections/Postulaciones/VerdictPanel.tsx
import { Alert, Box, Chip, List, ListItem, ListItemText, Typography } from '@mui/material';

import type { VerificationResult } from '@/models/application';

interface Props {
  result: VerificationResult;
}

const verdictToSeverity = (v: VerificationResult['verdict']) =>
  v === 'pass' ? 'success' : v === 'warn' ? 'warning' : 'error';

export const VerdictPanel = ({ result }: Props) => (
  <Box>
    <Alert severity={verdictToSeverity(result.verdict)} sx={{ mb: 2 }}>
      <strong>{result.verdict.toUpperCase()}</strong> — Score: {result.score}/100
      {result.llmUnavailable && ' (sin evaluación IA)'}
    </Alert>
    {result.flags.length > 0 && (
      <>
        <Typography variant="subtitle2">Observaciones:</Typography>
        <List dense>
          {result.flags.map((f) => (
            <ListItem key={f.code}>
              <ListItemText
                primary={<><Chip label={f.code} size="small" sx={{ mr: 1 }} />{f.message}</>}
              />
            </ListItem>
          ))}
        </List>
      </>
    )}
    {Object.keys(result.extractedFields).length > 0 && (
      <>
        <Typography variant="subtitle2" sx={{ mt: 2 }}>Campos extraídos:</Typography>
        <Box component="pre" sx={{ bgcolor: 'grey.100', p: 1, fontSize: 12, overflow: 'auto' }}>
          {JSON.stringify(result.extractedFields, null, 2)}
        </Box>
      </>
    )}
  </Box>
);
```

- [ ] **Step 2: Commit**

```bash
git add src/sections/Postulaciones/VerdictPanel.tsx
git commit -m "feat(Postulaciones): add verdict panel with flags and extracted fields"
```

---

## Task 22: DocumentUploader component

**Files:**
- Create: `src/sections/Postulaciones/DocumentUploader.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/sections/Postulaciones/DocumentUploader.tsx
import { useState } from 'react';
import { Button, CircularProgress, Stack, Typography, Snackbar } from '@mui/material';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { storage } from '@/firebase';
import { addDocumentWithVerdict } from '@/services/application';
import type { DocType, VerificationResult } from '@/models/application';
import { VerdictPanel } from './VerdictPanel';

interface Props {
  postulacionId: string;
  applicantName: string;
  applicantRut: string;
  monthlyRent: number;
  uploadedBy: string;
  type: DocType;
}

export const DocumentUploader = ({
  postulacionId, applicantName, applicantRut, monthlyRent, uploadedBy, type,
}: Props) => {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf' || file.size > 5 * 1024 * 1024) {
      setError('Solo PDF, máx 5MB');
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', type);
      fd.append('applicantName', applicantName);
      fd.append('applicantRut', applicantRut);
      fd.append('monthlyRent', String(monthlyRent));

      const res = await fetch('/api/verifyDocument', { method: 'POST', body: fd });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const verification = (await res.json()) as VerificationResult;
      setResult(verification);

      const filename = `${type}-${Date.now()}.pdf`;
      const fileRef = ref(storage, `postulaciones/${postulacionId}/${filename}`);
      await uploadBytes(fileRef, file);
      const fileUrl = await getDownloadURL(fileRef);
      await addDocumentWithVerdict(postulacionId, { type, fileUrl, verification, uploadedBy });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle1">
        Subir {type === 'dicom' ? 'DICOM' : 'Liquidación de sueldo'}
      </Typography>
      <Button variant="outlined" component="label" disabled={busy}>
        {busy ? <CircularProgress size={20} /> : 'Seleccionar PDF'}
        <input
          type="file"
          accept="application/pdf"
          hidden
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </Button>
      {result && <VerdictPanel result={result} />}
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)} message={error} />
    </Stack>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/sections/Postulaciones/DocumentUploader.tsx
git commit -m "feat(Postulaciones): add document uploader with verify + persist flow"
```

---

## Task 23: PostulacionDetail component

**Files:**
- Create: `src/sections/Postulaciones/PostulacionDetail.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/sections/Postulaciones/PostulacionDetail.tsx
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Button, Chip, Stack, Typography, Divider } from '@mui/material';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

import { db } from '@/firebase';
import type { Postulacion, Documento } from '@/models/application';
import { setApplicationStatus } from '@/services/application';
import { DocumentUploader } from './DocumentUploader';

interface Props {
  postulacion: Postulacion;
  uploadedBy: string;
  onBack: () => void;
}

async function fetchDocumentos(postulacionId: string): Promise<Documento[]> {
  const snap = await getDocs(
    query(collection(db, 'postulaciones', postulacionId, 'documentos'), orderBy('uploadedAt', 'desc')),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Documento));
}

export const PostulacionDetail = ({ postulacion, uploadedBy, onBack }: Props) => {
  const qc = useQueryClient();
  const { data: docs } = useQuery({
    queryKey: ['documentos', postulacion.id],
    queryFn: () => fetchDocumentos(postulacion.id),
  });

  const hasFail = docs?.some((d) => d.verdict === 'fail');
  const hasWarn = docs?.some((d) => d.verdict === 'warn');
  const aggregate: Postulacion['status'] = hasFail
    ? 'rejected'
    : hasWarn
    ? 'needs_more_docs'
    : docs && docs.length > 0
    ? 'approved'
    : 'pending';

  const refreshDocs = () => qc.invalidateQueries({ queryKey: ['documentos', postulacion.id] });

  return (
    <Box>
      <Button onClick={onBack}>← Volver</Button>
      <Typography variant="h5" sx={{ mt: 2 }}>
        {postulacion.applicantName} ({postulacion.applicantRut})
      </Typography>
      <Typography color="text.secondary">
        Renta objetivo: ${postulacion.monthlyRent.toLocaleString('es-CL')} CLP
      </Typography>
      <Chip label={`Estado: ${aggregate}`} sx={{ mt: 1 }} />

      <Divider sx={{ my: 3 }} />
      <Stack spacing={3}>
        <DocumentUploader
          postulacionId={postulacion.id}
          applicantName={postulacion.applicantName}
          applicantRut={postulacion.applicantRut}
          monthlyRent={postulacion.monthlyRent}
          uploadedBy={uploadedBy}
          type="dicom"
        />
        <DocumentUploader
          postulacionId={postulacion.id}
          applicantName={postulacion.applicantName}
          applicantRut={postulacion.applicantRut}
          monthlyRent={postulacion.monthlyRent}
          uploadedBy={uploadedBy}
          type="liquidacion"
        />
      </Stack>

      {docs && docs.length > 0 && (
        <>
          <Divider sx={{ my: 3 }} />
          <Typography variant="h6">Documentos cargados</Typography>
          {docs.map((d) => (
            <Box key={d.id} sx={{ p: 1, mb: 1, border: '1px solid', borderRadius: 1 }}>
              <Typography>{d.type} — {d.verdict} ({d.score})</Typography>
              <Typography variant="caption">{d.fileUrl}</Typography>
            </Box>
          ))}
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button
              variant="contained"
              color="success"
              onClick={async () => {
                await setApplicationStatus(postulacion.id, 'approved', uploadedBy);
                refreshDocs();
              }}
            >
              Aprobar postulación
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={async () => {
                await setApplicationStatus(postulacion.id, 'rejected', uploadedBy);
                refreshDocs();
              }}
            >
              Rechazar
            </Button>
          </Stack>
        </>
      )}
    </Box>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/sections/Postulaciones/PostulacionDetail.tsx
git commit -m "feat(Postulaciones): add detail view with upload slots + aggregate status"
```

---

## Task 24: Postulaciones index + AdminDashboard tab integration

**Files:**
- Create: `src/sections/Postulaciones/index.ts`
- Modify: `src/pages/AdminDashboard/AdminDashboard.tsx`

- [ ] **Step 1: Create index**

```typescript
// src/sections/Postulaciones/index.ts
export { PostulacionesList } from './PostulacionesList';
export { PostulacionForm } from './PostulacionForm';
export { PostulacionDetail } from './PostulacionDetail';
export { DocumentUploader } from './DocumentUploader';
export { VerdictPanel } from './VerdictPanel';
```

- [ ] **Step 2: Read AdminDashboard to match pattern**

```bash
cat src/pages/AdminDashboard/AdminDashboard.tsx
```

- [ ] **Step 3: Wire Postulaciones tab**

In `AdminDashboard.tsx`:
- Add import: `import { PostulacionesList } from '@/sections/Postulaciones';`
- Find the existing `<Tabs>` component. Add a new `<Tab label="Postulaciones" />` between existing tabs.
- Find where tabs render their panel content (likely a switch/conditional on the active tab). Add a case for the new tab value `'Postulaciones'`:
  ```tsx
  {currentTab === 'Postulaciones' && <PostulacionesList uploadedBy={user.uid} />}
  ```
  (Adapt the variable name — `currentTab` may be `tab`, `activeTab`, etc. Match existing convention.)

- [ ] **Step 4: Run dev server, smoke test**

Run: `pnpm dev`
Expected: app boots, AdminDashboard tab "Postulaciones" visible, clicking opens the list view, no console errors.

- [ ] **Step 5: Commit**

```bash
git add src/sections/Postulaciones/index.ts src/pages/AdminDashboard/AdminDashboard.tsx
git commit -m "feat(admin): add Postulaciones tab wired to new section"
```

---

## Task 25: E2E happy path

**Files:**
- Create: `e2e/postulaciones.spec.ts`
- Create: `e2e/fixtures/dicom-valid.pdf`

- [ ] **Step 1: Add minimal PDF fixture (stub)**

```bash
mkdir -p e2e/fixtures
echo '%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 100 100]>>endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000056 00000 n
0000000103 00000 n
trailer<</Size 4/Root 1 0 R>>
startxref
152
%%EOF' > e2e/fixtures/dicom-valid.pdf
```

(Note: real Equifax PDFs go here before production. Stub exercises the "pdf_unreadable" path during dev.)

- [ ] **Step 2: Write E2E test**

```typescript
// e2e/postulaciones.spec.ts
import { test, expect } from '@playwright/test';
import path from 'node:path';

test('admin can create postulación and see verdict panel after upload', async ({ page }) => {
  await page.goto('/admin/login');
  await page.fill('input[name="email"]', 'admin@gumucio.cl');
  await page.fill('input[name="password"]', 'test1234');
  await page.click('button[type="submit"]');

  await page.click('text=Postulaciones');
  await page.click('text=Nueva postulación');
  await page.click('[role="combobox"]');
  await page.locator('[role="option"]').first().click();
  await page.fill('input[name="applicantName"]', 'TEST USER');
  await page.fill('input[name="applicantRut"]', '12345678-5');
  await page.click('text=Crear');

  await page.setInputFiles('input[type="file"]', path.join(__dirname, 'fixtures/dicom-valid.pdf'));
  await expect(page.getByText(/PASS|WARN|FAIL|Verdict|Score/i)).toBeVisible({ timeout: 30_000 });
});

test('rejects non-PDF upload with inline error', async ({ page }) => {
  await page.goto('/admin/login');
  await page.fill('input[name="email"]', 'admin@gumucio.cl');
  await page.fill('input[name="password"]', 'test1234');
  await page.click('button[type="submit"]');

  await page.click('text=Postulaciones');
  await page.click('text=Nueva postulación');
  await page.locator('[role="combobox"]').click();
  await page.locator('[role="option"]').first().click();
  await page.fill('input[name="applicantName"]', 'TEST USER');
  await page.fill('input[name="applicantRut"]', '12345678-5');
  await page.click('text=Crear');

  await page.setInputFiles('input[type="file"]', {
    name: 'test.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  });
  await expect(page.getByText(/Solo PDF, máx 5MB/)).toBeVisible();
});
```

- [ ] **Step 3: Run E2E**

Run: `pnpm test:e2e e2e/postulaciones.spec.ts`
Expected: 2 tests pass (or skip if emulators not running — adjust as needed).

- [ ] **Step 4: Commit**

```bash
git add e2e/postulaciones.spec.ts e2e/fixtures/
git commit -m "test(e2e): add postulaciones happy path and PDF rejection"
```

---

## Validation

Run from project root:

```bash
pnpm ts:check                    # full TypeScript check
pnpm test:unit                   # client Vitest
cd functions && pnpm test:unit   # Functions Vitest
cd functions && pnpm build       # Functions bundle
pnpm lint:check                  # ESLint --max-warnings=0
pnpm test:e2e                    # Playwright
firebase deploy --only functions # smoke deploy
```

## Out of scope (deferred)

- Public tenant-facing intake form
- Cédula de identidad automated verification
- External KYC API (Idwall / Veriff / Onfido)
- Liveness / selfie biometric check
- Async background processing pipeline
- Storage auto-deletion / retention policy
- Ley 19.628 explicit consent UI in the form (gap is logged as risk in spec)
- Document types beyond DICOM + liquidación (AFP, bank statements, contracts)
- SII public registry lookup for employer RUT (format-only check in MVP)
- Aggregate cross-document background-check report
- WhatsApp/phone integration for tenant doc intake
