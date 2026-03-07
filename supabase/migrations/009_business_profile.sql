-- Add business profile columns for AI context personalization
ALTER TABLE public.businesses
  ADD COLUMN menu_or_services text,
  ADD COLUMN brand_tone text DEFAULT 'professional',
  ADD COLUMN target_customers text,
  ADD COLUMN competitive_advantage text,
  ADD COLUMN seasonal_promotions text;
