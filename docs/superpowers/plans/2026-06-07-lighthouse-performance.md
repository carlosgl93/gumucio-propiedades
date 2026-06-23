# Lighthouse Performance Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise Lighthouse Performance score from 87 → 95+ by fixing CLS, LCP, image weight, and cache headers.

**Architecture:** Convert hero CSS background to an `<img>` element (LCP discoverable), fix footer-logo CLS with explicit dimensions, convert PNGs to WebP, and add long-lived cache headers for hashed assets in Firebase Hosting.

**Tech Stack:** React + Vite + MUI + Firebase Hosting · `cwebp` for image conversion

---

## Baseline scores (2026-06-07)
| Metric | Current | Target |
|--------|---------|--------|
| Performance | 87 | 95+ |
| CLS | 0.226 | < 0.05 |
| LCP | ~0.9 s | < 0.8 s |
| Cache hit ratio | low (4 h TTL) | high (1 yr for hashed assets) |

## Issues addressed
1. **CLS 0.226** — `footer-logo.png` has no `width`/`height` attrs → browser can't reserve space → layout shift (+0.224)
2. **LCP suboptimal** — hero background is CSS `backgroundImage`, invisible to browser preloader; `footer-logo.png` ends up being the detected LCP element
3. **Image weight** — `modern-house-bg.png` = 693 KB; WebP saves ~293 KB
4. **Cache TTL** — all assets served with `Cache-Control: max-age=14400` (4 h); hashed JS/CSS should be 1 year
5. **Accessibility** — missing `<main>` landmark (flagged by Lighthouse Accessibility)

## Files to create / modify

| File | Action | Reason |
|------|--------|--------|
| `public/modern-house-bg.webp` | Create | WebP version of hero image |
| `public/footer-logo.webp` | Create | WebP version of footer logo |
| `src/pages/Home/Home.tsx` | Modify | Replace CSS backgroundImage with `<picture>` + `<img fetchpriority="high">` |
| `src/components/Footer.tsx` | Modify | Add `width`/`height` + WebP `<picture>` to fix CLS |
| `src/routes/Pages/Pages.tsx` | Modify | Wrap content in `<main>` landmark |
| `firebase.json` | Modify | Add long-lived cache headers for hashed assets |

---

### Task 1: Create feature branch

- [ ] **Step 1: Create and switch to branch**

```bash
git checkout -b feat/lighthouse-performance
```

- [ ] **Step 2: Verify branch**

```bash
git branch --show-current
```
Expected output: `feat/lighthouse-performance`

- [ ] **Step 3: Commit**

```bash
git commit --allow-empty -m "chore: start lighthouse performance branch"
```

---

### Task 2: Convert images to WebP

**Files:**
- Create: `public/modern-house-bg.webp`
- Create: `public/footer-logo.webp`

`cwebp` is available at `/opt/homebrew/bin/cwebp`.

- [ ] **Step 1: Convert hero image**

```bash
cwebp -q 82 public/modern-house-bg.png -o public/modern-house-bg.webp
```

Expected: prints size comparison, new file ~400 KB or less.

- [ ] **Step 2: Convert footer logo**

```bash
cwebp -q 90 -lossless public/footer-logo.png -o public/footer-logo.webp
```

Expected: new file smaller than 23 KB.

- [ ] **Step 3: Verify output sizes**

```bash
ls -lh public/modern-house-bg.webp public/footer-logo.webp
```

Expected: `modern-house-bg.webp` < 420 KB, `footer-logo.webp` < 25 KB.

- [ ] **Step 4: Commit**

```bash
git add public/modern-house-bg.webp public/footer-logo.webp
git commit -m "chore: add WebP versions of hero and footer logo"
```

---

### Task 3: Fix LCP — convert hero from CSS background to `<picture>` + `<img>`

**Files:**
- Modify: `src/pages/Home/Home.tsx`

The hero currently uses `backgroundImage: 'url(/modern-house-bg.png)'` on a `styled(Box)`. CSS background images are not discoverable by the browser preloader, so the browser finds them late → worse LCP. Converting to an `<img fetchpriority="high">` makes it a proper LCP candidate and discoverable via the preload scanner.

