-- Add missing columns to checklists table for status tracking, due dates, and ownership
-- These columns extend the base checklists table to support the full checklist workflow

ALTER TABLE public.checklists
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_checklists_status ON public.checklists(status);
CREATE INDEX IF NOT EXISTS idx_checklists_due_date ON public.checklists(due_date);
