import { Hono } from 'hono';
import type { Env } from '../types/env';
import { DatabaseClient } from '../lib/database/client';

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

// Create new entry
api.post('/entries', async (c) => {
  const db = new DatabaseClient(c.env.DB);
  const body = await c.req.json();

  // Basic validation
  if (!body.key || !body.tenant) {
    return c.json({ success: false, error: 'key and tenant are required' }, 400);
  }

  const entry = await db.createEntry({
    key: body.key,
    value: body.value || '',
    value_type: body.value_type || 'String',
    tenant: body.tenant,
    environment: body.environment || '[]',
    environment_type: body.environment_type || null,
    is_sensitive: body.is_sensitive || false,
    description: body.description || null,
    status: body.status || 'active',
    notion_id: null,
    required: null,
    service_component: null,
    reference: null,
    notes: null,
    last_updated_rotated: null,
    updated_rotated_by: null,
    rotation_policy: null,
    last_synced_from_notion: null,
    notion_last_edited_time: null,
  });

  return c.json({ success: true, data: entry }, 201);
});

// Update entry
api.put('/entries/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const db = new DatabaseClient(c.env.DB);
  const body = await c.req.json();

  const existing = await db.getEntryById(id);
  if (!existing) {
    return c.json({ success: false, error: 'Entry not found' }, 404);
  }

  const updated = await db.updateEntry(id, body);
  return c.json({ success: true, data: updated });
});

// Delete entry
api.delete('/entries/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const db = new DatabaseClient(c.env.DB);

  const existing = await db.getEntryById(id);
  if (!existing) {
    return c.json({ success: false, error: 'Entry not found' }, 404);
  }

  await db.deleteEntry(id);
  return c.json({ success: true, message: 'Entry deleted' });
});

// Stats
api.get('/stats', async (c) => {
  const db = new DatabaseClient(c.env.DB);
  const allEntries = await db.getAllEntries();

  return c.json({
    success: true,
    data: {
      total_entries: allEntries.length,
    },
  });
});

export default api;
