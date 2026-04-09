/**
 * Regression tests for #1567: agent_spawn MCP tool fails with 'type: Required'
 *
 * Root cause: validate-input.ts passed {agentType, name} to SpawnAgentSchema.parse()
 * but the schema expects {type, id}.
 *
 * These tests ensure:
 * 1. SpawnAgentSchema accepts the correct field names (type, id)
 * 2. SpawnAgentSchema rejects the old wrong field names (agentType, name)
 * 3. The source fix maps agentType→type and agentId→id when calling parse()
 */

import { describe, it, expect } from 'vitest';

// ============================================================================
// Direct schema tests — import SpawnAgentSchema from the local security package
// ============================================================================
describe('SpawnAgentSchema field names (#1567)', () => {
  it('accepts {type, id} — the correct field names', async () => {
    const { SpawnAgentSchema } = await import(
      '../../security/src/input-validator.js'
    );
    const result = SpawnAgentSchema.safeParse({ type: 'coder', id: 'agent-1' });
    expect(result.success).toBe(true);
  });

  it('accepts {type} without optional id field', async () => {
    const { SpawnAgentSchema } = await import(
      '../../security/src/input-validator.js'
    );
    const result = SpawnAgentSchema.safeParse({ type: 'tester' });
    expect(result.success).toBe(true);
  });

  it('rejects {agentType, name} — the old wrong field names that caused bug', async () => {
    const { SpawnAgentSchema } = await import(
      '../../security/src/input-validator.js'
    );
    // This is what validate-input.ts used to pass — must fail with "type: Required"
    const result = SpawnAgentSchema.safeParse({ agentType: 'coder', name: 'agent-1' });
    expect(result.success).toBe(false);
    const issues = result.error?.issues ?? [];
    expect(issues.some((i: any) => i.path.includes('type'))).toBe(true);
  });

  it('rejects an unknown agent type', async () => {
    const { SpawnAgentSchema } = await import(
      '../../security/src/input-validator.js'
    );
    const result = SpawnAgentSchema.safeParse({ type: 'hacker' });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Source-guard — validate-input.ts must use {type, id}, not {agentType, name}
// ============================================================================
describe('validate-input.ts source guard (#1567)', () => {
  it('passes type (not agentType) to SpawnAgentSchema.parse()', async () => {
    const { readFileSync } = await import('fs');
    const source = readFileSync(
      new URL('../src/mcp-tools/validate-input.ts', import.meta.url),
      'utf-8'
    );

    // Must NOT use the old wrong field names in the SpawnAgentSchema.parse() call
    expect(source).not.toMatch(/SpawnAgentSchema\.parse\(\s*\{[^}]*agentType:/);
    expect(source).not.toMatch(/SpawnAgentSchema\.parse\(\s*\{[^}]*name:/);

    // Must use the correct field names
    expect(source).toMatch(/SpawnAgentSchema\.parse\(\s*\{[^}]*type:/);
    expect(source).toMatch(/SpawnAgentSchema\.parse\(\s*\{[^}]*id:/);
  });
});
