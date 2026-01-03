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
