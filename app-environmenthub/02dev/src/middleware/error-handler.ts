import type { Context } from 'hono';

// Global error handler
export async function errorHandler(err: Error, c: Context) {
  console.error('Error:', err);

  return c.json(
    {
      success: false,
      error: err.message || 'Internal server error',
    },
    500,
  );
}
