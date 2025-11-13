/**
 * TodoExtractor - Extract TODO/FIXME/DRAFT markers from content
 */

import { WritingStorage } from "../storage/WritingStorage.js";
import { paginateResults } from "../utils/pagination.js";

export interface TodoItem {
  file: string;
  line: number;
  marker: string;
  text: string;
  priority: "high" | "medium" | "low";
}

export class TodoExtractor {
  constructor(private storage: WritingStorage) {}

  async findTodos(options: {
    scope?: string;
    markers?: string[];
    groupBy?: "file" | "priority" | "marker";
    limit?: number;
  }): Promise<TodoItem[]> {
    const { markers = ["TODO", "FIXME", "HACK", "XXX", "DRAFT", "WIP"], limit } = options;

    const files = await this.storage.getAllFiles();
    const todos: TodoItem[] = [];

    for (const file of files) {
      const lines = file.content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        for (const marker of markers) {
          const regex = new RegExp(`\\b${marker}\\b:?\\s*(.*)`, "i");
          const match = line.match(regex);

          if (match) {
            todos.push({
              file: file.file_path,
              line: i + 1,
              marker,
              text: match[1] || "",
              priority: this.determinePriority(marker),
            });
          }
        }
      }
    }

    return paginateResults(todos, limit);
  }

  private determinePriority(marker: string): "high" | "medium" | "low" {
    const high = ["FIXME", "XXX", "HACK"];
    const medium = ["TODO", "WIP"];

    if (high.includes(marker.toUpperCase())) {return "high";}
    if (medium.includes(marker.toUpperCase())) {return "medium";}
    return "low";
  }
}
