# Phase 2 Implementation Plan: Environment Hub Worker

**Created:** 2026-01-03
**Status:** Ready to Implement
**Branch:** `environmenthub`
**Prerequisites:** Phase 1 Complete ✅

---

## Overview

Phase 2 builds the Cloudflare Worker application on top of the Phase 1 infrastructure (D1 databases, KV namespaces, configuration). This phase implements the core synchronization engine, API endpoints, and dashboard UI for the Environment Hub.

**Goal:** Create a functional Cloudflare Worker that syncs environment variables, secrets, and bindings between Notion and D1, with a web dashboard for viewing and managing configurations.

---

## Architecture Recap

```
┌─────────────────┐
│  Notion DB      │  (Source of Truth)
│  2dddb3b7...    │
└────────┬────────┘
         │ Notion API
         ↓
┌─────────────────────────────────────┐
│  Cloudflare Worker                  │
│  ┌─────────────┐  ┌──────────────┐ │
│  │ Sync Engine │→ │ D1 Database  │ │
│  └─────────────┘  └──────────────┘ │
│  ┌─────────────┐  ┌──────────────┐ │
│  │ API Routes  │→ │ KV Cache     │ │
│  └─────────────┘  └──────────────┘ │
│  ┌─────────────┐                   │
│  │ Dashboard   │                   │
│  └─────────────┘                   │
└─────────────────────────────────────┘
         │
         ↓
    End Users
```

---

## Schema Mapping Analysis ✅

### Notion CSV → D1 Column Mapping

All 17 Notion database properties map perfectly to D1 columns:

| Notion Property | D1 Column | Transformation Required |
|----------------|-----------|------------------------|
| Key | `key` | Direct |
| Description | `description` | Direct |
| Environment | `environment` | Parse comma-separated → JSON array |
| Environment Type | `environment_type` | Direct |
| Is Sensitive | `is_sensitive` | Convert "Yes"/"No" → 0/1 |
| Last Updated/Rotated | `last_updated_rotated` | Parse date → ISO 8601 |
| Notes | `notes` | Direct |
| Reference | `reference` | Direct |
| Required | `required` | Convert "Yes"/"No" → 0/1 |
| Rotation Policy | `rotation_policy` | Direct |
| Service/Component | `service_component` | Parse comma-separated → JSON array |
| Status | `status` | Direct |
| Tenant | `tenant` | Direct |
| Updated/Rotated By | `updated_rotated_by` | Direct |
| Value | `value` | Direct |
| Value Type | `value_type` | Direct |
| id | `notion_id` | **Use Notion page UUID from API** |

### Additional Fields (D1 Only)

- `id` - Auto-increment primary key
- `last_synced_from_notion` - Sync timestamp
- `notion_last_edited_time` - From Notion API metadata
- `created_at` - Database trigger
- `updated_at` - Database trigger

---

## Implementation Phases

### Phase 2.1: TypeScript Types & Interfaces ⏭️

**Directory:** `app-environmenthub/02dev/src/types/`

#### Files to Create:

**1. `types/env.ts`** - Cloudflare Worker Environment
```typescript
// Bindings and environment variables available to the worker
export interface Env {
  // D1 Database binding
  DB: D1Database;

  // KV Cache binding
  CACHE: KVNamespace;

  // Secrets (set via wrangler secret put)
  NOTION_API_KEY: string;
  NOTION_DATABASE_ID: string;

  // Optional: Cloudflare Access
  CF_ACCESS_TEAM_NAME?: string;
  CF_ACCESS_AUD?: string;

  // Environment name
  ENV: 'dev' | 'stg' | 'prd';
}
```

