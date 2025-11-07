/**
 * CLI Help Documentation
 */

export const COMMAND_CATEGORIES = {
  setup: {
    title: "Setup Commands",
    description: "Initialize and configure your writing project",
    commands: ["init", "config"],
  },
  search: {
    title: "Search Commands",
    description: "Find and discover content across your manuscript",
    commands: ["search", "find-related", "themes"],
  },
  structure: {
    title: "Structure Commands",
    description: "Analyze and validate document structure",
    commands: ["outline", "structure"],
  },
  quality: {
    title: "Quality Commands",
    description: "Run quality checks and validate consistency",
    commands: ["check", "terminology", "todos", "links"],
  },
  progress: {
    title: "Progress Commands",
    description: "Track writing progress and statistics",
    commands: ["stats", "changes"],
  },
};

export const COMMAND_EXAMPLES = {
  init: [
    "writers-aid init                    # Initialize in current directory",
    "writers-aid init ./my-book          # Initialize in specific directory",
  ],
  search: [
    'writers-aid search "authentication" # Search for content',
    'writers-aid search "oauth" --limit 5 # Limit results',
    'writers-aid search "api" --file chapter1.md # Search specific file',
  ],
  "find-related": [
    "writers-aid find-related chapter1.md # Find related content",
    "writers-aid find-related intro.md --limit 3 # Limit results",
  ],
  themes: [
    "writers-aid themes                  # Extract all themes",
    "writers-aid themes --num 10         # Get top 10 themes",
    "writers-aid themes --scope chapters/* # Scope to chapters",
  ],
  outline: [
    "writers-aid outline                 # Generate outline",
    "writers-aid outline --with-stats    # Include word counts",
    "writers-aid outline --depth 2       # Limit depth",
  ],
  structure: [
    "writers-aid structure chapter1.md   # Validate one file",
    "writers-aid structure --all         # Validate all files",
  ],
  check: [
    "writers-aid check                   # Run all checks",
    "writers-aid check chapter1.md       # Check specific file",
    "writers-aid check --quick           # Quick check mode",
  ],
  terminology: [
    "writers-aid terminology             # Auto-detect issues",
    'writers-aid terminology --term "email" # Check specific term',
  ],
  todos: [
    "writers-aid todos                   # List all TODOs",
    "writers-aid todos --group-by priority # Group by priority",
    "writers-aid todos --priority high   # Filter by priority",
  ],
  links: [
    "writers-aid links                   # Check all links",
    "writers-aid links --broken-only     # Show only broken links",
  ],
  stats: [
    "writers-aid stats                   # Show statistics",
    "writers-aid stats --by-chapter      # Break down by chapter",
  ],
  changes: [
    "writers-aid changes                 # Recent changes",
    "writers-aid changes --since yesterday # Changes since yesterday",
  ],
  config: [
    "writers-aid config                  # View all config",
    "writers-aid config get provider     # Get specific value",
    "writers-aid config set key value    # Set value",
  ],
};

export const TIPS = [
  "💡 Use --project to specify a different project directory",
  "💡 Run 'writers-aid check' regularly to maintain quality",
  "💡 Use 'writers-aid search' for semantic content discovery",
  "💡 Initialize with 'writers-aid init' before running other commands",
  "💡 Check 'writers-aid stats' to track your writing progress",
];

export function getCommandHelp(command: string): string {
  const examples = COMMAND_EXAMPLES[command as keyof typeof COMMAND_EXAMPLES];

  if (!examples) {
    return `No additional help available for '${command}'`;
  }

  return `\nExamples:\n${examples.join("\n")}`;
}

export function getCategoryCommands(category: keyof typeof COMMAND_CATEGORIES): string[] {
  return COMMAND_CATEGORIES[category].commands;
}

export function getRandomTip(): string {
  return TIPS[Math.floor(Math.random() * TIPS.length)];
}
