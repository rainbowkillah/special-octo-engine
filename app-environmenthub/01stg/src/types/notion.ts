// Notion API request/response types
export interface NotionPage {
  id: string; // UUID
  created_time: string; // ISO 8601
  last_edited_time: string; // ISO 8601
  properties: NotionProperties;
}

export interface NotionProperties {
  Key: { title: Array<{ text: { content: string } }> };
  Description: { rich_text: Array<{ text: { content: string } }> };
  Environment: { multi_select: Array<{ name: string }> };
  'Environment Type': { select: { name: string } | null };
  'Is Sensitive': { checkbox: boolean };
  'Last Updated/Rotated': { date: { start: string } | null };
  Notes: { rich_text: Array<{ text: { content: string } }> };
  Reference: { rich_text: Array<{ text: { content: string } }> };
  Required: { checkbox: boolean };
  'Rotation Policy': { rich_text: Array<{ text: { content: string } }> };
  'Service/Component': { multi_select: Array<{ name: string }> };
  Status: { select: { name: string } | null };
  Tenant: { select: { name: string } | null };
  'Updated/Rotated By': { people: Array<{ name: string }> };
  Value: { rich_text: Array<{ text: { content: string } }> };
  'Value Type': { select: { name: string } | null };
}

export interface NotionDatabaseQueryResponse {
  results: NotionPage[];
  next_cursor: string | null;
  has_more: boolean;
}
