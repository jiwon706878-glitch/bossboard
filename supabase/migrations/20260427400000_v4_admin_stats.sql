-- V4 Group 4.1: admin stats RPC + feedback + error_logs tables.
-- Restricted to the email allow-list inside the RPC body — a service
-- role caller can also bypass.

CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature', 'question', 'other')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('critical', 'normal', 'low')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'wont_fix')),
  subject TEXT NOT NULL,
  body TEXT,
  os TEXT,
  app_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_feedback_priority ON feedback(priority, status);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at DESC);

CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('js_error', 'panic', 'api_error')),
  message TEXT NOT NULL,
  stack TEXT,
  os TEXT,
  app_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(type);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert their own feedback" ON feedback;
CREATE POLICY "Users insert their own feedback" ON feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users see their own feedback" ON feedback;
CREATE POLICY "Users see their own feedback" ON feedback
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access on feedback" ON feedback;
CREATE POLICY "Service role full access on feedback" ON feedback
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users insert their own errors" ON error_logs;
CREATE POLICY "Users insert their own errors" ON error_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Service role reads errors" ON error_logs;
CREATE POLICY "Service role reads errors" ON error_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION admin_get_stats()
RETURNS JSONB AS $$
DECLARE
  v_user_email TEXT;
  v_result JSONB;
BEGIN
  -- Admin allow-list. Add additional emails here as the team grows.
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  IF v_user_email IS NULL OR v_user_email NOT IN ('jay@mybossboard.com', 'jiwon706878@gmail.com') THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  v_result := jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM users),
    'active_today', (
      SELECT COUNT(DISTINCT user_id) FROM devices
      WHERE last_seen > NOW() - INTERVAL '24 hours'
    ),
    'active_this_week', (
      SELECT COUNT(DISTINCT user_id) FROM devices
      WHERE last_seen > NOW() - INTERVAL '7 days'
    ),
    'by_os', COALESCE((
      SELECT jsonb_object_agg(os, count) FROM (
        SELECT os, COUNT(*) as count FROM devices WHERE NOT revoked GROUP BY os
      ) t
    ), '{}'::jsonb),
    'active_by_os', COALESCE((
      SELECT jsonb_object_agg(os, count) FROM (
        SELECT os, COUNT(*) as count FROM devices
        WHERE NOT revoked AND last_seen > NOW() - INTERVAL '24 hours'
        GROUP BY os
      ) t
    ), '{}'::jsonb),
    'by_plan', COALESCE((
      SELECT jsonb_object_agg(plan, count) FROM (
        SELECT COALESCE(plan, 'free') AS plan, COUNT(*) AS count FROM users GROUP BY plan
      ) t
    ), '{}'::jsonb),
    'by_locale', COALESCE((
      SELECT jsonb_object_agg(locale, count) FROM (
        SELECT COALESCE(locale, 'unknown') AS locale, COUNT(*) AS count
        FROM devices WHERE NOT revoked GROUP BY locale
      ) t
    ), '{}'::jsonb),
    'mac_waitlist_count', COALESCE((SELECT COUNT(*) FROM mac_waitlist), 0),
    'first_hundred_count', COALESCE(
      (SELECT count FROM first_hundred_counter LIMIT 1), 0),
    'feedback_pending', COALESCE(
      (SELECT COUNT(*) FROM feedback WHERE status = 'pending'), 0),
    'feedback_critical', COALESCE(
      (SELECT COUNT(*) FROM feedback
       WHERE priority = 'critical' AND status IN ('pending', 'in_progress')), 0),
    'errors_24h', COALESCE(
      (SELECT COUNT(*) FROM error_logs
       WHERE created_at > NOW() - INTERVAL '24 hours'), 0),
    'panics_24h', COALESCE(
      (SELECT COUNT(*) FROM error_logs
       WHERE type = 'panic' AND created_at > NOW() - INTERVAL '24 hours'), 0)
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_list_feedback(
  p_priority TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50
)
RETURNS JSONB AS $$
DECLARE
  v_user_email TEXT;
BEGIN
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  IF v_user_email IS NULL OR v_user_email NOT IN ('jay@mybossboard.com', 'jiwon706878@gmail.com') THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', id,
      'type', type,
      'priority', priority,
      'status', status,
      'subject', subject,
      'body', body,
      'os', os,
      'app_version', app_version,
      'created_at', created_at,
      'user_email', (SELECT email FROM auth.users WHERE id = feedback.user_id)
    ))
    FROM (
      SELECT * FROM feedback
      WHERE p_priority IS NULL OR priority = p_priority
      ORDER BY
        CASE priority WHEN 'critical' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
        created_at DESC
      LIMIT p_limit
    ) t
  ), '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