- [ ] **Step 1: Read current file**

Read `src/pages/Home/Home.tsx` — the `HeroSection` styled component has:
```ts
backgroundImage: 'url(/modern-house-bg.png)',
backgroundSize: 'cover',
backgroundPosition: 'center',
backgroundRepeat: 'no-repeat',
```

- [ ] **Step 2: Update `Home.tsx`**

Replace the entire file content with:

```tsx
import { useNavigate } from 'react-router';

import { Box, Button, Card, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const HeroSection = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'start',
  paddingTop: theme.spacing(4),
  gap: theme.spacing(23),
  overflow: 'hidden',
  [theme.breakpoints.down('sm')]: {
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
    padding: theme.spacing(4, 2),
    gap: theme.spacing(0),
  },
}));

const HeroContent = styled(Box)(({ theme }) => ({
  height: '100%',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'start',
  padding: theme.spacing(4, 6),
  position: 'relative',
  zIndex: 1,
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2, 1),
    alignItems: 'space-around',
    marginBottom: theme.spacing('65%'),
  },
}));

export const PropertyCard = styled(Card)(({ theme }) => ({
  maxWidth: 350,
  margin: 'auto',
  marginTop: theme.spacing(8),
  boxShadow: theme.shadows[3],
  '& .MuiCardMedia-root': {
    height: 200,
  },
}));

export const SectionTitle = styled(Typography)(() => ({
  fontFamily: '"Crimson Text", serif',
  fontSize: '2.5rem',
  fontWeight: 400,
  textAlign: 'center',
  marginBottom: '3rem',
  color: '#333',
  letterSpacing: '0.02em',
}));

const CallToAction = styled(Typography)(({ theme }) => ({
  fontFamily: '"Crimson Text", serif',
  fontSize: '2.8rem',
  fontWeight: 400,
  textAlign: 'center',
  color: '#303030',
  lineHeight: 1.2,
  [theme.breakpoints.down('sm')]: {
    fontSize: '2rem',
  },
}));

function Home() {
  const navigate = useNavigate();

  return (
    <Box>
      <HeroSection>
        {/* Hero background as <img> so browser preloader discovers it early (LCP) */}
        <picture
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            zIndex: 0,
          }}
        >
          <source srcSet="/modern-house-bg.webp" type="image/webp" />
          <img
            src="/modern-house-bg.png"
            alt=""
            fetchPriority="high"
            loading="eager"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              display: 'block',
            }}
          />
        </picture>

        <HeroContent>
          <Box
            sx={{
              backgroundColor: 'background.paper',
              padding: {
                xs: 2,
                sm: 4,
              },
              borderRadius: 2,
            }}
          >
            <CallToAction>¿QUIERES EMPEZAR UN CAPÍTULO NUEVO?</CallToAction>
          </Box>
        </HeroContent>

        <Box
          sx={{
            width: '100%',
            px: { xs: 2, sm: 4, md: 6 },
            display: 'flex',
            flexDirection: {
              xs: 'column',
              sm: 'row',
            },
            justifyContent: { xs: 'stretch', sm: 'center' },
            alignItems: 'center',
            gap: {
              xs: 2,
              sm: 3,
              md: 4,
            },
            flexWrap: 'wrap',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Button
            variant="contained"
            sx={{
              backgroundColor: 'background.paper',
              color: '#000000',
              width: { xs: '100%', sm: 'auto' },
              minWidth: { sm: '140px', md: '160px' },
              maxWidth: { sm: '180px', md: '200px' },
              fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' },
              py: { xs: 1, sm: 1.5, md: 2 },
              px: { xs: 2, sm: 3, md: 4 },
            }}
            onClick={() => navigate('/compra')}
          >
            COMPRA
          </Button>
          <Button
            variant="contained"
            sx={{
              backgroundColor: 'background.paper',
              color: '#000000',
              width: { xs: '100%', sm: 'auto' },
              minWidth: { sm: '140px', md: '160px' },
              maxWidth: { sm: '180px', md: '200px' },
              fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' },
              py: { xs: 1, sm: 1.5, md: 2 },
              px: { xs: 2, sm: 3, md: 4 },
            }}
            onClick={() => navigate('/arrienda')}
          >
            ARRIENDA
          </Button>
          <Button
            variant="contained"
            sx={{
              backgroundColor: 'background.paper',
              color: '#000000',
              width: { xs: '100%', sm: 'auto' },
              minWidth: { sm: '140px', md: '160px' },
              maxWidth: { sm: '180px', md: '200px' },
              fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' },
              py: { xs: 1, sm: 1.5, md: 2 },
              px: { xs: 2, sm: 3, md: 4 },
            }}
            onClick={() => navigate('/vende')}
          >
            VENDE
          </Button>
          <Button
            variant="contained"
            sx={{
              backgroundColor: 'background.paper',
              color: '#000000',
              width: { xs: '100%', sm: 'auto' },
              minWidth: { sm: '160px', md: '180px' },
              maxWidth: { sm: '200px', md: '220px' },
              fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.9rem' },
              py: { xs: 1, sm: 1.5, md: 2 },
              px: { xs: 2, sm: 2.5, md: 3 },
            }}
            onClick={() => navigate('/arrienda-tu-propiedad')}
          >
            ARRIENDA TU PROPIEDAD
          </Button>
          <Button
            variant="contained"
            sx={{
              backgroundColor: 'background.paper',
              color: '#000000',
              width: { xs: '100%', sm: 'auto' },
              minWidth: { sm: '140px', md: '160px' },
              maxWidth: { sm: '180px', md: '200px' },
              fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.9rem' },
              py: { xs: 1, sm: 1.5, md: 2 },
              px: { xs: 1, sm: 2, md: 3 },
              textAlign: 'center',
              lineHeight: 1.2,
            }}
            onClick={() => {
              window.open('https://www.instagram.com/gumuciopropiedades', '_blank');
            }}
          >
            RRSS {<br />} @GUMUCIOPROPIEDADES
          </Button>
        </Box>
      </HeroSection>
    </Box>
  );
}

export default Home;
```

