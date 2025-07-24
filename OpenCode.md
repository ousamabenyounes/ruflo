# OpenCode Configuration

## Build, Lint, Test Commands
### Standard
- `npm run build`: Build the project
- `npm run lint`: Run ESLint and formatting checks
- `npm run test`: Run all tests
- `npm run test:unit`: Run unit tests
- `npm run test:integration`: Run integration tests
- `npm run typecheck`: Perform TypeScript type checking

### Single Test Commands
- `npm run test:watch`: Watch mode for tests
- `npm run test:debug`: Debug test execution
- `npm run test:coverage`: Generate test coverage reports

## Code Style Guidelines
### Imports
- Use destructure imports wherever possible (e.g., `import { foo } from 'bar'`).
- Keep import statements alphabetically sorted.

### Formatting
- Enforce Prettier rules (`npm run format`).
- Use 2-space indentation consistently.

### Typing
- All variables and functions must have explicit TypeScript types.
- Avoid using `any`. Prefer stricter types for reliability.

### Naming Conventions
- Use camelCase for variable and function names.
- Follow PascalCase for TypeScript types/interfaces.

### Error Handling
- Wrap all API operations in try-catch blocks.
- Provide meaningful error messages using custom `Error` types.

### Best Practices
- Test-driven development (TDD) is strongly recommended.
- Per file, avoid exceeding 500 lines.
- Document architectural decisions in memory storage using concurrent validation.

## SPARC Rules
- All operations must be batched for parallel execution (e.g., batch multiple file edits/tests in one command).
- Follow "1 message = all related operations" principle as stated in CLAUDE.md.

## Memory Notes
- Ensure memory operations are logged for debugging.
- Use concurrent processing for batch reads/writes.

---