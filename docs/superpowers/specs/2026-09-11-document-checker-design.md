# Design — Document checker for tenant applications

**Date**: 2026-09-11
**Status**: Approved by user, awaiting spec review
**Owner**: Carlos Gumucio

## Summary

Gumucio Propiedades needs to detect forged tenant documents (DICOM/Equifax certificates and liquidaciones de sueldo) before approving rentals. The agency admin uploads each tenant's PDF in a new tab inside the existing AdminDashboard; a synchronous Cloud Function analyzes the file (PDF text extraction, image ELA, regex field extractors, weighted rules) and returns a verdict plus red flags. The admin sees pass/warn/fail with extracted fields and can attach the document to a new `Postulación` (application) record under the relevant property.

## Scope

**In**:
- Document types: DICOM/Equifax certificate, liquidación de sueldo
- Detection depth: image forgery heuristics + field validation + format checks (no external KYC API, no biometric liveness in MVP)
- Sync flow: upload → wait → verdict
- Storage: original PDFs persist in Firebase Storage; verdicts in Firestore
- New data model: `Postulación` + sub-collection `Documento`
- Admin UI: new "Postulaciones" tab inside existing `AdminDashboard`

**Out (explicit YAGNI)**:
- Public tenant-facing intake form
- Cédula de identidad verification (handled by admin visually)
- External KYC API (Idwall/Veriff/Onfido) — defer until false-positive rate becomes a problem
- Liveness / selfie check — requires tenant upload
- Async / background processing
- Storage auto-deletion / retention policy
- Ley 19.628 explicit consent UI (defer; MVP logs the gap, v2 adds checkbox)
- Multiple document types beyond DICOM + liquidación
- Aggregate cross-document "background check" report
- SII registry lookup for employer RUT validation (format-only check in MVP)

## Patterns to Mirror

| Category | Source | Pattern |
|---|---|---|
| Function endpoint | `functions/src/index.ts:1-19` | Single Express app, `app.post('/endpointName', handler)` mounted on `api = functions.https.onRequest(app)` |
| Service layer | `src/services/property.ts` | TanStack Query mutation/query per operation; Firestore collection typed via `src/models/` |
| Admin tab UI | `src/pages/AdminDashboard/AdminDashboard.tsx` (existing Tabs) | MUI `<Tabs>`/`<Tab>` inside an admin-authenticated page |
| Component shape | `src/components/PropertyForm.tsx` (per README "Component Organization") | `index.ts` + `Component.tsx` + `types.ts` per section |
| Plan doc format | `docs/plans/2026-09-11-owner-field-price-and-location-format.md` | Numbered sections, "Out of scope" at end |
| Unit tests | `src/utils/generateInstagramImage.spec.ts` | Co-located `.spec.ts` using Vitest |
| E2E | `e2e/` | Playwright; login as admin via existing fixture |

## Architecture

```
AdminDashboard → POST /api/verifyDocument (multipart, PDF)
  → Express handler in functions/src/verifyDocument/handler.ts
     1. multer parses multipart, enforces ≤5MB and application/pdf
     2. pdf-parse extracts text
     3. pdfjs-dist renders page 1 → PNG buffer
     4. sharp runs ELA → numeric score
     5. extractors/dicom.ts or extractors/liquidacion.ts parse fields
     6. rules/score.ts produces { score, verdict, flags[] }
     7. returns JSON
  → client: uploads PDF to Firebase Storage at postulaciones/{id}/{type}-{ts}.pdf
  → client: writes Documento sub-collection with verdict attached
```

All analysis is pure functions over bytes or strings. The handler is the only place that touches the multipart stream. Each unit is ≤150 LOC.

### Stack additions (all server-side)

| Lib | Purpose |
|---|---|
| `pdf-parse` | Text extraction from text-based PDFs (digital DICOM/SII PDFs) |
| `pdfjs-dist` | Render scanned PDFs to PNG for ELA |
| `sharp` | ELA: re-encode JPEG quality 90, mean absolute diff per channel |
| `multer` | Multipart parsing on Functions |

No new client-side libs beyond MUI primitives.

## Components

### Server (`functions/src/verifyDocument/`)

