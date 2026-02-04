-- LLM-top Settings Table
-- Run this in Supabase SQL Editor

-- Create table for storing user settings
CREATE TABLE IF NOT EXISTS llm_top_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  settings_type TEXT NOT NULL CHECK (settings_type IN ('prompts', 'patterns', 'agent_configs', 'synthesis', 'all')),
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint for user_id + settings_type
  CONSTRAINT unique_user_settings UNIQUE (user_id, settings_type)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_llm_top_settings_user_id ON llm_top_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_llm_top_settings_type ON llm_top_settings(settings_type);

-- Enable Row Level Security
ALTER TABLE llm_top_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own settings
CREATE POLICY "Users can read own settings" ON llm_top_settings
  FOR SELECT USING (true);  -- For now, allow all reads (no auth)

-- Policy: Users can insert their own settings
CREATE POLICY "Users can insert own settings" ON llm_top_settings
  FOR INSERT WITH CHECK (true);  -- For now, allow all inserts

-- Policy: Users can update their own settings
CREATE POLICY "Users can update own settings" ON llm_top_settings
  FOR UPDATE USING (true);  -- For now, allow all updates

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_llm_top_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_llm_top_settings_updated_at ON llm_top_settings;
CREATE TRIGGER trigger_update_llm_top_settings_updated_at
  BEFORE UPDATE ON llm_top_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_llm_top_settings_updated_at();

-- Create table for analysis sessions (optional, for history)
CREATE TABLE IF NOT EXISTS llm_top_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  task TEXT NOT NULL,
  task_type TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}',
  analyses JSONB NOT NULL DEFAULT '[]',
  synthesis JSONB,
  metrics JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for sessions
CREATE INDEX IF NOT EXISTS idx_llm_top_sessions_user_id ON llm_top_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_llm_top_sessions_created_at ON llm_top_sessions(created_at DESC);

-- Enable RLS on sessions
ALTER TABLE llm_top_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for sessions (allow all for now)
CREATE POLICY "Users can read sessions" ON llm_top_sessions FOR SELECT USING (true);
CREATE POLICY "Users can insert sessions" ON llm_top_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update sessions" ON llm_top_sessions FOR UPDATE USING (true);

-- Trigger for sessions updated_at
CREATE OR REPLACE FUNCTION update_llm_top_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_llm_top_sessions_updated_at ON llm_top_sessions;
CREATE TRIGGER trigger_update_llm_top_sessions_updated_at
  BEFORE UPDATE ON llm_top_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_llm_top_sessions_updated_at();

-- Comments
COMMENT ON TABLE llm_top_settings IS 'User settings for LLM-top (prompts, patterns, configs)';
COMMENT ON TABLE llm_top_sessions IS 'Analysis session history';
