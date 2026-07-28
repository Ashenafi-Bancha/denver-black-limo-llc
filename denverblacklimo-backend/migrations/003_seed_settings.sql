-- 003_seed_settings.sql — seed the default home hero content (only if absent)

INSERT INTO site_settings (key, value) VALUES
('home_hero', '{
  "headline": "Denver''s Premier",
  "subheadline": "Luxury Chauffeured Transportation",
  "description": "Luxury chauffeured transportation across Colorado — from DIA and boardrooms to Vail and beyond. Immaculate vehicles, professional chauffeurs, available around the clock.",
  "images": [
    "/images/hero/hero-1.jpeg",
    "/images/hero/hero-2.jpeg",
    "/images/hero/hero-3.jpeg",
    "/images/hero/hero-4.jpeg",
    "/images/hero/hero-5.jpeg",
    "/images/hero/hero-6.jpeg",
    "/images/hero/hero-7.jpeg",
    "/images/hero/hero-8.jpeg"
  ]
}'::jsonb)
ON CONFLICT (key) DO NOTHING;
