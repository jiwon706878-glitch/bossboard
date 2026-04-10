-- Credit balance tracking per business
CREATE TABLE IF NOT EXISTS public.credit_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) NOT NULL,
  credits_monthly INT DEFAULT 0,
  credits_monthly_used INT DEFAULT 0,
  credits_purchased INT DEFAULT 0,
  credits_purchased_used INT DEFAULT 0,
  billing_cycle_start TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id)
);

-- Credit purchase history
CREATE TABLE IF NOT EXISTS public.credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  pack_name TEXT NOT NULL,
  credits_amount INT NOT NULL,
  price_usd DECIMAL(10,2) NOT NULL,
  paddle_transaction_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Abuse detection log
CREATE TABLE IF NOT EXISTS public.credit_abuse_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  failure_count INT DEFAULT 0,
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_credit_balance_business ON public.credit_balances(business_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_business ON public.credit_purchases(business_id, created_at DESC);

-- RLS
ALTER TABLE public.credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_abuse_log ENABLE ROW LEVEL SECURITY;

-- Balance policies
CREATE POLICY "Users view own credits" ON public.credit_balances
  FOR SELECT USING (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    OR business_id IN (SELECT business_id FROM public.business_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Service insert credits" ON public.credit_balances
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update credits" ON public.credit_balances
  FOR UPDATE USING (true);

-- Purchase policies
CREATE POLICY "Users view own purchases" ON public.credit_purchases
  FOR SELECT USING (
    business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
    OR business_id IN (SELECT business_id FROM public.business_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Service insert purchases" ON public.credit_purchases
  FOR INSERT WITH CHECK (true);

-- Abuse policies
CREATE POLICY "Service manage abuse" ON public.credit_abuse_log
  FOR ALL USING (true);

-- Admin policies
CREATE POLICY "Admins view all credits" ON public.credit_balances
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "Admins view all purchases" ON public.credit_purchases
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Add ai_provider to businesses table
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS
  ai_provider JSONB DEFAULT '{"provider": "bossboard", "keys": {}}'::jsonb;
