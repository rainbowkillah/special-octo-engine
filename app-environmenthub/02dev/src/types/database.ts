// D1 database record types matching schema
export interface EnvironmentHubRecord {
  id: number;
  notion_id: string;

  // Core fields
  key: string;
  description: string;
  value: string;
  value_type: string;

  // JSON arrays (stored as TEXT)
  environment: string; // JSON: ["dev", "stg", "prd"]
  environment_type: string;
  tenant: string;

  // Boolean flags (0/1)
  is_sensitive: number;
  required: number;

  // Metadata
  status: string;
  service_component: string; // JSON: ["API", "Backend"]
  reference: string;
  notes: string;

  // Rotation
  last_updated_rotated: string | null;
  updated_rotated_by: string;
  rotation_policy: string;

  // Sync metadata
  last_synced_from_notion: string;
  notion_last_edited_time: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface SyncLogRecord {
  id: number;
  sync_type: 'scheduled' | 'manual' | 'webhook';
  direction: 'notion_to_d1' | 'd1_to_notion' | 'bidirectional';
  status: 'started' | 'completed' | 'failed' | 'partial';

  records_processed: number;
  records_created: number;
  records_updated: number;
  records_deleted: number;
  conflicts_detected: number;
  conflicts_resolved: number;

  error_message: string | null;

  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;

  metadata: string; // JSON
}
