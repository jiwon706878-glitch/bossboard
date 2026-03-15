-- =============================================================================
-- Todos, Work Log, and Checklist Scheduling
-- =============================================================================

-- 1. Todos table
CREATE TABLE IF NOT EXISTS public.todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  due_date date,
  priority text DEFAULT 'normal', -- low, normal, high, urgent
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own todos" ON public.todos FOR SELECT
  USING (user_id = auth.uid() OR business_id IN (SELECT public.get_user_workspace_ids()));
CREATE POLICY "Users can create todos" ON public.todos FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own todos" ON public.todos FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "Users can delete own todos" ON public.todos FOR DELETE
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_todos_user ON public.todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_business ON public.todos(business_id);
CREATE INDEX IF NOT EXISTS idx_todos_completed ON public.todos(completed);

-- 2. Work log table
CREATE TABLE IF NOT EXISTS public.work_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL, -- todo_completed, checklist_completed, sop_read, sop_signed, note_created
  title text NOT NULL,
  target_id uuid, -- references the todo/checklist/sop id
  target_type text, -- todo, checklist, sop, note
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.work_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view work log" ON public.work_log FOR SELECT
  USING (business_id IN (SELECT public.get_user_workspace_ids()) OR user_id = auth.uid());
CREATE POLICY "Users can insert work log" ON public.work_log FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_work_log_business ON public.work_log(business_id);
CREATE INDEX IF NOT EXISTS idx_work_log_user ON public.work_log(user_id);
CREATE INDEX IF NOT EXISTS idx_work_log_created ON public.work_log(created_at);

-- 3. Checklist scheduling: add last_generated_at to track recurring instances
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='checklists' AND column_name='last_generated_at') THEN
    ALTER TABLE public.checklists ADD COLUMN last_generated_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='checklists' AND column_name='is_template') THEN
    ALTER TABLE public.checklists ADD COLUMN is_template boolean DEFAULT false;
  END IF;
END $$;
