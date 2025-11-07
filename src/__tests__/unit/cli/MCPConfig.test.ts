/**
 * Tests for MCP Configuration functionality
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  getClaudeConfigPath,
  detectInstallPath,
  readClaudeConfig,
  writeClaudeConfig,
  addWritersAidMCP,
  removeWritersAidMCP,
  checkWritersAidMCP,
} from '../../../cli/mcp-config.js';

describe('MCP Configuration', () => {
  let tempConfigPath: string;
  let originalHomedir: () => string;

  beforeEach(() => {
    // Create a unique temporary directory for this test
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-test-'));
    tempConfigPath = path.join(tempDir, '.claude.json');

    // Mock os.homedir to return temp directory
    originalHomedir = os.homedir;
    os.homedir = () => tempDir;
  });

  afterEach(() => {
    // Restore original homedir
    os.homedir = originalHomedir;

    // Clean up temp directory and all its contents
    const tempDir = path.dirname(tempConfigPath);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('getClaudeConfigPath', () => {
    it('should return correct config path', () => {
      const configPath = getClaudeConfigPath();
      expect(configPath).toContain('.claude.json');
    });
  });

  describe('detectInstallPath', () => {
    it('should detect node and script paths', () => {
      const paths = detectInstallPath();

      expect(paths.node).toBeTruthy();
      expect(paths.script).toBeTruthy();
      expect(paths.node).toMatch(/node/);
      expect(paths.script).toMatch(/\.js$/);
    });

    it('should resolve symlinks', () => {
      const paths = detectInstallPath();

      // The resolved path should be absolute
      expect(path.isAbsolute(paths.script)).toBe(true);
    });
  });

  describe('readClaudeConfig', () => {
    it('should return empty object if config does not exist', () => {
      const config = readClaudeConfig();
      expect(config).toEqual({});
    });

    it('should read existing config', () => {
      const testConfig = {
        numStartups: 1,
        mcpServers: {
          'test-server': {
            type: 'stdio',
            command: 'test',
            args: []
          }
        }
      };

      fs.writeFileSync(
        path.join(path.dirname(tempConfigPath), '.claude.json'),
        JSON.stringify(testConfig, null, 2)
      );

      const config = readClaudeConfig();
      expect(config).toEqual(testConfig);
    });

    it('should throw error for invalid JSON', () => {
      fs.writeFileSync(
        path.join(path.dirname(tempConfigPath), '.claude.json'),
        'invalid json {'
      );

      expect(() => readClaudeConfig()).toThrow();
    });
  });

  describe('writeClaudeConfig', () => {
    it('should write config atomically', () => {
      const config = {
        numStartups: 1,
        mcpServers: {}
      };

      writeClaudeConfig(config);

      const configPath = path.join(path.dirname(tempConfigPath), '.claude.json');
      expect(fs.existsSync(configPath)).toBe(true);

      const written = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(written).toEqual(config);
    });

    it('should not leave temp file on success', () => {
      const config = { mcpServers: {} };

      writeClaudeConfig(config);

      const tempPath = path.join(path.dirname(tempConfigPath), '.claude.json.tmp');
      expect(fs.existsSync(tempPath)).toBe(false);
    });

    it('should format JSON with proper indentation', () => {
      const config = {
        numStartups: 1,
        mcpServers: {
          test: {
            type: 'stdio',
            command: 'test',
            args: []
          }
        }
      };

      writeClaudeConfig(config);

      const configPath = path.join(path.dirname(tempConfigPath), '.claude.json');
      const content = fs.readFileSync(configPath, 'utf-8');

      // Check for proper indentation (2 spaces)
      expect(content).toContain('  "numStartups"');
      expect(content).toContain('    "type"');
    });
  });

  describe('addWritersAidMCP', () => {
    it('should add writers-aid to empty config', () => {
      const result = addWritersAidMCP();

      expect(result.success).toBe(true);
      expect(result.alreadyExists).toBe(false);
      expect(result.config.type).toBe('stdio');
      expect(result.config.command).toBeTruthy();
      expect(result.config.args).toHaveLength(1);
    });

    it('should create mcpServers section if missing', () => {
      fs.writeFileSync(
        path.join(path.dirname(tempConfigPath), '.claude.json'),
        JSON.stringify({ numStartups: 1 })
      );

      addWritersAidMCP();

      const config = readClaudeConfig();
      expect(config.mcpServers).toBeDefined();
      expect(config.mcpServers?.['writers-aid']).toBeDefined();
    });

    it('should update existing writers-aid config', () => {
      fs.writeFileSync(
        path.join(path.dirname(tempConfigPath), '.claude.json'),
        JSON.stringify({
          mcpServers: {
            'writers-aid': {
              type: 'stdio',
              command: '/old/path/node',
              args: ['/old/path/script.js']
            }
          }
        })
      );

      const result = addWritersAidMCP();

      expect(result.success).toBe(true);
      expect(result.alreadyExists).toBe(true);
      expect(result.message).toContain('Updated');

      const config = readClaudeConfig();
      expect(config.mcpServers?.['writers-aid'].command).not.toBe('/old/path/node');
    });

    it('should preserve other MCP servers', () => {
      fs.writeFileSync(
        path.join(path.dirname(tempConfigPath), '.claude.json'),
        JSON.stringify({
          mcpServers: {
            'other-server': {
              type: 'stdio',
              command: 'other',
              args: []
            }
          }
        })
      );

      addWritersAidMCP();

      const config = readClaudeConfig();
      expect(config.mcpServers?.['other-server']).toBeDefined();
      expect(config.mcpServers?.['writers-aid']).toBeDefined();
    });

    it('should preserve other config fields', () => {
      fs.writeFileSync(
        path.join(path.dirname(tempConfigPath), '.claude.json'),
        JSON.stringify({
          numStartups: 759,
          customField: 'value',
          mcpServers: {}
        })
      );

      addWritersAidMCP();

      const config = readClaudeConfig();
      expect(config.numStartups).toBe(759);
      expect((config as Record<string, unknown>).customField).toBe('value');
    });
  });

  describe('removeWritersAidMCP', () => {
    it('should remove writers-aid config', () => {
      fs.writeFileSync(
        path.join(path.dirname(tempConfigPath), '.claude.json'),
        JSON.stringify({
          mcpServers: {
            'writers-aid': {
              type: 'stdio',
              command: 'node',
              args: ['script.js']
            }
          }
        })
      );

      const result = removeWritersAidMCP();

      expect(result.success).toBe(true);
      expect(result.existed).toBe(true);

      const config = readClaudeConfig();
      expect(config.mcpServers?.['writers-aid']).toBeUndefined();
    });

    it('should handle non-existent config gracefully', () => {
      const result = removeWritersAidMCP();

      expect(result.success).toBe(true);
      expect(result.existed).toBe(false);
      expect(result.message).toContain('not configured');
    });

    it('should preserve other MCP servers when removing', () => {
      fs.writeFileSync(
        path.join(path.dirname(tempConfigPath), '.claude.json'),
        JSON.stringify({
          mcpServers: {
            'writers-aid': {
              type: 'stdio',
              command: 'node',
              args: []
            },
            'other-server': {
              type: 'stdio',
              command: 'other',
              args: []
            }
          }
        })
      );

      removeWritersAidMCP();

      const config = readClaudeConfig();
      expect(config.mcpServers?.['writers-aid']).toBeUndefined();
      expect(config.mcpServers?.['other-server']).toBeDefined();
    });
  });

  describe('checkWritersAidMCP', () => {
    it('should return false when not configured', () => {
      const result = checkWritersAidMCP();

      expect(result.configured).toBe(false);
      expect(result.config).toBeUndefined();
    });

    it('should return true when configured', () => {
      fs.writeFileSync(
        path.join(path.dirname(tempConfigPath), '.claude.json'),
        JSON.stringify({
          mcpServers: {
            'writers-aid': {
              type: 'stdio',
              command: '/path/to/node',
              args: ['/path/to/script.js']
            }
          }
        })
      );

      const result = checkWritersAidMCP();

      expect(result.configured).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.config?.type).toBe('stdio');
      expect(result.config?.command).toBe('/path/to/node');
    });

    it('should return config details', () => {
      const expectedConfig = {
        type: 'stdio',
        command: '/test/node',
        args: ['/test/script.js']
      };

      fs.writeFileSync(
        path.join(path.dirname(tempConfigPath), '.claude.json'),
        JSON.stringify({
          mcpServers: {
            'writers-aid': expectedConfig
          }
        })
      );

      const result = checkWritersAidMCP();

      expect(result.config).toEqual(expectedConfig);
    });
  });

  describe('Error handling', () => {
    it('should handle write errors gracefully', () => {
      const configPath = path.join(path.dirname(tempConfigPath), '.claude.json');

      // Clean up any existing file or directory first
      if (fs.existsSync(configPath)) {
        const stats = fs.statSync(configPath);
        if (stats.isDirectory()) {
          fs.rmdirSync(configPath, { recursive: true });
        } else {
          fs.unlinkSync(configPath);
        }
      }

      // Create a directory where config file should be to cause write error
      fs.mkdirSync(configPath, { recursive: true });

      expect(() => writeClaudeConfig({ mcpServers: {} })).toThrow();

      // Cleanup
      fs.rmdirSync(configPath, { recursive: true });
    });
  });
});