**2. `types/notion.ts`** - Notion API Types
```typescript
// Notion API request/response types
export interface NotionPage {
  id: string; // UUID
  created_time: string; // ISO 8601
  last_edited_time: string; // ISO 8601
  properties: NotionProperties;
  // ... other Notion metadata
}

export interface NotionProperties {
  Key: { title: Array<{ text: { content: string } }> };
  Description: { rich_text: Array<{ text: { content: string } }> };
  Environment: { multi_select: Array<{ name: string }> };
  'Environment Type': { select: { name: string } };
  'Is Sensitive': { checkbox: boolean };
  'Last Updated/Rotated': { date: { start: string } | null };
  Notes: { rich_text: Array<{ text: { content: string } }> };
  Reference: { rich_text: Array<{ text: { content: string } }> };
  Required: { checkbox: boolean };
  'Rotation Policy': { rich_text: Array<{ text: { content: string } }> };
  'Service/Component': { multi_select: Array<{ name: string }> };
  Status: { select: { name: string } };
  Tenant: { select: { name: string } | null };
  'Updated/Rotated By': { people: Array<{ name: string }> };
  Value: { rich_text: Array<{ text: { content: string } }> };
  'Value Type': { select: { name: string } };
}

export interface NotionDatabaseQueryResponse {
  results: NotionPage[];
  next_cursor: string | null;
  has_more: boolean;
}
```

**3. `types/database.ts`** - D1 Schema Types
```typescript
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
```

**4. `types/api.ts`** - API Request/Response Types
```typescript
// API endpoint types
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
```

**Effort:** 2-3 hours
**Dependencies:** None
**Testing:** TypeScript compilation

---

### Phase 2.2: Notion API Client ⏭️

**Directory:** `app-environmenthub/02dev/src/lib/notion/`

#### Files to Create:

**1. `lib/notion/client.ts`** - Notion API Wrapper
```typescript
import type { Env } from '../../types/env';
import type { NotionPage, NotionDatabaseQueryResponse } from '../../types/notion';

export class NotionClient {
  private apiKey: string;
  private databaseId: string;
  private baseUrl = 'https://api.notion.com/v1';

  constructor(env: Env) {
    this.apiKey = env.NOTION_API_KEY;
    this.databaseId = env.NOTION_DATABASE_ID;
  }

  /**
   * Query the Notion database with pagination
   * Handles automatic pagination to fetch all pages
   */
  async queryDatabase(cursor?: string): Promise<NotionDatabaseQueryResponse> {
    const response = await fetch(`${this.baseUrl}/databases/${this.databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        start_cursor: cursor,
        page_size: 100, // Max per request
      }),
    });

    if (!response.ok) {
      throw new Error(`Notion API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get all pages from the database (handles pagination automatically)
   */
  async getAllPages(): Promise<NotionPage[]> {
    const pages: NotionPage[] = [];
    let cursor: string | null = null;

    do {
      const response = await this.queryDatabase(cursor);
      pages.push(...response.results);
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    return pages;
  }

  /**
   * Get a single page by ID
   */
  async getPage(pageId: string): Promise<NotionPage> {
    const response = await fetch(`${this.baseUrl}/pages/${pageId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Notion-Version': '2022-06-28',
      },
    });

    if (!response.ok) {
      throw new Error(`Notion API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update a page's properties
   */
  async updatePage(pageId: string, properties: Record<string, unknown>): Promise<NotionPage> {
    const response = await fetch(`${this.baseUrl}/pages/${pageId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties }),
    });

    if (!response.ok) {
      throw new Error(`Notion API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}
```

**2. `lib/notion/transformer.ts`** - Transform Notion → D1
```typescript
import type { NotionPage } from '../../types/notion';
import type { EnvironmentHubRecord } from '../../types/database';

export class NotionTransformer {
  /**
   * Transform a Notion page to a D1 database record
   */
  static toD1Record(page: NotionPage): Omit<EnvironmentHubRecord, 'id' | 'created_at' | 'updated_at'> {
    const props = page.properties;

    return {
      notion_id: page.id,

      // Core fields
      key: this.extractTitle(props.Key),
      description: this.extractRichText(props.Description),
      value: this.extractRichText(props.Value),
      value_type: this.extractSelect(props['Value Type']) || 'String',

      // Arrays (convert to JSON)
      environment: JSON.stringify(this.extractMultiSelect(props.Environment)),
      environment_type: this.extractSelect(props['Environment Type']) || 'Variable',
      tenant: this.extractSelect(props.Tenant) || '',

      // Booleans (convert to 0/1)
      is_sensitive: this.extractCheckbox(props['Is Sensitive']) ? 1 : 0,
      required: this.extractCheckbox(props.Required) ? 1 : 0,

      // Metadata
      status: this.extractSelect(props.Status) || 'Active',
      service_component: JSON.stringify(this.extractMultiSelect(props['Service/Component'])),
      reference: this.extractRichText(props.Reference),
      notes: this.extractRichText(props.Notes),

      // Rotation
      last_updated_rotated: this.extractDate(props['Last Updated/Rotated']),
      updated_rotated_by: this.extractPeople(props['Updated/Rotated By']),
      rotation_policy: this.extractRichText(props['Rotation Policy']),

      // Sync metadata
      last_synced_from_notion: new Date().toISOString(),
      notion_last_edited_time: page.last_edited_time,
    };
  }

  // Helper methods to extract Notion property values
  private static extractTitle(prop: any): string {
    return prop?.title?.[0]?.text?.content || '';
  }

  private static extractRichText(prop: any): string {
    return prop?.rich_text?.map((rt: any) => rt.text.content).join('') || '';
  }

  private static extractSelect(prop: any): string | null {
    return prop?.select?.name || null;
  }

  private static extractMultiSelect(prop: any): string[] {
    return prop?.multi_select?.map((item: any) => item.name) || [];
  }

  private static extractCheckbox(prop: any): boolean {
    return prop?.checkbox || false;
  }

  private static extractDate(prop: any): string | null {
    return prop?.date?.start || null;
  }

  private static extractPeople(prop: any): string {
    return prop?.people?.map((p: any) => p.name).join(', ') || '';
  }
}
```

**Effort:** 4-5 hours
**Dependencies:** Phase 2.1 (types)
**Testing:** Unit tests with mock Notion API responses

---

### Phase 2.3: D1 Database Client ⏭️

**Directory:** `app-environmenthub/02dev/src/lib/database/`

#### Files to Create:

**1. `lib/database/client.ts`** - D1 Query Wrapper
```typescript
import type { D1Database } from '@cloudflare/workers-types';
import type { EnvironmentHubRecord, SyncLogRecord } from '../../types/database';

export class DatabaseClient {
  constructor(private db: D1Database) {}

  // === Environment Hub Records ===

  async getAllEntries(): Promise<EnvironmentHubRecord[]> {
    const result = await this.db.prepare('SELECT * FROM environment_hub ORDER BY key ASC').all();
    return result.results as EnvironmentHubRecord[];
  }

  async getEntryByNotionId(notionId: string): Promise<EnvironmentHubRecord | null> {
    const result = await this.db
      .prepare('SELECT * FROM environment_hub WHERE notion_id = ?')
      .bind(notionId)
      .first();
    return result as EnvironmentHubRecord | null;
  }

  async getEntryById(id: number): Promise<EnvironmentHubRecord | null> {
    const result = await this.db
      .prepare('SELECT * FROM environment_hub WHERE id = ?')
      .bind(id)
      .first();
    return result as EnvironmentHubRecord | null;
  }

  async createEntry(entry: Omit<EnvironmentHubRecord, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const result = await this.db
      .prepare(`
        INSERT INTO environment_hub (
          notion_id, key, description, value, value_type,
          environment, environment_type, tenant,
          is_sensitive, required, status, service_component,
          reference, notes, last_updated_rotated,
          updated_rotated_by, rotation_policy,
          last_synced_from_notion, notion_last_edited_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        entry.notion_id,
        entry.key,
        entry.description,
        entry.value,
        entry.value_type,
        entry.environment,
        entry.environment_type,
        entry.tenant,
        entry.is_sensitive,
        entry.required,
        entry.status,
        entry.service_component,
        entry.reference,
        entry.notes,
        entry.last_updated_rotated,
        entry.updated_rotated_by,
        entry.rotation_policy,
        entry.last_synced_from_notion,
        entry.notion_last_edited_time
      )
      .run();

    return result.meta.last_row_id;
  }

  async updateEntry(
    notionId: string,
    entry: Partial<Omit<EnvironmentHubRecord, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    // Build dynamic UPDATE query based on provided fields
    Object.entries(entry).forEach(([key, value]) => {
      if (key !== 'notion_id') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return;

    values.push(notionId); // For WHERE clause

    await this.db
      .prepare(`UPDATE environment_hub SET ${fields.join(', ')} WHERE notion_id = ?`)
      .bind(...values)
      .run();
  }

  async deleteEntry(notionId: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM environment_hub WHERE notion_id = ?')
      .bind(notionId)
      .run();
  }

  // === Sync Log ===

  async createSyncLog(log: {
    sync_type: string;
    direction: string;
    status: string;
  }): Promise<number> {
    const result = await this.db
      .prepare('INSERT INTO sync_log (sync_type, direction, status) VALUES (?, ?, ?)')
      .bind(log.sync_type, log.direction, log.status)
      .run();

    return result.meta.last_row_id;
  }

  async updateSyncLog(id: number, updates: Partial<SyncLogRecord>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      fields.push(`${key} = ?`);
      values.push(value);
    });

    if (fields.length === 0) return;

    values.push(id);

    await this.db
      .prepare(`UPDATE sync_log SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
  }

  async getRecentSyncs(limit = 10): Promise<SyncLogRecord[]> {
    const result = await this.db
      .prepare('SELECT * FROM sync_log ORDER BY started_at DESC LIMIT ?')
      .bind(limit)
      .all();
    return result.results as SyncLogRecord[];
  }

  // === Filtering and Search ===

  async filterEntries(filters: {
    tenant?: string;
    environment?: string;
    environmentType?: string;
    isSensitive?: boolean;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ entries: EnvironmentHubRecord[]; total: number }> {
    const conditions: string[] = [];
    const values: any[] = [];

    if (filters.tenant) {
      conditions.push('tenant = ?');
      values.push(filters.tenant);
    }

    if (filters.environmentType) {
      conditions.push('environment_type = ?');
      values.push(filters.environmentType);
    }

    if (filters.isSensitive !== undefined) {
      conditions.push('is_sensitive = ?');
      values.push(filters.isSensitive ? 1 : 0);
    }

    if (filters.status) {
      conditions.push('status = ?');
      values.push(filters.status);
    }

    if (filters.search) {
      conditions.push('(key LIKE ? OR description LIKE ? OR notes LIKE ?)');
      const searchPattern = `%${filters.search}%`;
      values.push(searchPattern, searchPattern, searchPattern);
    }

    if (filters.environment) {
      // JSON search (SQLite doesn't have native JSON functions, so use LIKE)
      conditions.push('(environment LIKE ? OR environment LIKE ?)');
      values.push(`%"${filters.environment}"%`, '%"All Environments"%');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await this.db
      .prepare(`SELECT COUNT(*) as count FROM environment_hub ${whereClause}`)
      .bind(...values)
      .first();
    const total = (countResult as any).count;

    // Get entries with pagination
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const entriesResult = await this.db
      .prepare(`
        SELECT * FROM environment_hub
        ${whereClause}
        ORDER BY key ASC
        LIMIT ? OFFSET ?
      `)
      .bind(...values, limit, offset)
      .all();

    return {
      entries: entriesResult.results as EnvironmentHubRecord[],
      total,
    };
  }
}
```

**Effort:** 4-5 hours
**Dependencies:** Phase 2.1 (types)
**Testing:** Integration tests with D1 local database

---

### Phase 2.4: Sync Engine ⏭️

**Directory:** `app-environmenthub/02dev/src/lib/sync/`

#### Files to Create:

**1. `lib/sync/engine.ts`** - Main Sync Orchestrator
```typescript
import type { Env } from '../../types/env';
import { NotionClient } from '../notion/client';
import { NotionTransformer } from '../notion/transformer';
import { DatabaseClient } from '../database/client';

export interface SyncResult {
  syncLogId: number;
  processed: number;
  created: number;
  updated: number;
  deleted: number;
  conflicts: number;
  duration_ms: number;
  errors: string[];
}

export class SyncEngine {
  private notionClient: NotionClient;
  private dbClient: DatabaseClient;

  constructor(private env: Env) {
    this.notionClient = new NotionClient(env);
    this.dbClient = new DatabaseClient(env.DB);
  }

  /**
   * Sync from Notion to D1 (Notion is source of truth)
   */
  async syncNotionToD1(): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    // Create sync log entry
    const syncLogId = await this.dbClient.createSyncLog({
      sync_type: 'scheduled',
      direction: 'notion_to_d1',
      status: 'started',
    });

    let processed = 0;
    let created = 0;
    let updated = 0;
    let deleted = 0;
    let conflicts = 0;

    try {
      // Fetch all pages from Notion
      const notionPages = await this.notionClient.getAllPages();
      const notionIds = new Set(notionPages.map(p => p.id));

      // Get all existing D1 entries
      const d1Entries = await this.dbClient.getAllEntries();
      const d1Map = new Map(d1Entries.map(e => [e.notion_id, e]));

      // Process each Notion page
      for (const page of notionPages) {
        try {
          processed++;
          const d1Record = NotionTransformer.toD1Record(page);
          const existingEntry = d1Map.get(page.id);

          if (!existingEntry) {
            // Create new entry
            await this.dbClient.createEntry(d1Record);
            created++;
          } else {
            // Check if Notion was edited after last sync
            const notionEdited = new Date(page.last_edited_time);
            const lastSynced = new Date(existingEntry.last_synced_from_notion);

            if (notionEdited > lastSynced) {
              // Update existing entry
              await this.dbClient.updateEntry(page.id, d1Record);
              updated++;
            }
            // If D1 is newer, we have a conflict (Notion still wins)
            else if (new Date(existingEntry.updated_at) > lastSynced) {
              conflicts++;
              await this.dbClient.updateEntry(page.id, d1Record);
            }
          }
        } catch (error) {
          errors.push(`Error processing page ${page.id}: ${error}`);
        }
      }

      // Delete entries in D1 that no longer exist in Notion
      for (const entry of d1Entries) {
        if (!notionIds.has(entry.notion_id)) {
          await this.dbClient.deleteEntry(entry.notion_id);
          deleted++;
        }
      }

      // Update sync log
      const duration_ms = Date.now() - startTime;
      await this.dbClient.updateSyncLog(syncLogId, {
        status: errors.length > 0 ? 'partial' : 'completed',
        records_processed: processed,
        records_created: created,
        records_updated: updated,
        records_deleted: deleted,
        conflicts_detected: conflicts,
        conflicts_resolved: conflicts,
        completed_at: new Date().toISOString(),
        duration_ms,
        error_message: errors.length > 0 ? errors.join('; ') : null,
      });

      return {
        syncLogId,
        processed,
        created,
        updated,
        deleted,
        conflicts,
        duration_ms,
        errors,
      };
    } catch (error) {
      // Update sync log with failure
      await this.dbClient.updateSyncLog(syncLogId, {
        status: 'failed',
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        error_message: String(error),
      });

      throw error;
    }
  }

  /**
   * Sync from D1 to Notion (export changes back to Notion)
   * Note: Notion is source of truth, so this is primarily for
   * changes made via the dashboard API
   */
  async syncD1ToNotion(): Promise<SyncResult> {
    // TODO: Implement D1 → Notion sync
    // For now, we'll skip this as Notion is source of truth
    throw new Error('D1 to Notion sync not yet implemented');
  }
}
```

**Effort:** 5-6 hours
**Dependencies:** Phase 2.1, 2.2, 2.3
**Testing:** Integration tests with mock data

---

### Phase 2.5: API Routes & Middleware ⏭️

**Directory:** `app-environmenthub/02dev/src/`

#### Files to Create:

**1. `middleware/logger.ts`** - Structured Logging
```typescript
import type { Context, Next } from 'hono';

export async function logger(c: Context, next: Next) {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    method,
    path,
    status,
    duration_ms: duration,
  }));
}
```

**2. `middleware/error-handler.ts`** - Error Handling
```typescript
import type { Context } from 'hono';

export async function errorHandler(err: Error, c: Context) {
  console.error('Error:', err);

  return c.json({
    success: false,
    error: err.message || 'Internal server error',
  }, 500);
}
```

**3. `routes/api.ts`** - API Endpoints
```typescript
import { Hono } from 'hono';
import type { Env } from '../types/env';
import { DatabaseClient } from '../lib/database/client';
import { SyncEngine } from '../lib/sync/engine';

const api = new Hono<{ Bindings: Env }>();

// Health check
api.get('/health', async (c) => {
  return c.json({ success: true, status: 'healthy', env: c.env.ENV });
});

// Get all entries with filtering
api.get('/entries', async (c) => {
  const db = new DatabaseClient(c.env.DB);

  const filters = {
    tenant: c.req.query('tenant'),
    environment: c.req.query('environment'),
    environmentType: c.req.query('environmentType'),
    isSensitive: c.req.query('isSensitive') === 'true' ? true : undefined,
    status: c.req.query('status'),
    search: c.req.query('search'),
    limit: parseInt(c.req.query('limit') || '50'),
    offset: parseInt(c.req.query('offset') || '0'),
  };

  const { entries, total } = await db.filterEntries(filters);

  // Mask sensitive values
  const maskedEntries = entries.map(entry => ({
    ...entry,
    value: entry.is_sensitive ? '***MASKED***' : entry.value,
  }));

  return c.json({
    success: true,
    data: maskedEntries,
    meta: {
      total,
      page: Math.floor(filters.offset / filters.limit) + 1,
      limit: filters.limit,
    },
  });
});

// Get single entry by ID
api.get('/entries/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const db = new DatabaseClient(c.env.DB);

  const entry = await db.getEntryById(id);

  if (!entry) {
    return c.json({ success: false, error: 'Entry not found' }, 404);
  }

  // Mask sensitive value
  if (entry.is_sensitive) {
    entry.value = '***MASKED***';
  }

  return c.json({ success: true, data: entry });
});

// Trigger manual sync
api.post('/sync', async (c) => {
  const body = await c.req.json();
  const direction = body.direction || 'notion_to_d1';

  if (direction !== 'notion_to_d1') {
    return c.json({
      success: false,
      error: 'Only notion_to_d1 sync is currently supported',
    }, 400);
  }

  const syncEngine = new SyncEngine(c.env);
  const result = await syncEngine.syncNotionToD1();

  return c.json({
    success: true,
    data: result,
  });
});

// Get sync stats
api.get('/stats', async (c) => {
  const db = new DatabaseClient(c.env.DB);
  const recentSyncs = await db.getRecentSyncs(5);
  const allEntries = await db.getAllEntries();

  return c.json({
    success: true,
    data: {
      total_entries: allEntries.length,
      recent_syncs: recentSyncs,
    },
  });
});

export default api;
```

**4. `routes/dashboard.ts`** - Dashboard Routes
```typescript
import { Hono } from 'hono';
import type { Env } from '../types/env';

const dashboard = new Hono<{ Bindings: Env }>();

dashboard.get('/', async (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Environment Hub</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 2rem;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { margin-bottom: 2rem; color: #333; }
    .filters {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .filters input, .filters select {
      padding: 0.5rem;
      margin-right: 1rem;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    table {
      width: 100%;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      border-collapse: collapse;
    }
    th, td {
      padding: 1rem;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    th { background: #f9f9f9; font-weight: 600; }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
    }
    .badge-sensitive { background: #fee; color: #c33; }
    .badge-public { background: #efe; color: #3c3; }
    .sync-button {
      background: #0066cc;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    }
    .sync-button:hover { background: #0052a3; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🌈 Environment Hub</h1>

    <div class="filters">
      <input type="search" id="search" placeholder="Search..." />
      <select id="tenant">
        <option value="">All Tenants</option>
        <option value="mrrainbowsmoke.com">mrrainbowsmoke.com</option>
        <option value="rainbowsmokeofficial.com">rainbowsmokeofficial.com</option>
      </select>
      <select id="environmentType">
        <option value="">All Types</option>
        <option value="Variable">Variable</option>
        <option value="Secret">Secret</option>
        <option value="Token">Token</option>
        <option value="API Key">API Key</option>
      </select>
      <button class="sync-button" onclick="triggerSync()">Sync from Notion</button>
    </div>

    <div id="entries"></div>
  </div>

  <script>
    async function loadEntries() {
      const search = document.getElementById('search').value;
      const tenant = document.getElementById('tenant').value;
      const environmentType = document.getElementById('environmentType').value;

      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (tenant) params.append('tenant', tenant);
      if (environmentType) params.append('environmentType', environmentType);

      const response = await fetch('/api/v1/entries?' + params.toString());
      const result = await response.json();

      if (!result.success) {
        alert('Error: ' + result.error);
        return;
      }

      const html = \`
        <table>
          <thead>
            <tr>
              <th>Key</th>
              <th>Description</th>
              <th>Type</th>
              <th>Tenant</th>
              <th>Environment</th>
              <th>Sensitive</th>
            </tr>
          </thead>
          <tbody>
            \${result.data.map(entry => \`
              <tr>
                <td><strong>\${entry.key}</strong></td>
                <td>\${entry.description}</td>
                <td>\${entry.environment_type}</td>
                <td>\${entry.tenant}</td>
                <td>\${JSON.parse(entry.environment).join(', ')}</td>
                <td>
                  <span class="badge badge-\${entry.is_sensitive ? 'sensitive' : 'public'}">
                    \${entry.is_sensitive ? 'Sensitive' : 'Public'}
                  </span>
                </td>
              </tr>
            \`).join('')}
          </tbody>
        </table>
      \`;

      document.getElementById('entries').innerHTML = html;
    }

    async function triggerSync() {
      if (!confirm('Trigger manual sync from Notion?')) return;

      const response = await fetch('/api/v1/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: 'notion_to_d1' }),
      });

      const result = await response.json();

      if (result.success) {
        alert(\`Sync completed!\\nProcessed: \${result.data.processed}\\nCreated: \${result.data.created}\\nUpdated: \${result.data.updated}\`);
        loadEntries();
      } else {
        alert('Sync failed: ' + result.error);
      }
    }

    document.getElementById('search').addEventListener('input', loadEntries);
    document.getElementById('tenant').addEventListener('change', loadEntries);
    document.getElementById('environmentType').addEventListener('change', loadEntries);

    loadEntries();
  </script>
</body>
</html>
  `);
});