- [ ] **Step 3: Build and verify no TS errors**

```bash
pnpm run ts:check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Home/Home.tsx
git commit -m "feat: convert hero background to <picture> img for LCP improvement"
```

---

### Task 4: Fix CLS — add explicit dimensions + WebP to footer logo

**Files:**
- Modify: `src/components/Footer.tsx`

`footer-logo.png` is 1280×284 px. Without `width`/`height` attrs the browser doesn't know the aspect ratio before the image loads → layout shift of 0.224. Adding the intrinsic dimensions lets the browser reserve the correct space immediately.

- [ ] **Step 1: Update `Footer.tsx`**

Replace the entire file content with:

```tsx
import { Box } from '@mui/material';

export const Footer = () => {
  return (
    <Box
      sx={{
        backgroundColor: '#fafafa',
        textAlign: 'center',
        position: 'relative',
        bottom: 0,
        width: '100%',
        p: 0,
        m: 0,
        overflow: 'hidden',
      }}
    >
      <picture>
        <source srcSet="/footer-logo.webp" type="image/webp" />
        <img
          style={{
            objectFit: 'cover',
            width: '100%',
            display: 'block',
            margin: 0,
            padding: 0,
          }}
          src="/footer-logo.png"
          alt="Gumucio Propiedades"
          width={1280}
          height={284}
        />
      </picture>
    </Box>
  );
};
```

- [ ] **Step 2: Build and verify**

```bash
pnpm run ts:check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Footer.tsx
git commit -m "fix: add explicit width/height to footer logo to eliminate CLS"
```

---

### Task 5: Add `<main>` landmark for accessibility

**Files:**
- Modify: `src/routes/Pages/Pages.tsx`

Lighthouse Accessibility flags: "Document does not have a main landmark." Wrapping page content in `<main>` fixes this.

