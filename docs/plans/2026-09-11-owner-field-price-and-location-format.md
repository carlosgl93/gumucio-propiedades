# Plan — Owner field, price formatter, location formatter

## 1. Price formatter dedupe (fixes inconsistent UF thousands)

**Root cause.** Four sites inline their own `formatPrice(price, currency)`:

- `src/components/PropertyCard/PropertyCard.tsx:15`
- `src/pages/PropertyDetails/PropertyDetails.tsx:40`
- `src/components/AdminDashboard.tsx:165`
- `src/utils/currencyConverter.ts:135`

The card's UF branch calls `price.toLocaleString()` with no locale arg → ICU default → grouping threshold misses 4-digit numbers (`4560` renders `UF 4560`), hits 5+ digits (`UF 40.000`). Other three sites pass `'es-CL'` and format consistently.

**Fix.** New `src/utils/formatters.ts` with one shared `formatPrice(price, currency)`. CLP via `Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 })`. UF via `price.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })`. Replace all 4 inline copies. Keep `formatPriceWithConversion` in `currencyConverter.ts` (it delegates to the local formatPrice — wire it to the new shared util too).

## 2. Location capitalization

**Root cause.** Comuna/city rendered raw, joined by `, `. `src/components/PropertyCard/PropertyCard.tsx:118`, `src/components/PropertyShareButtons.tsx:75`, `src/utils/generateInstagramImage.ts:69`, `src/pages/PropertyDetails/PropertyDetails.tsx` (locationText pattern).

**Fix.** `formatLocation(commune, city)` in same `formatters.ts`. Capitalize first letter of each word (handles "rancagua" → "Rancagua", "las condes" → "Las Condes"). Trim. Drop empty parts. Replace at all 4 sites. Render-time only — no DB migration.

## 3. Owner name field

**Schema.** `src/models/property.ts` — add `ownerName?: string` at the top level of `Property` (optional, no backfill).

**Capture.** `src/components/PropertyForm.tsx` — new `<Card>` section "Propietario" placed between Identification and Pricing. One `<TextField>` (`fullWidth`). Trim on save, no min/max.

**Display.** `src/components/AdminDashboard.tsx`:
- New `TableCell` "Propietario" between Título and Tipo.
- Show in the edit dialog (admin only).

**Out of scope.** `PropertyDetails.tsx` stays visitor-facing and does NOT render ownerName.

## Out of scope
- DB backfill of existing lowercase comuna/city values.
- Owner email/phone/RUT fields.
- PropertyDetails showing ownerName.