export default dashboard;
```

**Effort:** 6-7 hours
**Dependencies:** Phase 2.1-2.4
**Testing:** Manual testing + automated API tests

---

### Phase 2.6: Worker Entry Point ⏭️

**Directory:** `app-environmenthub/02dev/src/`

#### Files to Create:

**1. `src/index.ts`** - Main Worker Entry Point
```typescript
import { Hono } from 'hono';
import type { Env } from './types/env';
import { logger } from './middleware/logger';
import { errorHandler } from './middleware/error-handler';
import api from './routes/api';
import dashboard from './routes/dashboard';
import { SyncEngine } from './lib/sync/engine';

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger);
app.onError(errorHandler);

// Routes
app.route('/api/v1', api);
app.route('/', dashboard);

// Scheduled sync (cron trigger)
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Scheduled sync triggered');

    try {
      const syncEngine = new SyncEngine(env);
      const result = await syncEngine.syncNotionToD1();

      console.log('Scheduled sync completed:', {
        processed: result.processed,
        created: result.created,
        updated: result.updated,
        deleted: result.deleted,
        conflicts: result.conflicts,
        duration_ms: result.duration_ms,
      });
    } catch (error) {
      console.error('Scheduled sync failed:', error);
    }
  },
};
```

**Effort:** 1-2 hours
**Dependencies:** Phase 2.1-2.5
**Testing:** Local dev with `wrangler dev`

---

## Implementation Order & Timeline

### Week 1: Foundation
- **Day 1-2:** Phase 2.1 - TypeScript Types (2-3 hours)
- **Day 3-4:** Phase 2.2 - Notion API Client (4-5 hours)
- **Day 5:** Phase 2.3 - D1 Database Client (4-5 hours)

### Week 2: Core Logic
- **Day 1-2:** Phase 2.4 - Sync Engine (5-6 hours)
- **Day 3-4:** Phase 2.5 - API Routes & Middleware (6-7 hours)
- **Day 5:** Phase 2.6 - Worker Entry Point (1-2 hours)

### Week 3: Testing & Deployment
- **Day 1-2:** Integration testing, bug fixes
- **Day 3:** Deploy to dev, validate sync
- **Day 4:** Set secrets, test with real Notion data
- **Day 5:** Promote to staging, final validation

**Total Estimated Effort:** 22-30 hours of development

---

## Testing Strategy

### Unit Tests
- Notion transformer logic
- Database query builders
- Type validation

### Integration Tests
- Notion API client with mock responses
- D1 database operations with local database
- Sync engine with test data

### Manual Testing
- Dashboard UI functionality
- API endpoints via curl/Postman
- Scheduled cron triggers
- Error handling and edge cases

### Production Validation
- Small subset sync first
- Monitor sync logs
- Validate data accuracy
- Check performance metrics

---

## Deployment Checklist

### Before First Deployment

- [ ] Set Notion API secrets for dev environment
  ```bash
  cd app-environmenthub/02dev
  npx wrangler secret put NOTION_API_KEY --env dev
  npx wrangler secret put NOTION_DATABASE_ID --env dev
  ```

- [ ] Verify D1 database schema is current
  ```bash
  npx wrangler d1 execute DB --command="SELECT name FROM sqlite_master WHERE type='table';" --remote
  ```

- [ ] Test locally with real Notion connection
  ```bash
  npx wrangler dev src/index.ts --local --test-scheduled
  ```

### Development Deployment

- [ ] Deploy to dev
  ```bash
  cd app-environmenthub/02dev
  npx wrangler deploy --env dev
  ```

- [ ] Trigger manual sync via API
  ```bash
  curl -X POST https://environmenthub-dev.workers.dev/api/v1/sync \
    -H "Content-Type: application/json" \
    -d '{"direction": "notion_to_d1"}'
  ```

- [ ] Verify dashboard loads and displays entries
  ```bash
  open https://environmenthub-dev.workers.dev
  ```

- [ ] Check sync logs
  ```bash
  npx wrangler d1 execute DB --command="SELECT * FROM sync_log ORDER BY started_at DESC LIMIT 5;" --remote
  ```

### Staging Promotion

- [ ] Set secrets for staging
- [ ] Deploy to staging
- [ ] Run full sync and validate
- [ ] Test filtering and search
- [ ] Verify cron trigger works

### Production Promotion

- [ ] Set secrets for production
- [ ] Deploy to production
- [ ] Monitor first scheduled sync
- [ ] Validate data integrity
- [ ] Update CHANGELOG

---

## Success Criteria

Phase 2 will be considered complete when:

1. ✅ All TypeScript types are defined and compile without errors
2. ✅ Notion API client successfully fetches all pages from production database
3. ✅ D1 database client can perform all CRUD operations
4. ✅ Sync engine successfully syncs Notion → D1 with no data loss
5. ✅ API endpoints return correct data with filtering/pagination
6. ✅ Dashboard UI loads and displays entries correctly
7. ✅ Scheduled cron triggers work on all environments
8. ✅ Sensitive values are properly masked in API responses
9. ✅ Sync logs accurately track all operations
10. ✅ Worker is deployed and running in dev, staging, and production

---

## Risks & Mitigation

### Risk: Notion API Rate Limits
- **Mitigation:** Implement exponential backoff, cache results in KV
- **Fallback:** Reduce sync frequency if rate limited

### Risk: Large Dataset Performance
- **Mitigation:** Use pagination, batch database operations
- **Fallback:** Implement incremental sync (only fetch changed records)

### Risk: Schema Mismatch Between Notion & D1
- **Mitigation:** Comprehensive transformer with fallback values
- **Validation:** Already completed in this document ✅

### Risk: Data Loss During Sync
- **Mitigation:** Transaction-based updates, sync log for audit trail
- **Rollback:** Keep sync_log metadata for recovery

---

## Next Phase: Phase 3 (Future)

After Phase 2 is complete, potential Phase 3 enhancements:

- **Cloudflare Access Integration:** Full JWT validation
- **Advanced Dashboard:** Edit entries, bulk operations
- **Webhooks:** Real-time sync on Notion changes
- **Export Functionality:** Download as CSV, JSON, ENV files
- **Secret Rotation Reminders:** Alert based on rotation_policy
- **Multi-database Support:** Sync from multiple Notion databases
- **Analytics:** Usage metrics, sync performance dashboards

---

## References

- [Notion API Documentation](https://developers.notion.com/reference/intro)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Hono Framework Documentation](https://hono.dev/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)

---

**Document Status:** ✅ Ready for Implementation
**Last Updated:** 2026-01-03
**Author:** Claude Code
**Review Required:** No - schema analysis complete