- [ ] **Step 1: Update `Pages.tsx`**

Replace the entire file content with:

```tsx
import { Routes } from 'react-router';

import Box from '@mui/material/Box';

import { Footer } from '@/components';

import routes from '..';
import { getPageHeight, renderRoutes } from './utils';

function Pages() {
  return (
    <Box sx={{ height: (theme) => getPageHeight(theme) }}>
      <main>
        <Routes>{renderRoutes(routes)}</Routes>
      </main>
      <Footer />
    </Box>
  );
}

export default Pages;
```

- [ ] **Step 2: Verify TS**

```bash
pnpm run ts:check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/Pages/Pages.tsx
git commit -m "fix: add <main> landmark for accessibility"
```

---

### Task 6: Firebase Hosting — long-lived cache for hashed assets

**Files:**
- Modify: `firebase.json`

Vite outputs hashed filenames for all JS/CSS (e.g., `index-Bb-dD83a.js`). These are safe to cache for 1 year (`immutable`). Static public assets without hashes (images, robots.txt) should use a shorter TTL (1 week) so changes deploy within a reasonable time.

- [ ] **Step 1: Read current `firebase.json`**

Current `hosting` section has no `headers` key. The default Firebase CDN TTL is 4 hours.

- [ ] **Step 2: Add cache headers to `firebase.json`**

Replace the `hosting` section only:

```json
"hosting": {
  "public": "dist",
  "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
  "rewrites": [
    {
      "source": "**",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/**",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "**/*.webp",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=604800"
        }
      ]
    },
    {
      "source": "**/*.png",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=604800"
        }
      ]
    },
    {
      "source": "/registerSW.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache"
        }
      ]
    }
  ]
}
```

Full updated `firebase.json`:

```json
{
  "firestore": {
    "database": "(default)",
    "location": "southamerica-west1",
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/assets/**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "**/*.webp",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "**/*.png",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "/registerSW.js",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache"
          }
        ]
      }
    ]
  },
  "storage": {
    "rules": "storage.rules"
  },
  "emulators": {
    "auth": {
      "port": 9099
    },
    "firestore": {
      "port": 8081
    },
    "ui": {
      "enabled": true
    },
    "singleProjectMode": true,
    "hosting": {
      "port": 5000
    },
    "storage": {
      "port": 9199
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add firebase.json
git commit -m "feat: add long-lived cache headers for hashed assets in Firebase Hosting"
```

---

### Task 7: Build + deploy to Firebase preview channel

- [ ] **Step 1: Build**

```bash
pnpm run build
```

Expected: `dist/` produced with no TS/build errors.

- [ ] **Step 2: Deploy to preview channel**

```bash
firebase hosting:channel:deploy lighthouse-improvements --expires 7d
```

Expected: outputs a preview URL like `https://gumucio-propiedades--lighthouse-improvements-<hash>.web.app`

- [ ] **Step 3: Run Lighthouse on preview URL**

Open the preview URL in an **incognito window** and run Lighthouse. Compare:

| Metric | Before | Target |
|--------|--------|--------|
| Performance | 87 | 95+ |
| CLS | 0.226 | < 0.05 |
| LCP | ~0.9 s | < 0.8 s |

- [ ] **Step 4: Record results and commit plan**

```bash
git add docs/superpowers/plans/2026-06-07-lighthouse-performance.md
git commit -m "chore: add lighthouse improvement plan"
```

---

## Self-review

**Spec coverage:**
- CLS fix: Task 4 (explicit dimensions on footer-logo) ✓
- LCP fix: Task 3 (hero `<picture>` + `fetchpriority`) ✓  
- Image weight: Task 2 (WebP conversion) + used in Tasks 3 & 4 ✓
- Cache TTL: Task 6 ✓
- Accessibility `<main>`: Task 5 ✓
- Preview channel deploy: Task 7 ✓

**Placeholder scan:** No TBDs, no "implement later", all code blocks complete. ✓

**Type consistency:** `fetchPriority` (camelCase) used consistently in TSX — correct for React's JSX prop. ✓
