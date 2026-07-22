# Denver Black Limo LLC — Marketing Website

Premium marketing frontend for **Denver Black Limo LLC**, built from the design specifications in `Denver_Black_Limo_Frontend_Prompt.md`.

## Stack

- **React 19** + **Vite 8** + **TypeScript 6**
- **Tailwind CSS v4** - Modern styling
- **React Router v6** - Page navigation
- **Framer Motion** - Subtle animations
- **Lucide React** - Icon library

## Project Structure

```
denverblacklimo-frontend/
├── public/
│   └── images/                    # Static images served directly
│       ├── logo.jpg              # Official company logo (favicon + header)
│       └── founder-bereket-bedane.jpg
├── src/
│   ├── assets/                  # Imported assets (logo copy)
│   │   └── logo.jpg             # Same logo for imports if needed
│   ├── components/              # Reusable UI components
│   │   ├── ColoradoMap.tsx
│   │   ├── CTABanner.tsx
│   │   ├── Footer.tsx
│   │   ├── Header.tsx
│   │   ├── Layout.tsx
│   │   ├── Logo.tsx
│   │   ├── ReviewsCarousel.tsx
│   │   ├── ServiceIcon.tsx
│   │   ├── ServiceSection.tsx
│   │   ├── SubServiceGrid.tsx
│   │   ├── TrustRow.tsx
│   │   └── ui.tsx
│   ├── data/                    # Data files
│   │   ├── fleet.ts             # Fleet vehicle data (6 types)
│   │   ├── serviceAreas.ts      # Service area data
│   │   └── services.ts          # 12 service categories
│   ├── pages/                   # Page components
│   │   ├── AboutPage.tsx
│   │   ├── BookNowPage.tsx      # Booking form
│   │   ├── ContactPage.tsx     # Contact info + form
│   │   ├── FleetPage.tsx        # Vehicle showcase
│   │   ├── HomePage.tsx
│   │   ├── RequestQuotePage.tsx # Quote request form
│   │   ├── ServiceAreaDetailPage.tsx
│   │   ├── ServiceAreasPage.tsx
│   │   ├── ServiceDetailPage.tsx
│   │   └── ServicesPage.tsx
│   ├── App.tsx                  # Main app with all routes
│   ├── constants.ts             # Global constants (contact info, etc.)
│   ├── index.css               # Tailwind CSS + custom theme
│   └── main.tsx                # React entry point
├── .gitignore
├── index.html                  # HTML entry (favicon in public/images)
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
└── vite.config.ts
```

## Run Locally

```bash
cd denverblacklimo-frontend
npm install
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

## Build for Production

```bash
npm run build
npm run preview
```

## Brand Assets

- **Logo**: `public/images/logo.jpg` - Official company logo
- **Founder Image**: `public/images/founder-bereket-bedane.jpg`

## Color Palette (from logo)

| Color | Hex | Usage |
|-------|-----|-------|
| Brand Black | `#0a0a0a` | Primary background |
| Brand Charcoal | `#121212` | Secondary background |
| Brand Surface | `#1a1a1a` | Card backgrounds |
| Brand Gold | `#c9a227` | Primary accent |
| Brand Gold Light | `#d4af37` | Light accent |
| Brand Gold Dark | `#b8860b` | Dark accent |
| Brand Cream | `#f5f0e6` | Light contrast sections |

## Pages

- **Home** - Hero, quick nav, Colorado map, reviews, CTA
- **Services** - 12 service categories with detail pages
- **Service Areas** - Coverage regions with detail pages
- **Fleet** - 6 luxury vehicle types
- **About Us** - Company story, values, founder
- **Contact** - Contact info (phone, email, Facebook), form, map
- **Book Now** - Full booking form with validation
- **Request a Quote** - Lightweight quote form

## Fleet Vehicles (6 types)

1. **Luxury Sedan** - Up to 3 passengers
2. **Executive SUV** - Up to 6 passengers
3. **Cadillac Escalade** - Up to 7 passengers
4. **Executive Sprinter Van** - Up to 14 passengers
5. **Stretch Limousine** - Up to 10 passengers
6. **Motorcoach / Party Bus** - Up to 25 passengers

## Contact Information

- **Phone**: (720) 499-6744
- **Email**: denverblacklimo@yahoo.com
- **Facebook**: https://web.facebook.com/p/Denver-Black-Limo-LLC-100087707941139/
- **Address**: Denver, Colorado — serving the Front Range & beyond

## Social Media

- **Facebook**: ✅ Linked and active
- **WhatsApp**: ⏳ Icon added, link placeholder
- **X (Twitter)**: ⏳ Icon added, link placeholder

## Features

- ✅ Fully responsive (mobile-first)
- ✅ Dark theme with luxury gold/black aesthetic
- ✅ Client-side form validation
- ✅ Lazy-loaded images
- ✅ Smooth animations with Framer Motion
- ✅ Consistent CTA banners
- ✅ Sticky header navigation
- ✅ Footer with quick links and social icons
- ✅ Ready for backend integration (forms log to console)

## Cleanup Notes

The following items have been cleaned up:
- Removed duplicate logo.jpg from root folder (now in public/images/)
- Removed unused template assets (hero.png, react.svg, vite.svg)
- Removed unused reference images (photo_*.jpg, about-pdf-page-1.png)
- Logo is now consistently referenced as `/images/logo.jpg` throughout
