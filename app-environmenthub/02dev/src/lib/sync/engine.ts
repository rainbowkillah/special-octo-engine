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

// Sync engine coordinating Notion -> D1
export class SyncEngine {
  private notionClient: NotionClient;
  private dbClient: DatabaseClient;

  constructor(env: Env) {
    this.notionClient = new NotionClient(env);
    this.dbClient = new DatabaseClient(env.DB);
  }

  /**
   * Sync from Notion to D1 (Notion is source of truth).
   */
  async syncNotionToD1(): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];

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
      const notionPages = await this.notionClient.getAllPages();
      const notionIds = new Set(notionPages.map((p) => p.id));

      const d1Entries = await this.dbClient.getAllEntries();
      const d1Map = new Map(d1Entries.map((e) => [e.notion_id, e]));

      for (const page of notionPages) {
        try {
          processed++;
          const d1Record = NotionTransformer.toD1Record(page);
          const existingEntry = d1Map.get(page.id);

          if (!existingEntry) {
            await this.dbClient.createEntry(d1Record);
            created++;
          } else {
            const notionEdited = new Date(page.last_edited_time);
            const lastSynced = new Date(existingEntry.last_synced_from_notion);

            if (notionEdited > lastSynced) {
              await this.dbClient.updateEntry(page.id, d1Record);
              updated++;
            } else if (new Date(existingEntry.updated_at) > lastSynced) {
              conflicts++;
              await this.dbClient.updateEntry(page.id, d1Record);
            }
          }
        } catch (error) {
          errors.push(`Error processing page ${page.id}: ${error}`);
        }
      }

      for (const entry of d1Entries) {
        if (!notionIds.has(entry.notion_id)) {
          await this.dbClient.deleteEntry(entry.notion_id);
          deleted++;
        }
      }

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
   * Sync from D1 to Notion (exports dashboard changes back to Notion).
   */
  async syncD1ToNotion(): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    const syncLogId = await this.dbClient.createSyncLog({
      sync_type: 'manual',
      direction: 'd1_to_notion',
      status: 'started',
    });

    let processed = 0;
    let updated = 0;

    try {
      const d1Entries = await this.dbClient.getAllEntries();

      for (const entry of d1Entries) {
        processed++;

        if (!entry.notion_id) {
          errors.push(`Missing notion_id for entry ${entry.id}`);
          continue;
        }

        try {
          const notionProps = NotionTransformer.toNotionProperties(entry);
          await this.notionClient.updatePage(entry.notion_id, notionProps);
          updated++;
        } catch (err) {
          errors.push(`Failed to update Notion page ${entry.notion_id}: ${err}`);
        }
      }

      const duration_ms = Date.now() - startTime;
      await this.dbClient.updateSyncLog(syncLogId, {
        status: errors.length > 0 ? 'partial' : 'completed',
        records_processed: processed,
        records_created: 0,
        records_updated: updated,
        records_deleted: 0,
        conflicts_detected: 0,
        conflicts_resolved: 0,
        completed_at: new Date().toISOString(),
        duration_ms,
        error_message: errors.length > 0 ? errors.join('; ') : null,
      });

      return {
        syncLogId,
        processed,
        created: 0,
        updated,
        deleted: 0,
        conflicts: 0,
        duration_ms,
        errors,
      };
    } catch (err) {
      await this.dbClient.updateSyncLog(syncLogId, {
        status: 'failed',
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        error_message: String(err),
      });

      throw err;
    }
  }
}
