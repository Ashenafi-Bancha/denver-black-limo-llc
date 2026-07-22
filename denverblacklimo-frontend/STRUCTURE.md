# Project Structure Overview

## Current Clean Structure

```
denver-black-limo/
├── denverblacklimo-backend/          # Backend (currently empty, ready for API)
│
└── denverblacklimo-frontend/        # Frontend Application
    ├── public/                       # Static assets (served as-is)
    │   └── images/                  # Public images
    │       ├── logo.jpg             # Official logo (114KB, JPG)
    │       └── founder-bereket-bedane.jpg  # Founder photo (38KB)
    │
    ├── src/                          # Source code
    │   ├── assets/                  # Importable assets
    │   │   └── logo.jpg             # Logo copy for potential imports
    │   │
    │   ├── components/              # Reusable UI components (10 files)
    │   │   ├── ColoradoMap.tsx       # Colorado map with service areas
    │   │   ├── CTABanner.tsx         # Call-to-action banner component
    │   │   ├── Footer.tsx            # Site footer with links & social
    │   │   ├── Header.tsx           # Sticky header with navigation
    │   │   ├── Layout.tsx           # Main layout wrapper
    │   │   ├── Logo.tsx             # Logo component with text
    │   │   ├── ReviewsCarousel.tsx   # Testimonials carousel
    │   │   ├── ServiceIcon.tsx      # Service icon helper
    │   │   ├── ServiceSection.tsx   # Service category section
    │   │   ├── SubServiceGrid.tsx    # Grid of sub-services
    │   │   ├── TrustRow.tsx         # Trust indicators row
    │   │   └── ui.tsx              # Common UI elements (buttons, headings)
    │   │
    │   ├── data/                    # Data & content (3 files)
    │   │   ├── fleet.ts             # Fleet vehicles (6 types)
    │   │   ├── serviceAreas.ts      # Service area regions
    │   │   └── services.ts          # 12 service categories
    │   │
    │   ├── pages/                   # Page components (10 files)
    │   │   ├── AboutPage.tsx        # About us page
    │   │   ├── BookNowPage.tsx      # Booking form page
    │   │   ├── ContactPage.tsx     # Contact page with form
    │   │   ├── FleetPage.tsx        # Fleet showcase page
    │   │   ├── HomePage.tsx         # Home page
    │   │   ├── RequestQuotePage.tsx # Quote request page
    │   │   ├── ServiceAreaDetailPage.tsx  # Single service area
    │   │   ├── ServiceAreasPage.tsx     # All service areas
    │   │   ├── ServiceDetailPage.tsx    # Single service
    │   │   └── ServicesPage.tsx        # All services
    │   │
    │   ├── App.tsx                  # Main app with routes
    │   ├── constants.ts             # Global constants (6 exports)
    │   ├── index.css               # Tailwind + custom styles
    │   └── main.tsx                # React entry point
    │
    ├── .gitignore                  # Git ignore rules
    ├── .oxlintrc.json             # Oxlint configuration
    ├── DEVELOPMENT.md             # Development guide (NEW)
    ├── STRUCTURE.md               # This file (NEW)
    ├── index.html                 # HTML template
    ├── package.json               # Dependencies & scripts
    ├── README.md                  # Project overview (UPDATED)
    ├── tsconfig.json              # TypeScript config
    ├── tsconfig.app.json          # App-specific TS config
    ├── tsconfig.node.json         # Node-specific TS config
    └── vite.config.ts             # Vite configuration
```

## File Counts

| Category | Count | Notes |
|----------|-------|-------|
| Pages | 10 | All page components |
| Components | 10 | Reusable UI components |
| Data Files | 3 | Structured data |
| Config Files | 5 | TypeScript, Vite, etc. |
| Static Images | 2 | Logo + founder photo |
| **Total Source Files** | **~30** | Excluding node_modules |

## What Was Cleaned Up

### Removed Files (No Longer Needed)
- `logo.jpg` from root folder → Consolidated to `public/images/logo.jpg`
- `hero.png` from `src/assets/` → Unused template asset
- `react.svg` from `src/assets/` → Unused template asset
- `vite.svg` from `src/assets/` → Unused template asset
- `about-pdf-page-1.png` from `public/images/` → Unused reference
- All `photo_2026-*.jpg` from `public/images/` → Unused reference images

