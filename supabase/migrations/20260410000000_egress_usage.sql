CREATE TABLE IF NOT EXISTS public.egress_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) NOT NULL,
  year_month TEXT NOT NULL,
  bytes_downloaded BIGINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_egress_business_month ON public.egress_usage(business_id, year_month);

ALTER TABLE public.egress_usage ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Business members can view egress' AND tablename = 'egress_usage'
  ) THEN
    CREATE POLICY "Business members can view egress" ON public.egress_usage
      FOR SELECT USING (
        business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
        OR business_id IN (SELECT business_id FROM public.business_members WHERE user_id = auth.uid())
      );
  END IF;
END
$$;
