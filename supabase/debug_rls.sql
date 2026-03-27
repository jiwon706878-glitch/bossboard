-- =============================================================================
-- BossBoard RLS Debug Query
-- Run this in Supabase SQL Editor to diagnose SOP insert failures
-- =============================================================================

-- 1. All RLS policies on the sops table
SELECT
  policyname AS policy_name,
  cmd AS operation,
  permissive,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'sops'
ORDER BY cmd;

-- 2. Current user's businesses (visible through RLS)
SELECT id, user_id, name, type, created_at
FROM businesses
LIMIT 5;

-- 3. Do the helper functions exist?
SELECT routine_name, routine_schema, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_user_workspace_ids', 'user_is_workspace_admin');

-- 4. What does get_user_workspace_ids() actually return for you?
-- (If the function doesn't exist, this will error — that's your answer)
SELECT * FROM public.get_user_workspace_ids();

-- 5. Sops table columns — does business_id exist?
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'sops'
ORDER BY ordinal_position;

-- 6. Checklists table columns — does business_id exist?
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'checklists'
ORDER BY ordinal_position;

-- 7. Is RLS actually enabled on the sops table?
SELECT
  relname AS table_name,
  relrowsecurity AS rls_enabled,
  relforcerowsecurity AS rls_forced
FROM pg_class
WHERE relname IN ('sops', 'checklists', 'businesses');

-- 8. Quick sanity check: does the current user's business ID
--    match what get_user_workspace_ids() returns?
SELECT
  b.id AS business_id,
  b.name AS business_name,
  b.id IN (SELECT public.get_user_workspace_ids()) AS passes_rls_check
FROM businesses b
LIMIT 5;
