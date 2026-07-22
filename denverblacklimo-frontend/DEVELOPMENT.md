# Development Guide

## Quick Start

### 1. Install Dependencies

```bash
cd denverblacklimo-frontend
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

Your app will be available at `http://localhost:5173`

### 3. Build for Production

```bash
npm run build
```

This creates optimized production files in the `dist/` folder.

### 4. Preview Production Build

```bash
npm run preview
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run Oxlint for code quality |

## Project Commands Cheat Sheet

### Run the app
```bash
npm run dev
```

### Stop the server
```bash
Ctrl + C
```

### Rebuild dependencies
If you get errors about missing modules:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Clean build output
```bash
rm -rf dist
```

## File Structure Best Practices

### Adding New Pages
1. Create a new `.tsx` file in `src/pages/`
2. Add a route in `src/App.tsx`
3. Import and use components from `src/components/`

### Adding New Components
1. Create a new `.tsx` file in `src/components/`
2. Use Tailwind classes for styling
3. Keep components focused and reusable

### Adding New Data
1. Create or update files in `src/data/`
2. Export as `const` arrays or objects
3. Import where needed

### Adding Images
1. Place static images in `public/images/`
2. Reference as `/images/filename.jpg`
3. For lazy loading, use `loading="lazy"` attribute

## Color System

### Using Brand Colors

The project uses CSS custom properties (variables) defined in `src/index.css`:

```css
--color-brand-black: #0a0a0a;
--color-brand-charcoal: #121212;
--color-brand-surface: #1a1a1a;
--color-brand-gold: #c9a227;
--color-brand-gold-light: #d4af37;
--color-brand-gold-dark: #b8860b;
--color-brand-cream: #f5f0e6;
```

### In Tailwind
Use the `bg-brand-gold`, `text-brand-gold-light`, etc. classes.

### Custom Gradients
```css
.text-gold-gradient { background: linear-gradient(135deg, #e8c547 0%, #c9a227 45%, #b8860b 100%); }
.bg-gold-gradient { background: linear-gradient(135deg, #e8c547 0%, #c9a227 45%, #b8860b 100%); }
```

## Component Usage

### Common Components

#### Buttons
```tsx
import { GoldButton, OutlineButton } from './components/ui';

<GoldButton to="/book">BOOK NOW</GoldButton>
<OutlineButton to="/quote">REQUEST A QUOTE</OutlineButton>
```

#### Section Heading
```tsx
import { SectionHeading } from './components/ui';

<SectionHeading className="mb-10">Our Services</SectionHeading>
```

#### Page Hero
```tsx
import { PageHero } from './components/ui';

<PageHero
  eyebrow="About Us"
  title="Our Story"
  subtitle="Learn about Denver Black Limo"
  image="/images/hero.jpg"
/>
```

#### CTA Banner
```tsx
import { CTABanner } from './components/CTABanner';

<CTABanner title="Ready to Book?" />
```

## Forms

### Booking Form Fields
The booking form in `BookNowPage.tsx` includes:
- Service type (dropdown)
- Pickup date/time
- Pickup/drop-off locations
- Number of passengers
- Vehicle preference
- Round trip toggle
- Contact info (name, email, phone)
- Special requests

### Contact Form Fields
The contact form in `ContactPage.tsx` includes:
- Name
- Email
- Phone
- Message

All forms have client-side validation and log to console on submit.

## Routing

### Adding New Routes
Edit `src/App.tsx`:

```tsx
<Route path="new-page" element={<NewPage />} />
```

### Dynamic Routes
For service detail pages:
```tsx
<Route path="services/:slug" element={<ServiceDetailPage />} />
```

## Images

### Recommended Sources
- **Unsplash** - Free high-quality photos
- **Pexels** - Alternative free photos
- **Company assets** - Official vehicle photos

### Image URLs in Data Files
Use Unsplash URLs with width and quality parameters:
```
https://images.unsplash.com/photo-XXXXXX?w=800&q=80
```

### Local Images
Place in `public/images/` and reference with leading slash:
```tsx
<img src="/images/logo.jpg" alt="Logo" />
```

## Deployment

### Vite Production Build
```bash
npm run build
```

This creates optimized files in `dist/` folder.

### Deploy to Netlify
1. Push to GitHub
2. Connect to Netlify
3. Set build command: `npm run build`
4. Set publish directory: `dist`

### Deploy to Vercel
1. Push to GitHub
2. Import to Vercel
3. Set framework: Vite
4. Deploy

### Deploy to GitHub Pages
```bash
npm run build
git add dist -f
git commit -m "Build for gh-pages"
git subtree push --prefix dist origin gh-pages
```

## Backend Integration

### Connecting Forms
Forms currently log to console. To connect to a backend:

1. Replace the submit handler in the form component
2. Use `fetch()` to send data to your API endpoint
3. Handle loading states and errors

Example:
```tsx
const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.currentTarget));
  
  try {
    const response = await fetch('/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (response.ok) {
      setSubmitted(true);
    }
  } catch (error) {
    console.error('Submission error:', error);
  }
};
```

## Troubleshooting

### Module Not Found Errors
```bash
npm install
```

### Tailwind Classes Not Working
Check that:
1. `src/index.css` has `@import "tailwindcss";`
2. `vite.config.ts` has Tailwind plugin
3. You're using the correct class names

### TypeScript Errors
```bash
npm install --save-dev @types/node @types/react @types/react-dom
```

### Build Fails
```bash
rm -rf node_modules dist
npm install
npm run build
```

## Useful Resources

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [React Router](https://reactrouter.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [Lucide Icons](https://lucide.dev/)
