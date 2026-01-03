import assert from 'node:assert/strict';
import { NotionTransformer } from '../02dev/src/lib/notion/transformer.ts';
import type { NotionPage } from '../02dev/src/types/notion.ts';

function testNotionTransformer() {
  const page: NotionPage = {
    id: 'notion-page-id',
    created_time: '2026-01-01T00:00:00.000Z',
    last_edited_time: '2026-01-02T00:00:00.000Z',
    properties: {
      Key: { title: [{ text: { content: 'API_KEY' } }] },
      Description: { rich_text: [{ text: { content: 'desc' } }] },
      Environment: { multi_select: [{ name: 'dev' }, { name: 'stg' }] },
      'Environment Type': { select: { name: 'Variable' } },
      'Is Sensitive': { checkbox: true },
      'Last Updated/Rotated': { date: { start: '2026-01-01' } },
      Notes: { rich_text: [{ text: { content: 'note' } }] },
      Reference: { rich_text: [{ text: { content: 'ref' } }] },
      Required: { checkbox: false },
      'Rotation Policy': { rich_text: [{ text: { content: 'rotate' } }] },
      'Service/Component': { multi_select: [{ name: 'API' }] },
      Status: { select: { name: 'Active' } },
      Tenant: { select: { name: 'tenant.com' } },
      'Updated/Rotated By': { people: [{ name: 'alice' }] },
      Value: { rich_text: [{ text: { content: 'secret' } }] },
      'Value Type': { select: { name: 'String' } },
    },
  };

  const record = NotionTransformer.toD1Record(page);
  assert.equal(record.notion_id, 'notion-page-id');
  assert.equal(record.key, 'API_KEY');
  assert.equal(record.description, 'desc');
  assert.equal(record.value, 'secret');
  assert.equal(record.value_type, 'String');
  assert.equal(record.environment_type, 'Variable');
  assert.equal(record.tenant, 'tenant.com');
  assert.equal(record.is_sensitive, 1);
  assert.equal(record.required, 0);
  assert.equal(record.status, 'Active');
  assert.equal(record.updated_rotated_by, 'alice');
  assert.equal(record.rotation_policy, 'rotate');

  const environments = JSON.parse(record.environment);
  assert.deepEqual(environments, ['dev', 'stg']);

  const serviceComponent = JSON.parse(record.service_component);
  assert.deepEqual(serviceComponent, ['API']);
}

async function run() {
  testNotionTransformer();
  console.log('✅ NotionTransformer tests passed');
}

run().catch((err) => {
  console.error('Tests failed', err);
  process.exit(1);
});
