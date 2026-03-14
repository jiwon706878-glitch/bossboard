-- Add missing columns to checklists table for status tracking, due dates, and ownership
-- These columns extend the base checklists table to support the full checklist workflow

ALTER TABLE public.checklists
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Rename workspace_id to business_id if it exists as workspace_id
-- (The app uses business_id consistently)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'checklists' AND column_name = 'workspace_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'checklists' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE public.checklists RENAME COLUMN workspace_id TO business_id;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_checklists_status ON public.checklists(status);
CREATE INDEX IF NOT EXISTS idx_checklists_due_date ON public.checklists(due_date);