### Files Kept
- `public/images/logo.jpg` → Used for favicon and header
- `public/images/founder-bereket-bedane.jpg` → Used in About page
- `src/assets/logo.jpg` → Copy for potential future imports

## Route Structure

```
/
├── /                           # HomePage
├── /about                      # AboutPage
├── /book                       # BookNowPage
├── /contact                    # ContactPage
├── /fleet                      # FleetPage
├── /quote                      # RequestQuotePage
├── /service-areas              # ServiceAreasPage
│   └── /:slug                  # ServiceAreaDetailPage
└── /services
    ├── /                        # ServicesPage
    └── /:slug                  # ServiceDetailPage
```

## Important Files Summary

### Entry Points
- `index.html` - HTML template with favicon
- `main.tsx` - React initialization
- `App.tsx` - All routes defined here

### Configuration
- `vite.config.ts` - Vite server and build config
- `tailwindcss` - Inlined in vite.config.ts
- `tsconfig.json` - TypeScript base config

### Styling
- `index.css` - Contains:
  - Tailwind import
  - Brand color definitions
  - Custom gradients
  - Utility classes

### Data
- `services.ts` - 12 service categories with sub-services
- `fleet.ts` - 6 vehicle types with specs
- `serviceAreas.ts` - Colorado service regions

### Constants
- `constants.ts` - Global constants:
  - PHONE, PHONE_HREF
  - EMAIL, EMAIL_HREF
  - FACEBOOK_URL
  - ADDRESS
  - FOUNDED
  - FOUNDER (object)
  - SERVICE_TYPES (12 items)
  - VEHICLE_PREFERENCES (6 items)

## Size Breakdown

| Folder/File | Size | Purpose |
|-------------|------|---------|
| node_modules/ | ~200MB | Dependencies |
| dist/ | ~5-10MB | Build output |
| public/images/ | ~150KB | Static images |
| src/ | ~500KB | Source code |
| **Total** | **~205MB** | Full project |

## Professional Organization Tips

### 1. Keep Adding to the Pattern
- New page? → `src/pages/NewPage.tsx`
- New component? → `src/components/NewComponent.tsx`
- New data? → `src/data/newData.ts`

### 2. Naming Conventions
- **PascalCase** for components: `GoldButton.tsx`
- **camelCase** for variables: `const fleetVehicles = [...]`
- **kebab-case** for files: `fleet.ts` (exception: component files)
- **SCREAMING_SNAKE_CASE** for constants: `PHONE`, `EMAIL_HREF`

### 3. Folder Organization
- Group by feature, not by type (except components/pages)
- Keep related files together
- Use index files for barrel exports if needed

### 4. Cleanup Regularly
- Remove unused imports
- Delete console.log statements
- Clean node_modules before deployment
- Remove unused images

## Recommended Additional Structure

For future growth, consider:

```
├── src/
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                     # Utility functions
│   ├── styles/                  # Additional CSS modules
│   ├── types/                   # TypeScript type definitions
│   └── tests/                   # Test files
```

Currently these aren't needed, but the structure supports adding them.

## Dependencies

### Production Dependencies (8)
- framer-motion: ^12.42.2
- lucide-react: ^1.25.0
- react: ^19.2.7
- react-dom: ^19.2.7
- react-router-dom: ^7.18.1

### Development Dependencies (8)
- @tailwindcss/vite: ^4.3.3
- @types/node: ^24.13.2
- @types/react: ^19.2.17
- @types/react-dom: ^19.2.3
- @vitejs/plugin-react: ^6.0.3
- oxlint: ^1.71.0
- tailwindcss: ^4.3.3
- typescript: ~6.0.2
- vite: ^8.1.1

## Version Info

- **React**: 19.2.7 (latest)
- **Vite**: 8.1.1 (latest)
- **TypeScript**: 6.0.2 (latest)
- **Tailwind CSS**: 4.3.3 (latest)
- **React Router**: 7.18.1 (stable)
- **Framer Motion**: 12.42.2 (stable)
- **Lucide React**: 1.25.0 (latest)

All dependencies are up-to-date as of the project creation.
