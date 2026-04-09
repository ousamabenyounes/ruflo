/**
 * Tests for dual-mode orchestrator — codex command default and platform-specific args
 * Regression tests for #1106
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';

// Read the source file to verify the fix at the source level
const orchestratorSource = fs.readFileSync(
  new URL('../src/dual-mode/orchestrator.ts', import.meta.url),
  'utf-8'
);

describe('DualModeOrchestrator — Codex command routing (#1106)', () => {
  describe('Source-level verification', () => {
    it('codexCommand defaults to "codex", not "claude"', () => {
      // The default should be 'codex', not 'claude'
      expect(orchestratorSource).toContain("codexCommand: config.codexCommand ?? 'codex'");
      // Ensure old bug pattern is gone
      expect(orchestratorSource).not.toContain("codexCommand: config.codexCommand ?? 'claude'");
    });

    it('claudeCommand still defaults to "claude"', () => {
      expect(orchestratorSource).toContain("claudeCommand: config.claudeCommand ?? 'claude'");
    });

    it('builds platform-specific args for codex workers', () => {
      // Codex workers should use -q flag, not -p
      expect(orchestratorSource).toContain("args.push('-q', enhancedPrompt)");
    });

    it('builds platform-specific args for claude workers', () => {
      // Claude workers should use -p flag with --output-format
      expect(orchestratorSource).toContain("args.push('-p', enhancedPrompt, '--output-format', 'text')");
    });

    it('does not pass --max-turns to codex workers', () => {
      // --max-turns is Claude-specific; Codex branch should not include it
      const codexBranch = orchestratorSource.split("if (config.platform === 'codex')")[1]?.split('} else {')[0];
      expect(codexBranch).toBeDefined();
      expect(codexBranch).not.toContain('--max-turns');
    });

    it('does not pass --output-format to codex workers', () => {
      const codexBranch = orchestratorSource.split("if (config.platform === 'codex')")[1]?.split('} else {')[0];
      expect(codexBranch).toBeDefined();
      expect(codexBranch).not.toContain('--output-format');
    });
  });

  describe('Constructor defaults', () => {
    it('uses "codex" as default codexCommand when no override is provided', async () => {
      // Dynamically import to test runtime behavior
      const { DualModeOrchestrator } = await import('../src/dual-mode/orchestrator.js');
      const orchestrator = new DualModeOrchestrator({ projectPath: '/tmp/test' });
      // Access the private config via type assertion
      const config = (orchestrator as any).config;
      expect(config.codexCommand).toBe('codex');
      expect(config.claudeCommand).toBe('claude');
    });

    it('respects custom codexCommand override', async () => {
      const { DualModeOrchestrator } = await import('../src/dual-mode/orchestrator.js');
      const orchestrator = new DualModeOrchestrator({
        projectPath: '/tmp/test',
        codexCommand: '/usr/local/bin/my-codex',
      });
      const config = (orchestrator as any).config;
      expect(config.codexCommand).toBe('/usr/local/bin/my-codex');
    });
  });
});
