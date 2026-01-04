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
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
    }
    .filters input, .filters select {
      padding: 0.5rem;
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
    .btn {
      background: #0066cc;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    }
    .btn:hover { background: #0052a3; }
    .btn-success { background: #28a745; }
    .btn-success:hover { background: #218838; }
    .btn-danger { background: #dc3545; }
    .btn-danger:hover { background: #c82333; }
    .btn-small {
      padding: 0.25rem 0.75rem;
      font-size: 0.875rem;
      margin-right: 0.5rem;
    }
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      align-items: center;
      justify-content: center;
    }
    .modal.active { display: flex; }
    .modal-content {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      max-width: 600px;
      width: 90%;
    }
    .form-group {
      margin-bottom: 1rem;
    }
    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }
    .form-group input, .form-group select, .form-group textarea {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .form-group textarea {
      min-height: 100px;
    }
    .form-actions {
      display: flex;
      gap: 1rem;
      margin-top: 1.5rem;
    }
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
      <button class="btn btn-success" onclick="openModal()">+ Add Entry</button>
    </div>

    <div id="entries"></div>
  </div>

  <div id="modal" class="modal">
    <div class="modal-content">
      <h2 id="modal-title">Add Entry</h2>
      <form id="entry-form">
        <input type="hidden" id="entry-id" />
        <div class="form-group">
          <label>Key *</label>
          <input type="text" id="key" required />
        </div>
        <div class="form-group">
          <label>Value</label>
          <input type="text" id="value" />
        </div>
        <div class="form-group">
          <label>Tenant *</label>
          <select id="form-tenant" required>
            <option value="mrrainbowsmoke.com">mrrainbowsmoke.com</option>
            <option value="rainbowsmokeofficial.com">rainbowsmokeofficial.com</option>
          </select>
        </div>
        <div class="form-group">
          <label>Environment Type</label>
          <select id="form-environment-type">
            <option value="">Select...</option>
            <option value="Variable">Variable</option>
            <option value="Secret">Secret</option>
            <option value="Token">Token</option>
            <option value="API Key">API Key</option>
          </select>
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="description"></textarea>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="is-sensitive" />
            Sensitive (mask value)
          </label>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-success">Save</button>
          <button type="button" class="btn" onclick="closeModal()">Cancel</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    let currentEntryId = null;

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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            \${result.data.length === 0 ? \`
              <tr><td colspan="7" style="text-align: center; padding: 2rem; color: #666;">
                No entries found. Click "Add Entry" to create one.
              </td></tr>
            \` : result.data.map(entry => \`
              <tr>
                <td><strong>\${entry.key}</strong></td>
                <td>\${entry.description || '-'}</td>
                <td>\${entry.environment_type || '-'}</td>
                <td>\${entry.tenant}</td>
                <td>\${entry.environment ? JSON.parse(entry.environment).join(', ') : '-'}</td>
                <td>
                  <span class="badge badge-\${entry.is_sensitive ? 'sensitive' : 'public'}">
                    \${entry.is_sensitive ? 'Sensitive' : 'Public'}
                  </span>
                </td>
                <td>
                  <button class="btn btn-small" onclick="editEntry(\${entry.id})">Edit</button>
                  <button class="btn btn-danger btn-small" onclick="deleteEntry(\${entry.id})">Delete</button>
                </td>
              </tr>
            \`).join('')}
          </tbody>
        </table>
      \`;

      document.getElementById('entries').innerHTML = html;
    }

    function openModal(entry = null) {
      currentEntryId = entry?.id || null;
      document.getElementById('modal-title').textContent = entry ? 'Edit Entry' : 'Add Entry';
      document.getElementById('entry-id').value = entry?.id || '';
      document.getElementById('key').value = entry?.key || '';
      document.getElementById('value').value = entry?.is_sensitive ? '' : (entry?.value || '');
      document.getElementById('form-tenant').value = entry?.tenant || 'mrrainbowsmoke.com';
      document.getElementById('form-environment-type').value = entry?.environment_type || '';
      document.getElementById('description').value = entry?.description || '';
      document.getElementById('is-sensitive').checked = entry?.is_sensitive || false;
      document.getElementById('modal').classList.add('active');
    }

    function closeModal() {
      document.getElementById('modal').classList.remove('active');
      document.getElementById('entry-form').reset();
      currentEntryId = null;
    }

    async function editEntry(id) {
      const response = await fetch(\`/api/v1/entries/\${id}\`);
      const result = await response.json();
      if (result.success) {
        openModal(result.data);
      }
    }

    async function deleteEntry(id) {
      if (!confirm('Delete this entry? This cannot be undone.')) return;

      const response = await fetch(\`/api/v1/entries/\${id}\`, { method: 'DELETE' });
      const result = await response.json();

      if (result.success) {
        alert('Entry deleted successfully');
        loadEntries();
      } else {
        alert('Error: ' + result.error);
      }
    }

    document.getElementById('entry-form').addEventListener('submit', async (e) => {
      e.preventDefault();

      const data = {
        key: document.getElementById('key').value,
        value: document.getElementById('value').value,
        tenant: document.getElementById('form-tenant').value,
        environment_type: document.getElementById('form-environment-type').value || null,
        description: document.getElementById('description').value || null,
        is_sensitive: document.getElementById('is-sensitive').checked,
      };

      const url = currentEntryId ? \`/api/v1/entries/\${currentEntryId}\` : '/api/v1/entries';
      const method = currentEntryId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        alert(currentEntryId ? 'Entry updated!' : 'Entry created!');
        closeModal();
        loadEntries();
      } else {
        alert('Error: ' + result.error);
      }
    });

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
