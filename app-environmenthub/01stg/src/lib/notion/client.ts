import type { Env } from '../../types/env';
import type { NotionDatabaseQueryResponse, NotionPage } from '../../types/notion';

// Minimal Notion client for database queries and page updates
export class NotionClient {
  private apiKey: string;
  private databaseId: string;
  private baseUrl = 'https://api.notion.com/v1';

  constructor(env: Env) {
    this.apiKey = env.NOTION_API_KEY;
    this.databaseId = env.NOTION_DATABASE_ID;
  }

  /**
   * Query the Notion database with pagination.
   */
  async queryDatabase(cursor?: string): Promise<NotionDatabaseQueryResponse> {
    const response = await fetch(`${this.baseUrl}/databases/${this.databaseId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        start_cursor: cursor,
        page_size: 100, // Max per request
      }),
    });

    if (!response.ok) {
      throw new Error(`Notion API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Fetch all pages from the Notion database (handles pagination).
   */
  async getAllPages(): Promise<NotionPage[]> {
    const pages: NotionPage[] = [];
    let cursor: string | null = null;

    do {
      const response = await this.queryDatabase(cursor || undefined);
      pages.push(...response.results);
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    return pages;
  }

  /**
   * Get a single page by ID.
   */
  async getPage(pageId: string): Promise<NotionPage> {
    const response = await fetch(`${this.baseUrl}/pages/${pageId}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Notion-Version': '2022-06-28',
      },
    });

    if (!response.ok) {
      throw new Error(`Notion API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update a page's properties.
   */
  async updatePage(pageId: string, properties: Record<string, unknown>): Promise<NotionPage> {
    const response = await fetch(`${this.baseUrl}/pages/${pageId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties }),
    });

    if (!response.ok) {
      throw new Error(`Notion API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}
