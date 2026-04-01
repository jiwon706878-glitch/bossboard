ALTER TABLE profiles ADD COLUMN IF NOT EXISTS external_api_keys JSONB DEFAULT '{}';
