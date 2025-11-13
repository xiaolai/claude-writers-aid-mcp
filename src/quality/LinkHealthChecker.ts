/**
 * LinkHealthChecker - Check internal and external links
 */

import { WritingStorage } from "../storage/WritingStorage.js";
import { paginateResults } from "../utils/pagination.js";

export interface LinkIssue {
  file: string;
  line: number;
  linkText: string;
  target: string;
  issue: "broken" | "external-unreachable" | "missing-anchor";
  severity: "error" | "warning";
}

export class LinkHealthChecker {
  constructor(private storage: WritingStorage) {}

  async checkLinks(options: {
    checkExternal?: boolean;
    scope?: string;
    limit?: number;
  }): Promise<LinkIssue[]> {
    const { checkExternal = false, limit } = options;

    const files = await this.storage.getAllFiles();
    const fileSet = new Set(files.map((f) => f.file_path));
    const issues: LinkIssue[] = [];

    for (const file of files) {
      const links = this.extractLinks(file.content);

      for (const link of links) {
        if (link.target.startsWith("http")) {
          if (checkExternal) {
            // External link check would go here
            // For now, skip external link validation
          }
        } else {
          // Internal link
          const targetFile = this.resolveInternalLink(link.target, file.file_path);

          if (!fileSet.has(targetFile)) {
            issues.push({
              file: file.file_path,
              line: link.line,
              linkText: link.text,
              target: link.target,
              issue: "broken",
              severity: "error",
            });
          }
        }
      }
    }

    return paginateResults(issues, limit);
  }

  private extractLinks(
    content: string
  ): { text: string; target: string; line: number }[] {
    const links: { text: string; target: string; line: number }[] = [];
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Markdown links [text](url)
      const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let match;

      while ((match = mdLinkRegex.exec(line)) !== null) {
        links.push({
          text: match[1],
          target: match[2],
          line: i + 1,
        });
      }

      // Wiki links [[target]]
      const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;

      while ((match = wikiLinkRegex.exec(line)) !== null) {
        links.push({
          text: match[1],
          target: match[1] + ".md",
          line: i + 1,
        });
      }
    }

    return links;
  }

  private resolveInternalLink(target: string, _currentFile: string): string {
    // Simple resolution - would be more sophisticated in real implementation
    if (target.startsWith("/")) {
      return target.substring(1);
    }

    return target;
  }
}
