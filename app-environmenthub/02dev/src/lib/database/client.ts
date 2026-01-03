import type { D1Database } from '@cloudflare/workers-types';
import type { EnvironmentHubRecord, SyncLogRecord } from '../../types/database';

// Lightweight wrapper around D1 queries for Environment Hub
export class DatabaseClient {
  constructor(private db: D1Database) {}

  // === Environment Hub Records ===

  async getAllEntries(): Promise<EnvironmentHubRecord[]> {
    const result = await this.db.prepare('SELECT * FROM environment_hub ORDER BY key ASC').all();
    return (result.results ?? []) as unknown as EnvironmentHubRecord[];
  }

  async getEntryByNotionId(notionId: string): Promise<EnvironmentHubRecord | null> {
    const result = await this.db.prepare('SELECT * FROM environment_hub WHERE notion_id = ?').bind(notionId).first();
    return (result as unknown as EnvironmentHubRecord | null) ?? null;
  }

  async getEntryById(id: number): Promise<EnvironmentHubRecord | null> {
    const result = await this.db.prepare('SELECT * FROM environment_hub WHERE id = ?').bind(id).first();
    return (result as unknown as EnvironmentHubRecord | null) ?? null;
  }

  async createEntry(entry: Omit<EnvironmentHubRecord, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const result = await this.db
      .prepare(
        `
        INSERT INTO environment_hub (
          notion_id, key, description, value, value_type,
          environment, environment_type, tenant,
          is_sensitive, required, status, service_component,
          reference, notes, last_updated_rotated,
          updated_rotated_by, rotation_policy,
          last_synced_from_notion, notion_last_edited_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      )
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
        entry.notion_last_edited_time,
      )
      .run();

    return result.meta.last_row_id;
  }

  async updateEntry(
    notionId: string,
    entry: Partial<Omit<EnvironmentHubRecord, 'id' | 'created_at' | 'updated_at'>>,
  ): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];

    Object.entries(entry).forEach(([key, value]) => {
      if (key !== 'notion_id') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return;

    values.push(notionId);

    await this.db.prepare(`UPDATE environment_hub SET ${fields.join(', ')} WHERE notion_id = ?`).bind(...values).run();
  }

  async deleteEntry(notionId: string): Promise<void> {
    await this.db.prepare('DELETE FROM environment_hub WHERE notion_id = ?').bind(notionId).run();
  }

  // === Sync Log ===

  async createSyncLog(log: { sync_type: string; direction: string; status: string }): Promise<number> {
    const result = await this.db
      .prepare('INSERT INTO sync_log (sync_type, direction, status) VALUES (?, ?, ?)')
      .bind(log.sync_type, log.direction, log.status)
      .run();

    return result.meta.last_row_id;
  }

  async updateSyncLog(id: number, updates: Partial<SyncLogRecord>): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      fields.push(`${key} = ?`);
      values.push(value);
    });

    if (fields.length === 0) return;

    values.push(id);

    await this.db.prepare(`UPDATE sync_log SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  }

  async getRecentSyncs(limit = 10): Promise<SyncLogRecord[]> {
    const result = await this.db.prepare('SELECT * FROM sync_log ORDER BY started_at DESC LIMIT ?').bind(limit).all();
    return (result.results ?? []) as unknown as SyncLogRecord[];
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
    const values: unknown[] = [];

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
      // SQLite lacks JSON functions; using LIKE for JSON-text search
      conditions.push('(environment LIKE ? OR environment LIKE ?)');
      values.push(`%"${filters.environment}"%`, '%"All Environments"%');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await this.db.prepare(`SELECT COUNT(*) as count FROM environment_hub ${whereClause}`).bind(...values).first();
    const total = Number((countResult as any)?.count ?? 0);

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const entriesResult = await this.db
      .prepare(
        `
        SELECT * FROM environment_hub
        ${whereClause}
        ORDER BY key ASC
        LIMIT ? OFFSET ?
      `,
      )
      .bind(...values, limit, offset)
      .all();

    return {
      entries: (entriesResult.results ?? []) as unknown as EnvironmentHubRecord[],
      total,
    };
  }
}