| File | Purpose |
|---|---|
| `handler.ts` | Express handler. Parses multipart, runs pipeline, returns JSON. ~80 LOC |
| `ela.ts` | `elaRegional(pngBuf): { global: number, maxCell: number }`. Re-encode JPEG quality 90, split into 4×4 grid, mean abs diff per cell. Returns both global mean and worst cell. ~60 LOC |
| `extractors/types.ts` | `ExtractedDicom`, `ExtractedLiquidacion`, `DocType='dicom'\|'liquidacion'`, `ApplicantContext` ~40 LOC |
| `extractors/dicom.ts` | `extractDicom(text): ExtractedDicom` (RUT mod-11, name, fechaEmision, plazoHistorico, protestos) ~80 LOC |
| `extractors/liquidacion.ts` | `extractLiquidacion(text): ExtractedLiquidacion` (employer RUT, grossIncome, netIncome, period) ~80 LOC |
| `extractors/index.ts` | `extract(text, type)` dispatcher ~20 LOC |
| `rules/types.ts` | `Flag`, `Verdict`, `VerificationResult` ~30 LOC |
| `rules/crossCheck.ts` | `crossCheck(extracted, applicant): Flag[]` — verifies extracted RUT/name vs applicant context. For liquidación: employer RUT format + name-vs-RUT coherence. ~60 LOC |
| `rules/llmEval.ts` | `llmEvaluate(pngBuf, extracted, applicant): Promise<{ score: 0-15, flags: string[] }>`. Calls MiniMax M3 vision API with (rendered PNG + text). 10s timeout. Returns null on API failure (caller re-normalizes). ~80 LOC |
| `rules/llmPrompt.ts` | `buildLlmPrompt(extracted, applicant, type): { text: string, imageBase64: string }` — mirrors `functions/src/prompt.ts` pattern. ~50 LOC |
| `rules/score.ts` | `score(result, monthlyRent): { score, verdict, flags[] }`. Weights (revised after adversarial review): RUT-valid 15, ELA-regional 25, fields-present 15, cross-check 20, employer-format 10, llm-eval 15. Re-normalizes if LLM unavailable. Thresholds 90/70. ~100 LOC |
| `rules/index.ts` | Public re-exports ~10 LOC |

### Client (`src/sections/Postulaciones/`)

| File | Purpose |
|---|---|
| `src/sections/Postulaciones/PostulacionesList.tsx` | Tab content listing `Postulación` records (TanStack Query) |
| `src/sections/Postulaciones/PostulacionForm.tsx` | New-application modal: property picker (auto-fills monthlyRent), applicantName, applicantRut |
| `src/sections/Postulaciones/PostulacionDetail.tsx` | Single application view: shows attached docs + upload slots |
| `src/sections/Postulaciones/DocumentUploader.tsx` | Per-type uploader: POSTs to `/verifyDocument`, renders `<VerdictPanel>` |
| `src/sections/Postulaciones/VerdictPanel.tsx` | MUI `<Alert severity={verdict}>` + flags list + extracted-fields definition list |
| `src/sections/Postulaciones/index.ts` | Re-exports |
| `src/services/application.ts` | `createApplication`, `listApplications`, `addDocumentWithVerdict`, `subscribePostulacionStatus` — mirrors `services/property.ts` |
| `src/models/application.ts` | `Postulacion`, `Documento`, `VerificationResult` types |

### Modified files

| File | Change |
|---|---|
| `functions/src/index.ts` | `app.post('/verifyDocument', verifyDocumentHandler)` |
| `src/pages/AdminDashboard/AdminDashboard.tsx` | Add `<Tab label="Postulaciones">` between existing tabs |
| `firestore.rules` | New `postulaciones` + subcollection rules |
| `storage.rules` | New `postulaciones/{id}/{file=**}` rule (admin only, ≤10MB, pdf) |
| `functions/package.json` | Add `pdf-parse`, `pdfjs-dist`, `sharp`, `multer`, `@types/multer`, MiniMax M3 SDK (TBD: confirm package name) |
| `functions/.env` (or secrets) | Add `MINIMAX_API_KEY` for vision LLM call |

### Rules of the road

- Handler knows nothing about DICOM vs liquidación — just dispatches by `type` field
- Extractors return nulls for missing fields, never throw — handler treats missing critical fields as flags
- Rules don't import from extractors — they take plain data, not regexes
- `services/application.ts` mirrors `services/property.ts` shape exactly
- API stays a monolith (single Express app)

## Data flow

### Postulación creation
1. Admin opens "Postulaciones" tab in `AdminDashboard`
2. Clicks "Nueva" → `PostulacionForm` modal opens
3. Picks property from list → `monthlyRent` auto-fills from `property.price`
4. Enters `applicantName`, `applicantRut`
5. Submit → `services/application.createApplication(...)` → `firestore.collection('postulaciones').add(...)`
6. Redirect to `PostulacionDetail`

### Document upload + verify
1. `PostulacionDetail` shows one upload slot per doc type
2. Admin selects PDF in `<input type="file" accept="application/pdf">`
3. On change: `FormData` with `file` + `type` → `fetch('/api/verifyDocument', { method:'POST', body: fd })`
4. Spinner; show `VerdictPanel` with score, flags, extracted fields
5. If 2xx: `uploadBytes(storage.ref('postulaciones/{id}/{type}-{ts}.pdf'), file)` → `addDocumentWithVerdict(id, { type, fileUrl, ...result })`
6. On error: single retry button (no automatic retry)

