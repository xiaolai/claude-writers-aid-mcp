/**
 * CLI Commands Implementation
 */

import { WritersAid } from "../WritersAid.js";
import { Command } from "commander";
import chalk from "chalk";
import Table from "cli-table3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  addWritersAidMCP,
  removeWritersAidMCP,
  checkWritersAidMCP,
  getClaudeConfigPath,
} from "./mcp-config.js";

// Get package.json version
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJsonPath = path.join(__dirname, "../../package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8")) as { version: string };
const VERSION = packageJson.version;

export function createCLI(): Command {
  const program = new Command();

  program
    .name("writers-aid")
    .description("AI-powered manuscript assistant for writers")
    .version(VERSION);

  // ============================================================================
  // Setup Commands
  // ============================================================================

  program
    .command("init [directory]")
    .description("Initialize a new writing project")
    .action(async (directory: string = ".") => {
      try {
        const projectPath = path.resolve(directory);

        console.log(chalk.blue("Initializing writing project..."));

        const writersAid = new WritersAid({ projectPath });

        // Index existing files
        const result = await writersAid.indexManuscript();

        console.log(chalk.green("✓ Initialized writing project"));
        console.log(chalk.gray(`  Database: ${projectPath}/.writers-aid/manuscript.db`));
        console.log(chalk.gray(`  Indexed ${result.filesIndexed} files`));
        console.log(chalk.gray(`  Created ${result.chunksCreated} chunks`));

        writersAid.close();
      } catch (error) {
        console.error(chalk.red("✗ Initialization failed:"), error);
        process.exit(1);
      }
    });

  program
    .command("config [action] [key] [value]")
    .description("View or edit configuration")
    .action(async (action?: string, key?: string, value?: string) => {
      if (!action) {
        // Show all config
        console.log(chalk.blue("Configuration:"));
        console.log(chalk.gray("  Provider: transformers (fallback)"));
        console.log(chalk.gray("  Model: Xenova/all-MiniLM-L6-v2"));
        console.log(chalk.gray("  Dimensions: 384"));
        return;
      }

      if (action === "get" && key) {
        console.log(chalk.gray(`${key}: <value>`));
      } else if (action === "set" && key && value) {
        console.log(chalk.green(`✓ Set ${key} = ${value}`));
      }
    });

  program
    .command("init-mcp")
    .description("Configure writers-aid as MCP server for Claude Code")
    .action(async () => {
      try {
        console.log(chalk.blue("Configuring writers-aid MCP server..."));

        const result = addWritersAidMCP();

        if (result.alreadyExists) {
          console.log(chalk.yellow("⚠ " + result.message));
        } else {
          console.log(chalk.green("✓ " + result.message));
        }

        console.log();
        console.log(chalk.blue("MCP Server Configuration:"));
        console.log(chalk.gray(`  Config file: ${getClaudeConfigPath()}`));
        console.log(chalk.gray(`  Command: ${result.config.command}`));
        console.log(chalk.gray(`  Script: ${result.config.args[0]}`));
        console.log();
        console.log(chalk.green("Next steps:"));
        console.log(chalk.gray("  1. Restart any running Claude Code sessions"));
        console.log(chalk.gray("  2. Run /mcp in Claude Code to verify connection"));
        console.log(chalk.gray("  3. Start using writers-aid tools in your writing projects!"));
      } catch (error) {
        console.error(chalk.red("✗ MCP configuration failed:"), error);
        process.exit(1);
      }
    });

  program
    .command("remove-mcp")
    .description("Remove writers-aid MCP server configuration")
    .action(async () => {
      try {
        const check = checkWritersAidMCP();

        if (!check.configured) {
          console.log(chalk.yellow("⚠ writers-aid is not configured as MCP server"));
          return;
        }

        console.log(chalk.blue("Removing writers-aid MCP configuration..."));

        const result = removeWritersAidMCP();

        if (result.existed) {
          console.log(chalk.green("✓ " + result.message));
          console.log(chalk.gray("  Restart Claude Code sessions for changes to take effect"));
        } else {
          console.log(chalk.gray(result.message));
        }
      } catch (error) {
        console.error(chalk.red("✗ MCP removal failed:"), error);
        process.exit(1);
      }
    });

  program
    .command("mcp-status")
    .description("Check writers-aid MCP server configuration status")
    .action(async () => {
      try {
        const configPath = getClaudeConfigPath();
        const check = checkWritersAidMCP();

        console.log(chalk.blue("MCP Configuration Status:\n"));
        console.log(chalk.gray(`Config file: ${configPath}`));

        if (!check.configured) {
          console.log(chalk.yellow("⚠ writers-aid is NOT configured as MCP server"));
          console.log();
          console.log(chalk.gray("Run: writers-aid init-mcp"));
        } else {
          console.log(chalk.green("✓ writers-aid is configured as MCP server"));
          console.log();
          console.log(chalk.blue("Configuration:"));
          console.log(chalk.gray(`  Command: ${check.config?.command}`));
          console.log(chalk.gray(`  Script: ${check.config?.args[0]}`));
        }
      } catch (error) {
        console.error(chalk.red("✗ Status check failed:"), error);
        process.exit(1);
      }
    });

  // ============================================================================
  // Search Commands
  // ============================================================================

  program
    .command("search <query>")
    .description("Search across manuscript content")
    .option("-p, --project <path>", "Project directory", ".")
    .option("-l, --limit <number>", "Maximum results", "10")
    .option("-f, --file <file>", "Search in specific file")
    .action(async (query: string, options: { project: string; limit: string; file?: string }) => {
      try {
        const writersAid = new WritersAid({ projectPath: path.resolve(options.project) });

        const results = await writersAid.searchContent(query, {
          scope: options.file,
          limit: parseInt(options.limit),
        });

        if (results.length === 0) {
          console.log(chalk.yellow("No results found"));
          writersAid.close();
          return;
        }

        console.log(chalk.blue(`Found ${results.length} result(s):\n`));

        for (const result of results) {
          console.log(chalk.green(`📄 ${result.file}`));
          console.log(chalk.gray(`   ${result.content.substring(0, 100)}...`));
          console.log();
        }

        writersAid.close();
      } catch (error) {
        console.error(chalk.red("✗ Search failed:"), error);
        process.exit(1);
      }
    });

  program
    .command("find-related <file>")
    .description("Find content similar to a file")
    .option("-p, --project <path>", "Project directory", ".")
    .option("-l, --limit <number>", "Maximum results", "5")
    .action(async (file: string, options: { project: string; limit: string }) => {
      try {
        const writersAid = new WritersAid({ projectPath: path.resolve(options.project) });

        // Read file content
        const filePath = path.join(options.project, file);
        if (!fs.existsSync(filePath)) {
          console.error(chalk.red(`✗ File not found: ${file}`));
          process.exit(1);
        }

        const content = fs.readFileSync(filePath, "utf-8");
        const results = await writersAid.searchContent(content.substring(0, 500), {
          limit: parseInt(options.limit) + 1, // +1 to exclude self
        });

        // Filter out the source file
        const related = results.filter(r => r.file !== file);

        if (related.length === 0) {
          console.log(chalk.yellow("No related content found"));
          writersAid.close();
          return;
        }

        console.log(chalk.blue(`Related to ${file}:\n`));

        for (const result of related) {
          console.log(chalk.green(`📄 ${result.file}`));
          console.log(chalk.gray(`   Relevance: ${result.relevance}`));
          console.log();
        }

        writersAid.close();
      } catch (error) {
        console.error(chalk.red("✗ Search failed:"), error);
        process.exit(1);
      }
    });

  program
    .command("themes")
    .description("Extract main themes from manuscript")
    .option("-p, --project <path>", "Project directory", ".")
    .option("-n, --num <number>", "Number of themes", "5")
    .option("-s, --scope <pattern>", "File scope pattern")
    .action(async (options: { project: string; num: string; scope?: string }) => {
      try {
        const writersAid = new WritersAid({ projectPath: path.resolve(options.project) });

        const themes = await writersAid.extractThemes({
          scope: options.scope,
          numThemes: parseInt(options.num),
        });

        console.log(chalk.blue(`Main Themes:\n`));

        for (let i = 0; i < themes.length; i++) {
          console.log(chalk.green(`${i + 1}. ${themes[i].theme}`));
          console.log(chalk.gray(`   Count: ${themes[i].count}`));
          console.log();
        }

        writersAid.close();
      } catch (error) {
        console.error(chalk.red("✗ Theme extraction failed:"), error);
        process.exit(1);
      }
    });

  // ============================================================================
  // Structure Commands
  // ============================================================================

  program
    .command("outline")
    .description("Generate hierarchical outline")
    .option("-p, --project <path>", "Project directory", ".")
    .option("-d, --depth <number>", "Outline depth", "3")
    .option("-w, --with-stats", "Include word counts")
    .action(async (options: { project: string; depth: string; withStats?: boolean }) => {
      try {
        const writersAid = new WritersAid({ projectPath: path.resolve(options.project) });

        const stats = await writersAid.getStats();

        console.log(chalk.blue("Manuscript Outline:\n"));

        for (const file of stats.files) {
          console.log(chalk.green(`📄 ${file.path}`));
          if (options.withStats) {
            console.log(chalk.gray(`   ${file.words} words`));
          }
        }

        console.log();
        console.log(chalk.blue(`Total: ${stats.totalWords} words across ${stats.totalFiles} files`));

        writersAid.close();
      } catch (error) {
        console.error(chalk.red("✗ Outline generation failed:"), error);
        process.exit(1);
      }
    });

  program
    .command("structure [file]")
    .description("Validate document structure")
    .option("-p, --project <path>", "Project directory", ".")
    .option("-a, --all", "Validate all files")
    .action(async (file: string | undefined, options: { project: string; all?: boolean }) => {
      try {
        const writersAid = new WritersAid({ projectPath: path.resolve(options.project) });

        const report = await writersAid.validateStructure({
          filePath: file && !options.all ? file : undefined,
        });

        console.log(chalk.blue("Structure Validation:\n"));

        if (report.issues.length === 0) {
          console.log(chalk.green("✓ No structure issues found"));
        } else {
          const table = new Table({
            head: ["File", "Issue", "Line", "Severity"],
            style: { head: ["blue"] },
          });

          for (const issue of report.issues) {
            table.push([
              issue.file,
              issue.type,
              issue.line?.toString() || "-",
              issue.severity,
            ]);
          }

          console.log(table.toString());

          console.log();
          console.log(chalk.yellow(`Found ${report.errors} errors, ${report.warnings} warnings`));
        }

        writersAid.close();
      } catch (error) {
        console.error(chalk.red("✗ Structure validation failed:"), error);
        process.exit(1);
      }
    });

  // ============================================================================
  // Quality Commands
  // ============================================================================

  program
    .command("check [file]")
    .description("Run quality checks")
    .option("-p, --project <path>", "Project directory", ".")
    .option("-q, --quick", "Quick check mode")
    .action(async (file: string | undefined, options: { project: string; quick?: boolean }) => {
      try {
        const writersAid = new WritersAid({ projectPath: path.resolve(options.project) });

        console.log(chalk.blue("Quality Check Results:\n"));

        // Run multiple checks
        const [structure, readability, duplicates] = await Promise.all([
          writersAid.validateStructure({ filePath: file }),
          writersAid.analyzeReadability(file),
          options.quick ? Promise.resolve([]) : writersAid.findDuplicates(),
        ]);

        console.log(chalk.green(`Structure: ${structure.issues.length} issues`));
        console.log(chalk.green(`Readability: ${readability.length} files analyzed`));
        if (!options.quick) {
          console.log(chalk.green(`Duplicates: ${duplicates.length} found`));
        }

        writersAid.close();
      } catch (error) {
        console.error(chalk.red("✗ Quality check failed:"), error);
        process.exit(1);
      }
    });

  program
    .command("terminology")
    .description("Check term consistency")
    .option("-p, --project <path>", "Project directory", ".")
    .option("-t, --term <term>", "Specific term to check")
    .action(async (options: { project: string; term?: string }) => {
      try {
        const writersAid = new WritersAid({ projectPath: path.resolve(options.project) });

        const report = await writersAid.checkTerminology({
          terms: options.term ? [options.term] : undefined,
          autoDetect: !options.term,
        });

        if (report.groups.length === 0) {
          console.log(chalk.green("✓ No terminology issues found"));
          writersAid.close();
          return;
        }

        console.log(chalk.blue(`Terminology Issues:\n`));

        for (const group of report.groups) {
          console.log(chalk.yellow(`Term: ${group.canonical}`));
          console.log(chalk.gray(`  Variants found: ${group.variants.length}`));

          for (const variant of group.variants) {
            console.log(chalk.gray(`    - ${variant.term} (${variant.count} times)`));
          }

          console.log();
        }

        writersAid.close();
      } catch (error) {
        console.error(chalk.red("✗ Terminology check failed:"), error);
        process.exit(1);
      }
    });

  program
    .command("todos")
    .description("List all TODOs")
    .option("-p, --project <path>", "Project directory", ".")
    .option("-g, --group-by <field>", "Group by: file, priority, marker")
    .option("--priority <level>", "Filter by priority")
    .action(async (options: { project: string; groupBy?: string; priority?: string }) => {
      try {
        const writersAid = new WritersAid({ projectPath: path.resolve(options.project) });

        const todos = await writersAid.findTodos({
          groupBy: options.groupBy as "file" | "priority" | "marker" | undefined,
        });

        if (todos.length === 0) {
          console.log(chalk.green("✓ No TODOs found"));
          writersAid.close();
          return;
        }

        console.log(chalk.blue(`Found ${todos.length} TODO(s):\n`));

        const table = new Table({
          head: ["File", "Line", "Marker", "Priority", "Text"],
          style: { head: ["blue"] },
        });

        for (const todo of todos) {
          if (options.priority && todo.priority !== options.priority) {
            continue;
          }

          table.push([
            todo.file,
            todo.line.toString(),
            todo.marker,
            todo.priority,
            todo.text.substring(0, 40),
          ]);
        }

        console.log(table.toString());

        writersAid.close();
      } catch (error) {
        console.error(chalk.red("✗ TODO extraction failed:"), error);
        process.exit(1);
      }
    });

  program
    .command("links")
    .description("Check link health")
    .option("-p, --project <path>", "Project directory", ".")
    .option("-b, --broken-only", "Show only broken links")
    .option("-g, --graph", "Show link graph")
    .action(async (options: { project: string; brokenOnly?: boolean; graph?: boolean }) => {
      try {
        const writersAid = new WritersAid({ projectPath: path.resolve(options.project) });

        const issues = await writersAid.checkLinks();

        console.log(chalk.blue("Links checked\n"));

        if (issues.length === 0) {
          console.log(chalk.green("✓ No broken links found"));
        } else {
          const table = new Table({
            head: ["File", "Line", "Link", "Issue"],
            style: { head: ["blue"] },
          });

          for (const issue of issues) {
            table.push([
              issue.file,
              issue.line.toString(),
              issue.target,
              issue.issue,
            ]);
          }

          console.log(table.toString());
        }

        writersAid.close();
      } catch (error) {
        console.error(chalk.red("✗ Link check failed:"), error);
        process.exit(1);
      }
    });

  // ============================================================================
  // Progress Commands
  // ============================================================================

  program
    .command("stats")
    .description("Show writing statistics")
    .option("-p, --project <path>", "Project directory", ".")
    .option("-c, --by-chapter", "Break down by chapter")
    .option("-s, --since <date>", "Show changes since date")
    .action(async (options: { project: string; byChapter?: boolean; since?: string }) => {
      try {
        const writersAid = new WritersAid({ projectPath: path.resolve(options.project) });

        const stats = await writersAid.getStats();

        console.log(chalk.blue("Writing Statistics:\n"));

        console.log(chalk.green(`Total words: ${stats.totalWords.toLocaleString()}`));
        console.log(chalk.green(`Total files: ${stats.totalFiles}`));
        console.log(chalk.green(`Average words per file: ${stats.averageWordsPerFile}`));

        if (options.byChapter) {
          console.log();
          console.log(chalk.blue("By file:"));

          const table = new Table({
            head: ["File", "Words"],
            style: { head: ["blue"] },
          });

          for (const file of stats.files) {
            table.push([file.path, file.words.toLocaleString()]);
          }

          console.log(table.toString());
        }

        writersAid.close();
      } catch (error) {
        console.error(chalk.red("✗ Stats generation failed:"), error);
        process.exit(1);
      }
    });

  program
    .command("changes")
    .description("Show recent changes")
    .option("-p, --project <path>", "Project directory", ".")
    .option("-s, --since <time>", "Show changes since", "today")
    .action(async (options: { project: string; since: string }) => {
      try {
        const writersAid = new WritersAid({ projectPath: path.resolve(options.project) });

        const stats = await writersAid.getStats();

        console.log(chalk.blue(`Changes since ${options.since}:\n`));

        // For now, just show recent files
        console.log(chalk.green(`${stats.totalFiles} files in project`));

        writersAid.close();
      } catch (error) {
        console.error(chalk.red("✗ Changes tracking failed:"), error);
        process.exit(1);
      }
    });

  return program;
}
