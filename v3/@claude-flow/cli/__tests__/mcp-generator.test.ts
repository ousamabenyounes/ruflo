/**
 * MCP Generator Tests
 *
 * Verifies that generated MCP config uses the correct published npm package
 * name (`claude-flow`) instead of the internal directory path (`@claude-flow/cli@latest`).
 *
 * Regression test for: https://github.com/ruvnet/ruflo/issues/1014
 */

import { describe, it, expect } from 'vitest';
import { generateMCPConfig, generateMCPJson, generateMCPCommands } from '../src/init/mcp-generator.js';
import { DEFAULT_INIT_OPTIONS } from '../src/init/types.js';

const optionsWithAll = {
  ...DEFAULT_INIT_OPTIONS,
  mcp: {
    claudeFlow: true,
    ruvSwarm: true,
    flowNexus: true,
    autoStart: false,
    port: 3000,
  },
};

describe('MCP Generator', () => {
  describe('generateMCPConfig', () => {
    it('uses the published package name "claude-flow" for the MCP server args', () => {
      const config = generateMCPConfig(optionsWithAll) as {
        mcpServers: Record<string, { args?: string[]; command?: string }>;
      };
      const cfArgs = config.mcpServers['claude-flow']?.args ?? [];
      // The args array must not contain the internal path @claude-flow/cli@latest
      expect(cfArgs).not.toContain('@claude-flow/cli@latest');
      // It must include the real package name
      expect(cfArgs).toContain('claude-flow');
    });

    it('does not reference @claude-flow/cli@latest anywhere in generated config', () => {
      const json = generateMCPJson(optionsWithAll);
      expect(json).not.toContain('@claude-flow/cli@latest');
    });
  });

  describe('generateMCPCommands', () => {
    it('manual-setup commands use "claude-flow" not "@claude-flow/cli@latest"', () => {
      const commands = generateMCPCommands(optionsWithAll);
      const cfCmd = commands.find(c => c.includes('claude-flow'));
      expect(cfCmd).toBeDefined();
      expect(cfCmd).not.toContain('@claude-flow/cli@latest');
      expect(cfCmd).toContain('claude-flow mcp start');
    });

    it('none of the generated commands reference the internal @claude-flow/cli package', () => {
      const commands = generateMCPCommands(optionsWithAll);
      for (const cmd of commands) {
        expect(cmd).not.toContain('@claude-flow/cli@latest');
      }
    });
  });
});
