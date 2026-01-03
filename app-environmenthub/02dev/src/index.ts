import { Hono } from 'hono';
import type { Env } from './types/env';
import { logger } from './middleware/logger';
import { errorHandler } from './middleware/error-handler';
import { accessGuard } from './middleware/access';
import api from './routes/api';
import dashboard from './routes/dashboard';
import { SyncEngine } from './lib/sync/engine';

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger);
app.use('*', accessGuard);
app.onError(errorHandler);

// Routes
app.route('/api/v1', api);
app.route('/', dashboard);

// Worker entrypoints
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },

  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
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
