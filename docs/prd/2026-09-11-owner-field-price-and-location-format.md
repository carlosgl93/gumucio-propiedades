# PRD — Owner field, price & location formatters

## Context
Three small UX/correctness gaps in the property flow: no place to record owner name when creating a property; UF price inconsistently groups thousands (`UF 4560` vs `UF 40.000`); comuna/city render as stored (lowercase) on cards and shared previews.

## Atomic stories

### STORY-1 — `formatPrice` shared util
TDD. Write failing tests in `src/utils/formatters.spec.ts` covering CLP, UF, zero, large UF (40.000), 4-digit UF (4.560), 5-digit UF (21.000), negative price. Implement `formatPrice(price, currency)` in `src/utils/formatters.ts`. Tests pass.

### STORY-2 — `formatLocation` shared util
TDD. Tests: both values present ("rancagua, rancagua" → "Rancagua, Rancagua"), only commune, only city, empty, multi-word ("las condes" → "Las Condes"). Implement `formatLocation(commune, city)`. Tests pass.

### STORY-3 — Replace 4 inline `formatPrice`
Drop the inline copies in `PropertyCard.tsx`, `PropertyDetails.tsx`, `AdminDashboard.tsx`, `currencyConverter.ts`. Import from `@/utils/formatters`. Verify on the dev server / a couple of cards.

### STORY-4 — Replace 4 inline location joins
Drop raw joins in `PropertyCard.tsx:118`, `PropertyShareButtons.tsx:75`, `generateInstagramImage.ts:69`, and the analogous spot in `PropertyDetails.tsx`. Import `formatLocation`.

### STORY-5 — Add `ownerName` to Property model
Edit `src/models/property.ts`. Add `ownerName?: string`. Update JSDoc/Firestore structure comment block.

### STORY-6 — PropertyForm Propietario section
Insert a new `<Card>` "Propietario" between Identification and Pricing. One `<TextField>` bound to a new `ownerName` state. On submit, send `ownerName.trim() || undefined` so empty strings don't pollute Firestore.

### STORY-7 — AdminDashboard Propietario column + edit dialog field
Add `TableCell` "Propietario" between Título and Tipo. Show `property.ownerName || '-'`. Add the same field to the edit dialog so admins can fill/edit it.

### STORY-8 — Verify on dev server
Manual: create a property, fill ownerName, save; reload and confirm it shows in admin table and edit dialog. Confirm card price formats consistently for 4-digit and 5-digit UF. Confirm card location is capitalized.

## Acceptance
- All formatter tests green.
- `pnpm build` green.
- All three behaviors visible in the running app.

## Out of scope
- DB backfill of lowercase comuna/city strings.
- Owner email/phone/RUT.
- PropertyDetails (visitor-facing) showing ownerName.