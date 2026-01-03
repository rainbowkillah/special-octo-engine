import type { EnvironmentHubRecord } from '../../types/database';
import type { NotionPage } from '../../types/notion';

// Transform Notion pages into D1 record shapes
export class NotionTransformer {
  /**
   * Transform a Notion page to a D1 database record shape (excluding DB-managed columns).
   */
  static toD1Record(page: NotionPage): Omit<EnvironmentHubRecord, 'id' | 'created_at' | 'updated_at'> {
    const props = page.properties;

    return {
      notion_id: page.id,

      // Core fields
      key: this.extractTitle(props.Key),
      description: this.extractRichText(props.Description),
      value: this.extractRichText(props.Value),
      value_type: this.extractSelect(props['Value Type']) || 'String',

      // Arrays (stored as JSON text)
      environment: JSON.stringify(this.extractMultiSelect(props.Environment)),
      environment_type: this.extractSelect(props['Environment Type']) || 'Variable',
      tenant: this.extractSelect(props.Tenant) || '',

      // Booleans (stored as 0/1)
      is_sensitive: this.extractCheckbox(props['Is Sensitive']) ? 1 : 0,
      required: this.extractCheckbox(props.Required) ? 1 : 0,

      // Metadata
      status: this.extractSelect(props.Status) || 'Active',
      service_component: JSON.stringify(this.extractMultiSelect(props['Service/Component'])),
      reference: this.extractRichText(props.Reference),
      notes: this.extractRichText(props.Notes),

      // Rotation
      last_updated_rotated: this.extractDate(props['Last Updated/Rotated']),
      updated_rotated_by: this.extractPeople(props['Updated/Rotated By']),
      rotation_policy: this.extractRichText(props['Rotation Policy']),

      // Sync metadata
      last_synced_from_notion: new Date().toISOString(),
      notion_last_edited_time: page.last_edited_time,
    };
  }

  /**
   * Transform a D1 record back to Notion property payload for updates.
   */
  static toNotionProperties(record: EnvironmentHubRecord): Record<string, unknown> {
    const environments = this.parseJsonArray(record.environment);
    const serviceComponents = this.parseJsonArray(record.service_component);

    const toRichText = (value: string) => ({
      rich_text: value ? [{ text: { content: value } }] : [],
    });

    return {
      Key: { title: [{ text: { content: record.key } }] },
      Description: toRichText(record.description),
      Environment: { multi_select: environments.map((env) => ({ name: env })) },
      'Environment Type': { select: record.environment_type ? { name: record.environment_type } : null },
      'Is Sensitive': { checkbox: record.is_sensitive === 1 },
      'Last Updated/Rotated': { date: record.last_updated_rotated ? { start: record.last_updated_rotated } : null },
      Notes: toRichText(record.notes),
      Reference: toRichText(record.reference),
      Required: { checkbox: record.required === 1 },
      'Rotation Policy': toRichText(record.rotation_policy),
      'Service/Component': { multi_select: serviceComponents.map((name) => ({ name })) },
      Status: { select: record.status ? { name: record.status } : null },
      Tenant: { select: record.tenant ? { name: record.tenant } : null },
      Value: toRichText(record.value),
      'Value Type': { select: record.value_type ? { name: record.value_type } : null },
      // Intentionally omit "Updated/Rotated By" because Notion people cannot be set by name reliably via API without user IDs.
    };
  }

  private static extractTitle(prop: any): string {
    return prop?.title?.[0]?.text?.content || '';
  }

  private static extractRichText(prop: any): string {
    return prop?.rich_text?.map((rt: any) => rt.text.content).join('') || '';
  }

  private static extractSelect(prop: any): string | null {
    return prop?.select?.name || null;
  }

  private static extractMultiSelect(prop: any): string[] {
    return prop?.multi_select?.map((item: any) => item.name) || [];
  }

  private static extractCheckbox(prop: any): boolean {
    return prop?.checkbox || false;
  }

  private static extractDate(prop: any): string | null {
    return prop?.date?.start || null;
  }

  private static extractPeople(prop: any): string {
    return prop?.people?.map((p: any) => p.name).join(', ') || '';
  }

  private static parseJsonArray(value: string): string[] {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
