-- Environment Hub D1 Database Schema
-- Initialized: 2026-01-03

-- Main environment_hub table
-- Contains all environment variables, secrets, and bindings
CREATE TABLE IF NOT EXISTS environment_hub (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Notion reference (unique identifier from Notion database)
  notion_id TEXT NOT NULL UNIQUE,

  -- Core fields (matching Notion schema)
  key TEXT NOT NULL,
  description TEXT DEFAULT '',
  value TEXT DEFAULT '',
  value_type TEXT NOT NULL DEFAULT 'String',

  -- JSON arrays stored as TEXT
  environment TEXT NOT NULL DEFAULT '[]', -- JSON: ["dev", "stg", "prd", "All Environments", etc.]
  environment_type TEXT NOT NULL, -- Variable, Secret, Token, API Key, Certificate, etc.
  tenant TEXT NOT NULL DEFAULT '',

  -- Boolean flags (SQLite uses 0/1)
  is_sensitive INTEGER NOT NULL DEFAULT 0,
  required INTEGER NOT NULL DEFAULT 0,

  -- Status and metadata
  status TEXT NOT NULL DEFAULT 'Active',
  service_component TEXT DEFAULT '[]', -- JSON: ["API", "Backend", "Infrastructure", etc.]
  reference TEXT DEFAULT '',
  notes TEXT DEFAULT '',

  -- Rotation tracking
  last_updated_rotated TEXT, -- ISO 8601 date
  updated_rotated_by TEXT DEFAULT '',
  rotation_policy TEXT DEFAULT '',

  -- Sync metadata
  last_synced_from_notion TEXT NOT NULL,
  notion_last_edited_time TEXT NOT NULL,

  -- Timestamps
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_environment_hub_key
  ON environment_hub(key);

CREATE INDEX IF NOT EXISTS idx_environment_hub_tenant
  ON environment_hub(tenant);

CREATE INDEX IF NOT EXISTS idx_environment_hub_status
  ON environment_hub(status);

CREATE INDEX IF NOT EXISTS idx_environment_hub_environment_type
  ON environment_hub(environment_type);

CREATE INDEX IF NOT EXISTS idx_environment_hub_is_sensitive
  ON environment_hub(is_sensitive);

CREATE INDEX IF NOT EXISTS idx_environment_hub_notion_id
  ON environment_hub(notion_id);

-- Composite index for common filtering (tenant + environment_type)
CREATE INDEX IF NOT EXISTS idx_environment_hub_tenant_env_type
  ON environment_hub(tenant, environment_type);

-- Index for sync operations (last edited time)
CREATE INDEX IF NOT EXISTS idx_environment_hub_notion_edited
  ON environment_hub(notion_last_edited_time DESC);

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_environment_hub_timestamp
AFTER UPDATE ON environment_hub
BEGIN
  UPDATE environment_hub
  SET updated_at = datetime('now')
  WHERE id = NEW.id;
END;

-- View: Environment Variables (non-sensitive configs)
CREATE VIEW IF NOT EXISTS environment_variables AS
SELECT
  id,
  key,
  value,
  value_type,
  environment,
  environment_type,
  tenant,
  required,
  status,
  service_component,
  reference,
  notes,
  updated_at
FROM environment_hub
WHERE is_sensitive = 0
  AND status = 'Active'
ORDER BY key ASC;

-- View: Environment Secrets (sensitive credentials, values masked)
CREATE VIEW IF NOT EXISTS environment_secrets AS
SELECT
  id,
  key,
  '***MASKED***' as value,
  value_type,
  environment,
  environment_type,
  tenant,
  required,
  status,
  reference,
  last_updated_rotated,
  rotation_policy,
  updated_rotated_by,
  updated_at
FROM environment_hub
WHERE is_sensitive = 1
  AND status = 'Active'
ORDER BY key ASC;

-- View: Environment Bindings (Cloudflare Worker bindings)
CREATE VIEW IF NOT EXISTS environment_bindings AS
SELECT
  id,
  key,
  value,
  environment,
  environment_type,
  tenant,
  service_component,
  reference,
  notes,
  updated_at
FROM environment_hub
WHERE (
    environment_type = 'Binding'
    OR value_type = 'Connection String'
  )
  AND status = 'Active'
ORDER BY key ASC;

-- Sync log table
-- Tracks all synchronization operations between Notion and D1
CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Sync metadata
  sync_type TEXT NOT NULL, -- 'scheduled', 'manual', 'webhook'
  direction TEXT NOT NULL, -- 'notion_to_d1', 'd1_to_notion', 'bidirectional'
  status TEXT NOT NULL DEFAULT 'started', -- 'started', 'completed', 'failed', 'partial'

  -- Statistics
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_deleted INTEGER DEFAULT 0,
  conflicts_detected INTEGER DEFAULT 0,
  conflicts_resolved INTEGER DEFAULT 0,

  -- Error tracking
  error_message TEXT,

  -- Timing
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  duration_ms INTEGER,

  -- Additional context (JSON)
  metadata TEXT DEFAULT '{}'
);

-- Indexes for sync_log queries
CREATE INDEX IF NOT EXISTS idx_sync_log_started_at
  ON sync_log(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_log_status
  ON sync_log(status);

CREATE INDEX IF NOT EXISTS idx_sync_log_type
  ON sync_log(sync_type);

-- Insert initial metadata row to track schema version
INSERT OR IGNORE INTO sync_log (
  sync_type,
  direction,
  status,
  records_processed,
  metadata
) VALUES (
  'manual',
  'notion_to_d1',
  'completed',
  0,
  '{"schema_version": "1.0.0", "initialized_at": "' || datetime('now') || '", "purpose": "initial_setup"}'
);
