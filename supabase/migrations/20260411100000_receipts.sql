-- Receipts table for OCR-extracted receipt/expense data
CREATE TABLE IF NOT EXISTS public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE,
  total_amount DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  vendor TEXT,
  category TEXT DEFAULT 'other',
  items JSONB DEFAULT '[]'::jsonb,
  image_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- Business members can view all receipts for their business
CREATE POLICY "Members can view receipts" ON public.receipts FOR SELECT
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    OR business_id IN (SELECT business_id FROM public.business_members WHERE user_id = auth.uid())
  );

-- Authenticated users can insert their own receipts
CREATE POLICY "Users can insert receipts" ON public.receipts FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own receipts
CREATE POLICY "Users can update own receipts" ON public.receipts FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own receipts; business owners can delete any
CREATE POLICY "Users can delete own receipts" ON public.receipts FOR DELETE
  USING (
    user_id = auth.uid()
    OR business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_receipts_business ON public.receipts(business_id);
CREATE INDEX IF NOT EXISTS idx_receipts_user ON public.receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON public.receipts(date DESC);
