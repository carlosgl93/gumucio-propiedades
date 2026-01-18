# Social Media Sharing Feature

This feature enables users to share properties to social media platforms including Instagram, Facebook, Twitter/X, LinkedIn, and WhatsApp from both the admin dashboard and public property listings.

## Features Implemented

### 1. PropertyShareButtons Component (`src/components/PropertyShareButtons.tsx`)

A reusable React component that provides social media sharing functionality with two variants:

- **Full variant**: Displays all share buttons inline (desktop) with mobile-first native share API
- **Compact variant**: Shows a single share icon that opens a dialog with all options

#### Supported Platforms:
- **Instagram Stories**: Generates and downloads a custom image with property details
- **Facebook**: Direct share with property URL
- **Twitter/X**: Tweet with property details
- **LinkedIn**: Professional sharing
- **WhatsApp**: Share via WhatsApp with custom message
- **Copy Link**: Copy property URL to clipboard

### 2. Instagram Story Image Generator (`src/utils/generateInstagramImage.ts`)

Generates Instagram-ready story images (1080x1920px) with:
- Property's first image as background (scaled to cover, MVP approach)
- Semi-transparent gradient overlay for text readability
- Property title, price, location
- Key features: bedrooms, bathrooms, area
- Up to 3 amenities
- **CORS-enabled** with `crossOrigin="anonymous"` for Firebase Storage images

### 3. Integration Points

#### PropertyDetails Page
- Added share buttons below contact actions in the sticky sidebar
- Mobile: Native share API with fallback
- Desktop: All social buttons visible inline

#### PropertyListView (Compra/Arrienda Pages)
- Share icon button on each property card (top-right corner)
- Visible always on mobile, on hover on desktop
- Prevents card click propagation

#### AdminDashboard
- Share button in the Actions column alongside Edit/Delete
- Opens dialog with property preview and share options
- Enables admins to quickly promote properties

## Technical Implementation

### Dependencies
```json
{
  "react-share": "^5.2.2"
}
```

### Test Coverage
- **15 unit tests** covering:
  - Instagram image generation (7 tests)
  - PropertyShareButtons functionality (8 tests)
  - Canvas API, CORS, clipboard, native share API

### Mobile-First Approach
- Uses native `navigator.share()` API when available (mobile devices)
- Falls back to dialog with all share options
- Responsive design with MUI breakpoints

### Spanish Language
All text, messages, and UI elements are in Spanish:
- "Compartir Propiedad"
- "¡Enlace copiado al portapapeles!"
- "Imagen descargada. Abre Instagram y súbela a tus historias"

## Usage Examples

### In a Component
```tsx
import { PropertyShareButtons } from '@/components';

// Full variant (PropertyDetails)
<PropertyShareButtons property={property} variant="full" />

// Compact variant (PropertyListView, AdminDashboard)
<PropertyShareButtons property={property} variant="compact" />
```

### Instagram Image Generation
```ts
import { generateInstagramStoryImage } from '@/utils/generateInstagramImage';

const blob = await generateInstagramStoryImage(property);
// Returns a Blob that can be downloaded or shared
```

## File Structure
```
src/
├── components/
│   ├── PropertyShareButtons.tsx       # Main component
│   ├── PropertyShareButtons.spec.tsx  # Component tests
│   └── index.ts                       # Export
├── utils/
│   ├── generateInstagramImage.ts      # Instagram image generator
│   └── generateInstagramImage.spec.ts # Generator tests
└── setupTests.ts                      # Test configuration
```

## Environment Variables Required
- `VITE_PROD_URL`: Base URL for generating shareable property links

## Future Enhancements (Not Implemented)

1. **Dynamic Meta Tags**: Implement Firebase Cloud Functions for server-side rendering of Open Graph tags per property
2. **Analytics**: Track share events by platform and property
3. **Custom Image Styling**: More sophisticated Canvas text styling and layouts
4. **Instagram Deep Linking**: Detect mobile and attempt `instagram://` deep links
5. **Image Caching**: Cache generated Instagram images for repeat shares

## Browser Compatibility
- Modern browsers with Canvas API support
- Clipboard API (HTTPS required)
- Native Share API (mobile Safari, Chrome Android)

## Known Limitations
1. Instagram doesn't support direct web sharing - users must download image and upload manually
2. Firebase Storage CORS must be configured correctly
3. Canvas API requires proper image loading (crossOrigin)
4. SSR not available (Firebase Hosting limitation) - OG tags are static

## Testing
```bash
# Run all sharing feature tests
pnpm vitest run src/components/PropertyShareButtons.spec.tsx src/utils/generateInstagramImage.spec.ts

# Run with coverage
pnpm vitest run --coverage
```

## Performance Considerations
- Instagram image generation is async and shows loading state
- Images are generated client-side (no server processing)
- Share buttons use event.stopPropagation() to prevent card clicks
- Lazy loading of react-share components via code splitting
