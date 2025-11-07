/**
 * LinkAnalyzer - Extract and analyze links in markdown
 * Supports wiki-style [[links]], markdown [text](url), external URLs, and anchors
 */

import { nanoid } from "nanoid";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import type {
  MarkdownLink,
  MarkdownFile,
  LinkType,
  LinkGraph,
  LinkGraphNode,
  LinkGraphEdge,
} from "../markdown/types.js";

/**
 * LinkAnalyzer class
 */
export class LinkAnalyzer {
  /**
   * Extract all links from markdown content
   */
  extractLinks(
    fileId: string,
    filePath: string,
    content: string
  ): MarkdownLink[] {
    const links: MarkdownLink[] = [];
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Extract wiki-style links [[link]]
      const wikiLinks = this.extractWikiLinks(line);
      for (const link of wikiLinks) {
        links.push({
          id: nanoid(),
          source_file_id: fileId,
          target_file_path: link.target,
          link_text: link.text,
          link_type: "wiki",
          source_line: lineNumber,
          is_broken: this.checkBrokenLink(filePath, link.target, "wiki"),
        });
      }

      // Extract markdown links [text](url)
      const markdownLinks = this.extractMarkdownLinks(line);
      for (const link of markdownLinks) {
        const type = this.determineLinkType(link.target);
        links.push({
          id: nanoid(),
          source_file_id: fileId,
          target_file_path: link.target,
          link_text: link.text,
          link_type: type,
          source_line: lineNumber,
          is_broken: this.checkBrokenLink(filePath, link.target, type),
        });
      }
    }

    return links;
  }

  /**
   * Extract wiki-style links [[link]] or [[text|link]]
   */
  private extractWikiLinks(
    line: string
  ): Array<{ text: string | null; target: string }> {
    const links: Array<{ text: string | null; target: string }> = [];
    const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
    let match;

    while ((match = wikiLinkRegex.exec(line)) !== null) {
      const content = match[1];

      // Check for [[text|link]] format
      if (content.includes("|")) {
        const [text, target] = content.split("|", 2);
        links.push({ text: text.trim(), target: target.trim() });
      } else {
        // [[link]] format - text is same as target
        links.push({ text: null, target: content.trim() });
      }
    }

    return links;
  }

  /**
   * Extract markdown links [text](url)
   */
  private extractMarkdownLinks(
    line: string
  ): Array<{ text: string; target: string }> {
    const links: Array<{ text: string; target: string }> = [];
    const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;

    while ((match = markdownLinkRegex.exec(line)) !== null) {
      links.push({
        text: match[1],
        target: match[2],
      });
    }

    return links;
  }

  /**
   * Determine link type from target
   */
  private determineLinkType(target: string): LinkType {
    if (target.startsWith("http://") || target.startsWith("https://")) {
      return "external";
    }

    if (target.startsWith("#")) {
      return "anchor";
    }

    return "markdown";
  }

  /**
   * Check if a link is broken
   */
  private checkBrokenLink(
    sourceFilePath: string,
    targetPath: string,
    linkType: LinkType
  ): boolean {
    // External links - assume not broken (would need HTTP check)
    if (linkType === "external") {
      return false;
    }

    // Anchor links - would need to check heading existence
    if (linkType === "anchor") {
      return false; // TODO: Check if heading exists
    }

    // For wiki and markdown links, check if file exists
    try {
      const sourceDir = dirname(sourceFilePath);
      let resolvedPath: string;

      // Wiki links are typically relative to a root directory
      // For now, assume they're relative to source file
      if (linkType === "wiki") {
        // Convert [[link]] to file path (assuming .md extension)
        const targetFile = targetPath.endsWith(".md")
          ? targetPath
          : `${targetPath}.md`;
        resolvedPath = resolve(sourceDir, targetFile);
      } else {
        // Markdown links are relative to source file
        resolvedPath = resolve(sourceDir, targetPath);
      }

      return !existsSync(resolvedPath);
    } catch {
      return true; // Consider it broken if we can't resolve the path
    }
  }

  /**
   * Build link graph from files and links
   */
  buildLinkGraph(
    files: MarkdownFile[],
    allLinks: MarkdownLink[]
  ): LinkGraph {
    const nodes: LinkGraphNode[] = [];
    const edges: LinkGraphEdge[] = [];

    // Create nodes for each file
    for (const file of files) {
      const incomingLinks = allLinks.filter(
        (link) => link.target_file_path === file.file_path
      ).length;
      const outgoingLinks = allLinks.filter(
        (link) => link.source_file_id === file.id
      ).length;

      nodes.push({
        id: file.id,
        file_path: file.file_path,
        title: file.title,
        incomingLinks,
        outgoingLinks,
      });
    }

    // Create edges for each link
    for (const link of allLinks) {
      // Only create edges for internal links (not external)
      if (link.link_type === "wiki" || link.link_type === "markdown") {
        // Find target file
        const targetFile = files.find(
          (f) =>
            f.file_path === link.target_file_path ||
            f.file_path.endsWith(link.target_file_path)
        );

        if (targetFile) {
          edges.push({
            source: link.source_file_id,
            target: targetFile.id,
            text: link.link_text,
            type: link.link_type,
          });
        }
      }
    }

    return { nodes, edges };
  }

  /**
   * Find orphaned files (no incoming or outgoing links)
   */
  findOrphanedFiles(
    files: MarkdownFile[],
    allLinks: MarkdownLink[]
  ): string[] {
    const orphaned: string[] = [];

    for (const file of files) {
      const hasIncoming = allLinks.some(
        (link) => link.target_file_path === file.file_path
      );
      const hasOutgoing = allLinks.some(
        (link) => link.source_file_id === file.id
      );

      if (!hasIncoming && !hasOutgoing) {
        orphaned.push(file.file_path);
      }
    }

    return orphaned;
  }

  /**
   * Find broken links
   */
  getBrokenLinks(allLinks: MarkdownLink[]): MarkdownLink[] {
    return allLinks.filter((link) => link.is_broken);
  }

  /**
   * Get backlinks for a file (files that link to this file)
   */
  getBacklinks(
    _fileId: string,
    filePath: string,
    allLinks: MarkdownLink[]
  ): MarkdownLink[] {
    return allLinks.filter((link) => link.target_file_path === filePath);
  }

  /**
   * Get outgoing links from a file
   */
  getOutgoingLinks(fileId: string, allLinks: MarkdownLink[]): MarkdownLink[] {
    return allLinks.filter((link) => link.source_file_id === fileId);
  }
}
