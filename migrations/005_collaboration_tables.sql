-- Migration 005: Collaboration tables for multi-user editing
-- Enables presence tracking, edit locking, and activity feed

-- User sessions table (lightweight, browser-based)
CREATE TABLE IF NOT EXISTS llm_top_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'default',
  display_name TEXT NOT NULL,
  avatar_color TEXT DEFAULT '#8B5CF6', -- violet by default
  browser_id TEXT NOT NULL, -- unique per browser

  -- Status
  status TEXT DEFAULT 'online', -- online, away, offline
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  current_tab TEXT, -- prompts, experiments, pipeline, etc.
  current_resource_id TEXT, -- specific resource being viewed/edited

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, browser_id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON llm_top_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_resource ON llm_top_sessions(current_resource_id);

-- Edit locks table (prevents concurrent editing conflicts)
CREATE TABLE IF NOT EXISTS llm_top_edit_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  session_id UUID REFERENCES llm_top_sessions(id) ON DELETE CASCADE,

  -- What's being edited
  resource_type TEXT NOT NULL, -- prompt, config, pipeline, experiment
  resource_id TEXT NOT NULL,

  -- Lock info
  locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '5 minutes'),

  UNIQUE(resource_type, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_locks_resource ON llm_top_edit_locks(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_locks_expiry ON llm_top_edit_locks(expires_at);

-- Activity feed table (tracks all changes)
CREATE TABLE IF NOT EXISTS llm_top_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'default',
  session_id UUID REFERENCES llm_top_sessions(id) ON DELETE SET NULL,

  -- What happened
  action TEXT NOT NULL, -- created, updated, deleted, tested, exported, imported, etc.
  resource_type TEXT NOT NULL, -- prompt, config, pipeline, experiment, version, etc.
  resource_id TEXT,
  resource_name TEXT, -- human-readable name

  -- Details
  details JSONB, -- additional context (e.g., what changed)

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_user ON llm_top_activity(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_resource ON llm_top_activity(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_activity_recent ON llm_top_activity(created_at DESC);

-- Function to auto-expire locks
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS void AS $$
BEGIN
  DELETE FROM llm_top_edit_locks WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to update session last_seen
CREATE OR REPLACE FUNCTION update_session_heartbeat(p_session_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE llm_top_sessions
  SET last_seen_at = NOW(), status = 'online'
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark inactive sessions as away/offline
CREATE OR REPLACE FUNCTION mark_inactive_sessions()
RETURNS void AS $$
BEGIN
  -- Mark as away if no activity for 2 minutes
  UPDATE llm_top_sessions
  SET status = 'away'
  WHERE status = 'online' AND last_seen_at < NOW() - INTERVAL '2 minutes';

  -- Mark as offline if no activity for 10 minutes
  UPDATE llm_top_sessions
  SET status = 'offline'
  WHERE status IN ('online', 'away') AND last_seen_at < NOW() - INTERVAL '10 minutes';
END;
$$ LANGUAGE plpgsql;

-- View for active users (online or away)
CREATE OR REPLACE VIEW llm_top_active_users AS
SELECT
  s.id as session_id,
  s.user_id,
  s.display_name,
  s.avatar_color,
  s.status,
  s.current_tab,
  s.current_resource_id,
  s.last_seen_at,
  l.resource_type as editing_resource_type,
  l.resource_id as editing_resource_id
FROM llm_top_sessions s
LEFT JOIN llm_top_edit_locks l ON s.id = l.session_id
WHERE s.status IN ('online', 'away')
  AND s.last_seen_at > NOW() - INTERVAL '15 minutes';

-- Sample activity entries for demo
INSERT INTO llm_top_activity (user_id, action, resource_type, resource_name, details) VALUES
  ('default', 'updated', 'prompt', 'ChatGPT System Prompt', '{"field": "content", "agent_id": "chatgpt"}'),
  ('default', 'created', 'experiment', 'Prompt Clarity Test', '{"agent_id": "chatgpt", "variants": 2}'),
  ('default', 'exported', 'config', 'Full Configuration', '{"format": "json", "type": "full"}'),
  ('default', 'tested', 'prompt', 'Claude Critique Prompt', '{"tokens": 1250, "latency_ms": 2300}')
ON CONFLICT DO NOTHING;

-- Comments
COMMENT ON TABLE llm_top_sessions IS 'Active user sessions for presence tracking';
COMMENT ON TABLE llm_top_edit_locks IS 'Edit locks to prevent concurrent editing conflicts';
COMMENT ON TABLE llm_top_activity IS 'Activity feed for all user actions';
