-- V4 Group 1.1: devices table + register/revoke RPCs + plan-limit helper
-- Run this from the Supabase SQL editor (or via `supabase db push`).
-- Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT,
  os TEXT NOT NULL CHECK (os IN ('windows', 'mac', 'linux', 'unknown')),
  os_version TEXT,
  app_version TEXT NOT NULL,
  locale TEXT,
  timezone TEXT,
  hostname TEXT,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMPTZ,
  UNIQUE(user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id) WHERE NOT revoked;
CREATE INDEX IF NOT EXISTS idx_devices_os ON devices(os);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen DESC);

CREATE OR REPLACE FUNCTION get_plan_device_limit(p_plan TEXT) RETURNS INT AS $$
BEGIN
  RETURN CASE p_plan
    WHEN 'free' THEN 1
    WHEN 'starter' THEN 2
    WHEN 'pro' THEN 99
    WHEN 'business' THEN 99
    ELSE 1
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION register_device(
  p_device_id TEXT,
  p_device_name TEXT,
  p_os TEXT,
  p_os_version TEXT,
  p_app_version TEXT,
  p_locale TEXT,
  p_timezone TEXT,
  p_hostname TEXT
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_plan TEXT;
  v_limit INT;
  v_current_count INT;
  v_existing devices%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  SELECT plan INTO v_plan FROM users WHERE id = v_user_id;
  IF v_plan IS NULL THEN
    v_plan := 'free';
  END IF;

  v_limit := get_plan_device_limit(v_plan);

  SELECT * INTO v_existing
  FROM devices
  WHERE user_id = v_user_id AND device_id = p_device_id AND NOT revoked;

  IF FOUND THEN
    UPDATE devices
    SET last_seen = NOW(),
        os = p_os, os_version = p_os_version,
        app_version = p_app_version,
        locale = p_locale, timezone = p_timezone,
        hostname = p_hostname,
        device_name = COALESCE(p_device_name, device_name)
    WHERE id = v_existing.id;
    RETURN jsonb_build_object('success', true, 'is_new', false, 'plan', v_plan);
  END IF;

  SELECT COUNT(*) INTO v_current_count
  FROM devices WHERE user_id = v_user_id AND NOT revoked;

  IF v_current_count >= v_limit THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'device_limit_reached',
      'current_count', v_current_count,
      'limit', v_limit,
      'plan', v_plan,
      'devices', (
        SELECT jsonb_agg(jsonb_build_object(
          'id', id,
          'device_id', device_id,
          'device_name', COALESCE(device_name, hostname, os),
          'os', os,
          'last_seen', last_seen
        )) FROM devices WHERE user_id = v_user_id AND NOT revoked
      )
    );
  END IF;

  INSERT INTO devices (user_id, device_id, device_name, os, os_version, app_version, locale, timezone, hostname)
  VALUES (v_user_id, p_device_id, p_device_name, p_os, p_os_version, p_app_version, p_locale, p_timezone, p_hostname);

  RETURN jsonb_build_object('success', true, 'is_new', true, 'plan', v_plan);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION revoke_device(p_device_id TEXT) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  UPDATE devices
  SET revoked = TRUE, revoked_at = NOW()
  WHERE user_id = v_user_id AND device_id = p_device_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own devices" ON devices;
CREATE POLICY "Users see own devices" ON devices
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access" ON devices;
CREATE POLICY "Service role full access" ON devices
  FOR ALL USING (auth.role() = 'service_role');
