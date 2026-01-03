// Cloudflare Worker environment bindings and secrets
export interface Env {
  // D1 database binding
  DB: D1Database;

  // KV cache binding
  CACHE: KVNamespace;

  // Notion credentials (set via wrangler secret put)
  NOTION_API_KEY: string;
  NOTION_DATABASE_ID: string;

  // Optional Cloudflare Access settings
  CF_ACCESS_TEAM_NAME?: string;
  CF_ACCESS_AUD?: string;

  // Environment name
  ENV: 'dev' | 'stg' | 'prd';
}