### Firestore layout

```
postulaciones/{id}
  ├── propertyId: string
  ├── propertyRef: firestore.DocumentReference
  ├── applicantName: string
  ├── applicantRut: string
  ├── monthlyRent: number (CLP, auto from property.price)
  ├── status: 'pending' | 'approved' | 'rejected' | 'needs_more_docs'
  ├── createdAt, updatedAt, reviewedBy, reviewedAt
  └── documentos/ (subcollection)
        └── {docId}
              ├── type: 'dicom' | 'liquidacion'
              ├── fileUrl: string
              ├── score: number (0-100)
              ├── verdict: 'pass' | 'warn' | 'fail'
              ├── flags: string[]  // e.g. ["rut_invalid", "ela_high:0.14", "income_below_threshold"]
              ├── extractedFields: object
              ├── uploadedAt: Timestamp
              └── uploadedBy: uid
```

### Aggregate status (computed client-side after docs load)

- Any doc `fail` → status `rejected`
- Any doc `warn`, none `fail` → status `needs_more_docs`
- All docs `pass` → status `approved` (admin still confirms by clicking "Marcar aprobada")

## Error handling

| Failure | User sees | System behavior |
|---|---|---|
| File >5MB or not PDF | Inline error on `<input>`: "Solo PDF, máx 5MB" | Rejected client-side before fetch |
| Multipart parse error | Toast: "No se pudo leer el archivo" | 400, log via `functions.logger` |
| `pdf-parse` throws | Toast: "PDF corrupto o protegido" | 422, return `{ verdict:'fail', flags:['pdf_unreadable'] }` |
| `pdfjs-dist` render throws | Same | 422, flag `pdf_unrenderable` |
| ELA timeout (>8s) | Verdict: 'warn', flag `ela_timeout` | Continue without ELA score (regional weights drop, others re-normalize to 100) |
| Field extractor returns nulls | Verdict reflects missing critical fields | `rut_invalid`, `rut_missing`, `field_missing:<name>` |
| Cross-check fails (name/RUT mismatch) | Verdict reflects with flag `identity_mismatch` | Cross-check weight → 0; admin sees mismatch in extractedFields vs applicant |
| LLM eval timeout (>10s) | Verdict proceeds without LLM signal | Flag `llm_unavailable`; LLM weight dropped, others re-normalize to 100 |
| LLM eval returns invalid JSON | Same as timeout | Retry once; second failure → `llm_unavailable` flag |
| LLM eval returns low confidence | Verdict reflects partial LLM weight (proportional to confidence field) | `llm_low_confidence` flag |
| Cold-start >12s | Spinner copy: "Analizando (puede tardar la primera vez)" | Pin min-instances=1 in production deploy |
| Storage upload fails after verify | Toast: "Verificación OK pero no se guardó. Reintentar." | Client re-uses VerificationResult from memory; retries upload |
| Firestore write fails after upload | Toast: "Archivo guardado pero falta registro" | Returns Storage URL + error; admin retries write |
| Rule violation (non-admin) | 403 surfaced as toast | Firestore rules deny; logged in console |

**Logging**:
- `functions.logger.info('verify', { type, sizeBytes, score, verdict, flags, durationMs })` — no PDF bytes, no PII beyond RUT
- Client logs to console in dev only (no Sentry in MVP)

**Retry**: single retry button on `<VerdictPanel>` for upload/write failures; no automatic retry — admin stays in control.

## Testing

### Unit (Vitest, co-located `.spec.ts`)

| Module | Tests |
|---|---|
| `ela.ts` | clean PDF → global<0.05 AND maxCell<0.05; small-region edit (5% area) → global<0.08 BUT maxCell>0.15; empty buffer → 0,0 |
| `extractors/dicom.ts` | sample text → all fields extracted; missing RUT → null + flag candidate; invalid check digit → null |
| `extractors/liquidacion.ts` | sample fixture → gross/net/employer extracted; text with one field → only that field |
| `rules/crossCheck.ts` | matching applicant name/RUT → no flags; mismatched name → `identity_mismatch` flag; missing fields → null-tolerance flag |
| `rules/llmEval.ts` | mocked MiniMax SDK: success returns valid `{score, flags}`; timeout returns null + `llm_unavailable`; malformed JSON retries once then null |
| `rules/llmPrompt.ts` | deterministic prompt strings for snapshot testing; image base64 well-formed |
| `rules/score.ts` | all-pass → 100, verdict='pass'; LLM weight dropped → re-normalizes other weights to 100; cross-check fail → 'warn'; employer-format fail + ELA-fail → 'fail'; thresholds 90/70 enforced |
| `models/application.ts` | type guards; optional `monthlyRent` defaults |
| `services/application.ts` | mocked Firestore: create/list/addDocument happy + write-error paths |

