-- 003_seed_settings.sql — seed the default home hero content (only if absent)

INSERT INTO site_settings (key, value) VALUES
('home_hero', '{
  "headline": "Denver''s Premier",
  "subheadline": "Luxury Chauffeured Transportation",
  "description": "Airport Transfers • Corporate Travel • Mountain Resorts • Private Aviation • Weddings • Special Events",
  "images": [
    "/images/hero1.webp",
    "/images/hero2.webp",
    "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=2000",
    "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=2000",
    "https://images.unsplash.com/photo-1540962351504-03099e0a754b?auto=format&fit=crop&q=80&w=2000"
  ]
}'::jsonb)
ON CONFLICT (key) DO NOTHING;
