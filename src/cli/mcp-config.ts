import fs from 'fs';
import path from 'path';
import os from 'os';

interface MCPServerConfig {
  type: string;
  command: string;
  args: string[];
}

interface ClaudeConfig {
  mcpServers?: Record<string, MCPServerConfig>;
  [key: string]: unknown;
}

/**
 * Get the path to Claude Code's configuration file
 */
export function getClaudeConfigPath(): string {
  return path.join(os.homedir(), '.claude.json');
}

/**
 * Detect the installation paths for Node.js and this script
 */
export function detectInstallPath(): { node: string; script: string } {
  // Use the current Node.js executable
  const nodePath = process.execPath;

  // Get the actual script path, resolving symlinks
  let scriptPath = process.argv[1];

  try {
    // Resolve symlinks to get the real installation path
    scriptPath = fs.realpathSync(scriptPath);
  } catch (error) {
    // If we can't resolve, use the path as-is
    console.warn('Warning: Could not resolve script path:', error);
  }

  return { node: nodePath, script: scriptPath };
}

/**
 * Read the Claude Code configuration file
 */
export function readClaudeConfig(): ClaudeConfig {
  const configPath = getClaudeConfigPath();

  if (!fs.existsSync(configPath)) {
    // Return minimal config if file doesn't exist
    return {};
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content) as ClaudeConfig;
  } catch (error) {
    throw new Error(`Failed to read Claude config at ${configPath}: ${error}`);
  }
}

/**
 * Write the Claude Code configuration file atomically
 */
export function writeClaudeConfig(config: ClaudeConfig): void {
  const configPath = getClaudeConfigPath();
  const tempPath = configPath + '.tmp';

  try {
    // Write to temp file first
    fs.writeFileSync(tempPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');

    // Atomic replace
    fs.renameSync(tempPath, configPath);
  } catch (error) {
    // Clean up temp file if it exists
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    throw new Error(`Failed to write Claude config: ${error}`);
  }
}

/**
 * Add or update writers-aid MCP server configuration
 */
export function addWritersAidMCP(): {
  success: boolean;
  message: string;
  alreadyExists: boolean;
  config: MCPServerConfig;
} {
  const config = readClaudeConfig();

  // Ensure mcpServers exists
  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  // Check if writers-aid already exists
  const alreadyExists = 'writers-aid' in config.mcpServers;

  // Detect installation paths
  const { node, script } = detectInstallPath();

  // Create MCP server configuration
  const mcpConfig: MCPServerConfig = {
    type: 'stdio',
    command: node,
    args: [script]
  };

  // Add/update writers-aid configuration
  config.mcpServers['writers-aid'] = mcpConfig;

  // Write back
  writeClaudeConfig(config);

  return {
    success: true,
    message: alreadyExists
      ? 'Updated writers-aid MCP configuration in ~/.claude.json'
      : 'Added writers-aid MCP configuration to ~/.claude.json',
    alreadyExists,
    config: mcpConfig
  };
}

/**
 * Remove writers-aid MCP server configuration
 */
export function removeWritersAidMCP(): { success: boolean; message: string; existed: boolean } {
  const config = readClaudeConfig();

  if (!config.mcpServers || !('writers-aid' in config.mcpServers)) {
    return {
      success: true,
      message: 'writers-aid was not configured in ~/.claude.json',
      existed: false
    };
  }

  // Remove writers-aid configuration
  delete config.mcpServers['writers-aid'];

  // Write back
  writeClaudeConfig(config);

  return {
    success: true,
    message: 'Removed writers-aid MCP configuration from ~/.claude.json',
    existed: true
  };
}

/**
 * Check if writers-aid is configured
 */
export function checkWritersAidMCP(): {
  configured: boolean;
  config?: MCPServerConfig;
} {
  const config = readClaudeConfig();

  if (!config.mcpServers || !('writers-aid' in config.mcpServers)) {
    return { configured: false };
  }

  return {
    configured: true,
    config: config.mcpServers['writers-aid']
  };
}
