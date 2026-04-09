/**
 * Tests for curateIndex() non-destructive guard (Issue #1556)
 *
 * Verifies that curateIndex() does NOT overwrite an existing MEMORY.md
 * when no topic files match the DEFAULT_TOPIC_MAPPING. This prevents
 * hand-curated content from being destroyed on every Stop hook tick.
 *
 * Note: Uses source-level verification because auto-memory-bridge.ts
 * transitively imports @claude-flow/neural which doesn't resolve in
 * the test environment (pre-existing issue).
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const sourcePath = path.join(__dirname, 'auto-memory-bridge.ts');
const source = fs.readFileSync(sourcePath, 'utf-8');

describe('curateIndex() non-destructive guard (Issue #1556)', () => {
  describe('Source-level verification', () => {
    it('should have early return guard when sections is empty', () => {
      expect(source).toContain("if (Object.keys(sections).length === 0)");
    });

    it('should return early (not continue to writeFile) when no topics match', () => {
      // Find the curateIndex method body
      const curateStart = source.indexOf('async curateIndex()');
      const curateBody = source.substring(curateStart, curateStart + 1500);

      // The guard must contain a return statement
      const guardMatch = curateBody.match(/if \(Object\.keys\(sections\)\.length === 0\)\s*\{[^}]*return;/);
      expect(guardMatch).not.toBeNull();
    });

    it('should check sections before pruneSectionsToFit', () => {
      const guardIdx = source.indexOf("if (Object.keys(sections).length === 0)");
      const pruneIdx = source.indexOf('pruneSectionsToFit(sections');
      expect(guardIdx).toBeGreaterThan(-1);
      expect(pruneIdx).toBeGreaterThan(-1);
      expect(guardIdx).toBeLessThan(pruneIdx);
    });

    it('should check sections before fs.writeFile in curateIndex', () => {
      const curateStart = source.indexOf('async curateIndex()');
      const curateBody = source.substring(curateStart);
      // Find the guard and writeFile within curateIndex scope
      const guardIdx = curateBody.indexOf("Object.keys(sections).length === 0");
      const writeIdx = curateBody.indexOf('await fs.writeFile(this.getIndexPath()');

      expect(guardIdx).toBeGreaterThan(-1);
      expect(writeIdx).toBeGreaterThan(-1);
      expect(guardIdx).toBeLessThan(writeIdx);
    });

    it('should include a comment explaining why the guard exists', () => {
      const curateStart = source.indexOf('async curateIndex()');
      const curateBody = source.substring(curateStart, curateStart + 2000);
      expect(curateBody).toContain('hand-curated');
    });
  });

  describe('buildIndexLines behavior', () => {
    it('should return only header when sections is empty (confirming need for guard)', () => {
      // Extract and validate buildIndexLines logic
      const fnStart = source.indexOf('function buildIndexLines(');
      expect(fnStart).toBeGreaterThan(-1);

      const fnBody = source.substring(fnStart, fnStart + 800);
      // With empty sections, the for loop iterates over an empty array
      // and only the header lines are returned
      expect(fnBody).toContain("'# Claude Flow V3 Project Memory'");
      // The function iterates orderedCategories — when sections is empty,
      // Object.keys(sections) returns [] so orderedCategories is empty
      expect(fnBody).toContain('Object.keys(sections)');
    });
  });

  describe('DEFAULT_TOPIC_MAPPING hardcoded files', () => {
    it('should have exactly 7 hardcoded topic files', () => {
      const mappingStart = source.indexOf('DEFAULT_TOPIC_MAPPING');
      const mappingEnd = source.indexOf('};', mappingStart);
      const mappingBody = source.substring(mappingStart, mappingEnd);

      const fileMatches = mappingBody.match(/'[\w-]+\.md'/g);
      expect(fileMatches).not.toBeNull();
      expect(fileMatches!.length).toBe(7);
    });

    it('should NOT include Claude Code native naming conventions', () => {
      // Claude Code uses type_topic.md (e.g., user_role.md, project_finance.md)
      // These should NOT be in the hardcoded mapping
      const mappingStart = source.indexOf('DEFAULT_TOPIC_MAPPING');
      const mappingEnd = source.indexOf('};', mappingStart);
      const mappingBody = source.substring(mappingStart, mappingEnd);

      expect(mappingBody).not.toContain('user_');
      expect(mappingBody).not.toContain('project_');
      expect(mappingBody).not.toContain('feedback_');
      expect(mappingBody).not.toContain('reference_');
      expect(mappingBody).not.toContain('session_');
    });
  });
});
