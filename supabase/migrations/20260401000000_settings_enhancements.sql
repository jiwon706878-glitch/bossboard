-- Add language and timezone to businesses
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS timezone TEXT;

-- Add notification settings to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{}';

-- Add developer mode to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS developer_mode BOOLEAN DEFAULT false;

-- Add category to feedback
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'feedback';