### Fixtures (`functions/src/verifyDocument/__fixtures__/`)

- `dicom-valid.pdf` — real Equifax layout, PII redacted
- `dicom-manipulated.pdf` — text edited
- `liquidacion-valid.pdf`
- `liquidacion-low-income.pdf`

### E2E (`e2e/postulaciones.spec.ts`)

- Login as admin → open Postulaciones tab → create postulación → upload DICOM fixture → see verdict
- Try uploading JPG → see inline error, no network call
- Two uploads on same postulación → both verdicts visible, aggregate status correct

### Manual QA checklist

- [ ] Cold-start shows spinner copy
- [ ] PDF >5MB rejected client-side
- [ ] Verdict persists in Firestore
- [ ] PDF visible in Firebase Storage
- [ ] Logout and back: postulación still there, docs still linked
- [ ] Non-admin uid: 403 on `/api/verifyDocument` and on `firestore.doc('postulaciones/...')`

## Validation

```bash
pnpm ts:check            # type-check whole monorepo
pnpm test:unit           # Vitest, includes new modules
pnpm lint:check          # ESLint, --max-warnings=0
pnpm test:e2e            # Playwright e2e
cd functions && pnpm test:unit   # Vitest for Functions modules
cd functions && pnpm build       # confirm Functions bundle
firebase deploy --only functions # smoke deploy
```

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| False positives block legitimate tenants | Medium | Threshold raised to 90 pass / 70 warn; partial concerns surface as flags; admin always confirms final status (no auto-approve) |
| False negatives let forged docs through | Medium | Cross-check (name/RUT) + ELA regional + LLM eval cover main scenarios (identity theft, small-region edits, AI-generated). Documented remaining gaps: sophisticated AI, SII employer registry check |
| Functions cold-start latency | High on first deploy | Pin min-instances=1; spinner copy sets expectations |
| `sharp` native binary not supported on Functions runtime | Low | Functions 2nd gen supports Node 20 with custom binaries; deploy early to validate |
| `pdfjs-dist` server-side bundle size | Medium | Tree-shake to legacy build only; Functions2 allows 1GB bundled |
| PDF parser misreads real DICOM | Medium | Per-extractor unit tests with redacted fixtures; iterate on regex |
| Ley 19.628 compliance complaint (PII sent to MiniMax API) | Medium-High | Tenant PII (RUT, name, employer, income) sent to third-party LLM API as raw text + image. No anonymization by user request. v2 must add: consent checkbox in postulación form, retention policy, DPA with MiniMax. For MVP, document prominently in admin UI |
| MiniMax API outage or rate-limit | Medium | LLM weight dropped from score (re-normalizes); verdict still produced via deterministic checks; admin sees `llm_unavailable` flag |
| LLM hallucination (false-positive "forged") | Low-Medium | Low-confidence responses surface `llm_low_confidence` flag; admin can override; LLM weight proportional to model confidence |
| Admin uploads wrong tenant's doc | Medium | Postulación modal requires explicit tenant selection before upload |

## Acceptance criteria

- [ ] Admin can create a Postulación from a property, with monthlyRent auto-filled
- [ ] Admin can upload a DICOM PDF and see verdict within 15s
- [ ] Admin can upload a liquidación PDF and see verdict within 15s
- [ ] Verdict panel shows score, verdict (pass/warn/fail), flags[], extracted fields, AND cross-check diff vs applicant
- [ ] Cross-check fires `identity_mismatch` when extracted name/RUT differs from applicant
- [ ] LLM eval runs; failure (timeout/5xx/invalid JSON) is non-fatal — verdict still produced with `llm_unavailable` flag
- [ ] Admin still confirms postulación manually (no auto-approve) regardless of verdict
- [ ] Aggregate postulación status updates when docs change
- [ ] All unit tests pass; coverage ≥80% on new modules
- [ ] E2E test for happy path passes
- [ ] Manual QA checklist completed
- [ ] `pnpm ts:check`, `pnpm lint:check`, `pnpm test:unit`, `pnpm test:e2e` all green
- [ ] Firestore rules deny non-admin reads/writes (verified via emulator)
- [ ] Storage rules deny non-admin writes (verified via emulator)
- [ ] `MINIMAX_API_KEY` set via Firebase secrets (never committed)

## Out of scope (deferred)

- Public tenant-facing intake form
- Cédula de identidad automated verification
- External KYC API integration (Idwall / Veriff / Onfido)
- Liveness / selfie biometric check
- Async background processing
- Storage auto-deletion / retention policy
- Ley 19.628 explicit consent UI
- Document types beyond DICOM + liquidación (e.g., AFP certificate, bank statements, contract drafts)
- Aggregate cross-document background-check report
- WhatsApp/phone integration for tenant document intake