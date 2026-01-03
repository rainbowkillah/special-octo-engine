// API endpoint request/response types
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface ListEntriesQuery {
  tenant?: string;
  environment?: string;
  environmentType?: string;
  isSensitive?: boolean;
  status?: string;
  search?: string;

  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SyncRequest {
  direction: 'notion_to_d1' | 'd1_to_notion' | 'bidirectional';
  dryRun?: boolean;
}

export interface SyncResponse {
  success: boolean;
  syncLogId: number;
  stats: {
    processed: number;
    created: number;
    updated: number;
    deleted: number;
    conflicts: number;
  };
  duration_ms: number;
}
