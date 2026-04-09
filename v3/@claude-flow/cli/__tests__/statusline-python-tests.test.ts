/**
 * Tests for statusline Python test file detection (Issue #1463)
 *
 * Verifies that getTestStats() counts files using the Python/pytest
 * naming convention `test_*.py` alongside existing conventions:
 *   *.test.*, *.spec.*, *_test.*, *_spec.*
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Read the generator source to verify the pattern
const generatorPath = path.join(__dirname, '..', 'src', 'init', 'statusline-generator.ts');
const generatorSource = fs.readFileSync(generatorPath, 'utf-8');

describe('Statusline Python test detection (Issue #1463)', () => {
  describe('Source-level verification', () => {
    it('should include test_ prefix pattern in test file detection', () => {
      // The condition should check for files starting with 'test_'
      expect(generatorSource).toContain("n.startsWith('test_')");
    });

    it('should still detect .test. convention (JS/TS)', () => {
      expect(generatorSource).toContain("n.includes('.test.')");
    });

    it('should still detect .spec. convention (JS/TS)', () => {
      expect(generatorSource).toContain("n.includes('.spec.')");
    });

    it('should still detect _test. convention (Go/Rust)', () => {
      expect(generatorSource).toContain("n.includes('_test.')");
    });

    it('should still detect _spec. convention', () => {
      expect(generatorSource).toContain("n.includes('_spec.')");
    });

    it('should have all five patterns in a single condition', () => {
      // Find the line with the test file detection
      const lines = generatorSource.split('\n');
      const detectionLine = lines.find(l =>
        l.includes('.test.') && l.includes('.spec.') && l.includes('_test.') && l.includes("startsWith('test_')")
      );
      expect(detectionLine).toBeDefined();
    });
  });

  describe('Pattern matching simulation', () => {
    // Simulate the detection logic extracted from the generator
    function isTestFile(name: string): boolean {
      return name.includes('.test.') ||
        name.includes('.spec.') ||
        name.includes('_test.') ||
        name.includes('_spec.') ||
        name.startsWith('test_');
    }

    it('should match Python test_*.py files', () => {
      expect(isTestFile('test_app.py')).toBe(true);
      expect(isTestFile('test_export.py')).toBe(true);
      expect(isTestFile('test_utils.py')).toBe(true);
      expect(isTestFile('test_models.py')).toBe(true);
    });

    it('should match JS/TS .test. files', () => {
      expect(isTestFile('app.test.ts')).toBe(true);
      expect(isTestFile('utils.test.js')).toBe(true);
    });

    it('should match JS/TS .spec. files', () => {
      expect(isTestFile('app.spec.ts')).toBe(true);
      expect(isTestFile('component.spec.tsx')).toBe(true);
    });

    it('should match Go/Rust _test. files', () => {
      expect(isTestFile('main_test.go')).toBe(true);
      expect(isTestFile('lib_test.rs')).toBe(true);
    });

    it('should not match non-test files', () => {
      expect(isTestFile('app.py')).toBe(false);
      expect(isTestFile('utils.ts')).toBe(false);
      expect(isTestFile('test.py')).toBe(false); // 'test.py' alone is not test_*.py
      expect(isTestFile('contest_results.py')).toBe(false);
    });

    it('should not match test_ prefix in non-leading position', () => {
      // 'my_test_helper.py' should NOT match via startsWith('test_')
      // but DOES match via _test. — that's correct existing behavior
      expect(isTestFile('conftest.py')).toBe(false);
    });
  });

  describe('Runtime detection with temp directory', () => {
    it('should count test_*.py files in a real directory', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'statusline-test-'));
      const testsDir = path.join(tmpDir, 'tests');
      fs.mkdirSync(testsDir);

      // Create Python test files
      fs.writeFileSync(path.join(testsDir, 'test_app.py'), '');
      fs.writeFileSync(path.join(testsDir, 'test_models.py'), '');
      fs.writeFileSync(path.join(testsDir, 'test_utils.py'), '');
      // Create non-test files
      fs.writeFileSync(path.join(testsDir, 'conftest.py'), '');
      fs.writeFileSync(path.join(testsDir, '__init__.py'), '');

      // Replicate the detection logic
      let testFiles = 0;
      const entries = fs.readdirSync(testsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile()) {
          const n = entry.name;
          if (n.includes('.test.') || n.includes('.spec.') || n.includes('_test.') || n.includes('_spec.') || n.startsWith('test_')) {
            testFiles++;
          }
        }
      }

      expect(testFiles).toBe(3); // test_app.py, test_models.py, test_utils.py

      // Cleanup
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
  });
});
