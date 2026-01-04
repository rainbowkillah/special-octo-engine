import { Hono } from 'hono';
import type { Env } from './types/env';
import { logger } from './middleware/logger';
import { errorHandler } from './middleware/error-handler';
import { accessGuard } from './middleware/access';
import api from './routes/api';
import dashboard from './routes/dashboard';

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
};
