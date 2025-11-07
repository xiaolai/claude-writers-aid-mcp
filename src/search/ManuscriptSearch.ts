/**
 * ManuscriptSearch - Semantic search for manuscripts
 */

import { WritingStorage } from "../storage/WritingStorage.js";

export interface SearchOptions {
  scope?: string;
  limit?: number;
}

export class ManuscriptSearch {
  constructor(private storage: WritingStorage) {}

  async search(query: string, options?: SearchOptions) {
    const { limit = 10 } = options || {};

    // Simple search implementation
    const files = await this.storage.getAllFiles();
    const results = [];

    for (const file of files) {
      if (file.content.toLowerCase().includes(query.toLowerCase())) {
        results.push({
          file: file.file_path,
          content: file.content.substring(0, 200),
          relevance: 1.0,
        });

        if (results.length >= limit) {break;}
      }
    }

    return results;
  }
}
