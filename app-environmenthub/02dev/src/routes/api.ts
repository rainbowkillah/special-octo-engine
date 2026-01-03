import { Hono } from 'hono';
import type { Env } from '../types/env';
import { DatabaseClient } from '../lib/database/client';
import { SyncEngine } from '../lib/sync/engine';

const api = new Hono<{ Bindings: Env }>();

// Health check
api.get('/health', async (c) => {
  return c.json({ success: true, status: 'healthy', env: c.env.ENV });
});

// Get entries with filtering
api.get('/entries', async (c) => {
  const db = new DatabaseClient(c.env.DB);

  const filters = {
    tenant: c.req.query('tenant'),
    environment: c.req.query('environment'),
    environmentType: c.req.query('environmentType'),
    isSensitive: c.req.query('isSensitive') === 'true' ? true : undefined,
    status: c.req.query('status'),
    search: c.req.query('search'),
    limit: parseInt(c.req.query('limit') || '50', 10),
    offset: parseInt(c.req.query('offset') || '0', 10),
  };

  const { entries, total } = await db.filterEntries(filters);

  const maskedEntries = entries.map((entry) => ({
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

// Get single entry by numeric ID
api.get('/entries/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const db = new DatabaseClient(c.env.DB);

  const entry = await db.getEntryById(id);

  if (!entry) {
    return c.json({ success: false, error: 'Entry not found' }, 404);
  }

  if (entry.is_sensitive) {
    entry.value = '***MASKED***';
  }

  return c.json({ success: true, data: entry });
});

// Trigger manual sync (Notion -> D1)
api.post('/sync', async (c) => {
  const body = await c.req.json();
  const direction = body.direction || 'notion_to_d1';

  if (direction !== 'notion_to_d1' && direction !== 'd1_to_notion') {
    return c.json(
      {
        success: false,
        error: 'Unsupported sync direction',
      },
      400,
    );
  }

  const syncEngine = new SyncEngine(c.env);
  const result =
    direction === 'd1_to_notion' ? await syncEngine.syncD1ToNotion() : await syncEngine.syncNotionToD1();

  return c.json({
    success: true,
    data: result,
  });
});

// Sync stats
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
