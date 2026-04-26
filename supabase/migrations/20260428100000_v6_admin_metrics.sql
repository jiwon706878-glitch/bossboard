-- V6 Group 6: admin_get_metrics RPC for the /admin dashboard.
-- Returns conversion rate, D7/D30 retention, and beta-discounted MRR
-- estimate. Same admin allow-list as admin_get_stats.

CREATE OR REPLACE FUNCTION admin_get_metrics()
RETURNS JSONB AS $$
DECLARE
  v_user_email TEXT;
  v_total_users INT;
  v_paying_users INT;
  v_d7_eligible INT;
  v_d7_active INT;
  v_d30_eligible INT;
  v_d30_active INT;
BEGIN
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  IF v_user_email IS NULL OR v_user_email NOT IN ('jay@mybossboard.com', 'jiwon706878@gmail.com') THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  SELECT COUNT(*) INTO v_total_users FROM users;
  SELECT COUNT(*) INTO v_paying_users
    FROM users WHERE COALESCE(plan, 'free') != 'free';

  SELECT COUNT(*) INTO v_d7_eligible
    FROM users WHERE created_at < NOW() - INTERVAL '7 days';
  SELECT COUNT(DISTINCT d.user_id) INTO v_d7_active
    FROM devices d
    JOIN users u ON u.id = d.user_id
    WHERE u.created_at < NOW() - INTERVAL '7 days'
      AND d.last_seen > NOW() - INTERVAL '7 days'
      AND NOT d.revoked;

  SELECT COUNT(*) INTO v_d30_eligible
    FROM users WHERE created_at < NOW() - INTERVAL '30 days';
  SELECT COUNT(DISTINCT d.user_id) INTO v_d30_active
    FROM devices d
    JOIN users u ON u.id = d.user_id
    WHERE u.created_at < NOW() - INTERVAL '30 days'
      AND d.last_seen > NOW() - INTERVAL '30 days'
      AND NOT d.revoked;

  RETURN jsonb_build_object(
    'total_users', v_total_users,
    'paying_users', v_paying_users,
    'conversion_rate_pct',
      CASE WHEN v_total_users > 0
        THEN ROUND(100.0 * v_paying_users / v_total_users, 2)
        ELSE 0 END,
    'd7_retention_pct',
      CASE WHEN v_d7_eligible > 0
        THEN ROUND(100.0 * v_d7_active / v_d7_eligible, 2)
        ELSE 0 END,
    'd7_eligible', v_d7_eligible,
    'd7_active', v_d7_active,
    'd30_retention_pct',
      CASE WHEN v_d30_eligible > 0
        THEN ROUND(100.0 * v_d30_active / v_d30_eligible, 2)
        ELSE 0 END,
    'd30_eligible', v_d30_eligible,
    'd30_active', v_d30_active,
    'mrr_estimate_usd',
      COALESCE((
        SELECT ROUND(SUM(CASE COALESCE(plan, 'free')
          WHEN 'starter' THEN 13.86
          WHEN 'pro' THEN 34.65
          WHEN 'business' THEN 90.93
          ELSE 0 END)::numeric, 2)
        FROM users
      ), 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
