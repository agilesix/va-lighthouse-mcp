# Agent Instructions for VA Lighthouse MCP Server

This document provides comprehensive guidance for autonomous agent operation in the VA Lighthouse MCP Server codebase. Follow these instructions to reliably make changes, maintain code quality, and ensure proper testing.

## Environment Setup

### Automatic Setup (Remote Sessions)

When running in Claude Code web (remote environment):

1. **Dependency Installation**: The SessionStart hook automatically detects the remote environment via `CLAUDE_CODE_REMOTE` and runs `npm install`
2. **Verification**: Check that dependencies installed successfully:
   ```bash
   node --version  # Should show v18+ or v20+
   npm --version   # Should show v9+ or v10+
   ls node_modules # Should show installed packages
   ```

### Manual Verification (If Needed)

If automatic setup didn't run or you need to verify:

```bash
# Check if npm is available
npm --version

# Install dependencies manually if needed
npm install

# Verify key dependencies
ls node_modules/@modelcontextprotocol/sdk
ls node_modules/zod
ls node_modules/vitest
```

### Environment Detection

Check if you're in a remote session:

```bash
echo $CLAUDE_CODE_REMOTE
# If set, you're in a remote environment
# If empty, you're in a local environment
```

Remote environments have:
- Limited network access (allowlisted domains only)
- GitHub proxy for git operations
- No Cloudflare deployment capability
- Isolated VMs for each session

## Development Workflow

### Before Making Changes

1. **Read existing code**: Always read the relevant files before modifying them
2. **Understand the architecture**: Review CLAUDE.md and relevant docs/
3. **Check current tests**: Understand existing test coverage
4. **Verify dev server works**: Run `npm run dev` and test health endpoint

### Making Changes

1. **Modify source code**: Make focused, incremental changes
2. **Run type-check**: `npm run type-check` - TypeScript must pass
3. **Format code**: `npm run format` - Use Biome formatter
4. **Fix linting**: `npm run lint:fix` - Auto-fix linting issues
5. **Run tests**: `npm run test:all` - All tests must pass
6. **Update docs**: If behavior changed, update relevant documentation

### After Changes

1. **Verify all checks pass**:
   ```bash
   npm run type-check  # TypeScript validation
   npm run test:all    # All 314 tests
   npm run format      # Code formatting
   npm run lint:fix    # Linting
   ```

2. **Review changes**: Ensure changes are minimal and focused
3. **Update documentation**: If adding features or changing behavior
4. **Commit with clear message**: Follow conventional commits format

## Testing Strategy

### Unit Tests (226 tests, 94% coverage target)

**Purpose**: Test pure logic, algorithms, and individual functions in isolation

**Run**: `npm run test:unit`

**Location**: `test/unit/`

**Coverage**: `npm run test:coverage` (generates report in `coverage/`)

**Key Points**:
- Uses Cloudflare Workers pool for deployment compatibility
- Mock external dependencies (fetch, API calls)
- Keep tests isolated and deterministic
- Each test should be self-contained
- Use descriptive test names: `it("should handle null type schemas", ...)`

**Example**:
```typescript
it("should validate SSN pattern correctly", () => {
  const schema = { type: "string", pattern: "^\\d{9}$" };
  const zodSchema = jsonSchemaToZod(schema);

  expect(zodSchema.safeParse("123456789").success).toBe(true);
  expect(zodSchema.safeParse("123-45-6789").success).toBe(false);
});
```

### Integration Tests (88 tests)

**Purpose**: Test complete MCP protocol flows and tool interactions

**Run**:
```bash
# Terminal 1 (or background process)
npm run dev

# Terminal 2
npm run test:integration
```

**Location**: `test/integration/`

**Key Points**:
- **REQUIRES DEV SERVER RUNNING** - tests connect to `http://localhost:8788/sse`
- Tests real HTTP communication
- Validates MCP protocol compliance
- Tests all 13 MCP tools end-to-end
- Uses test harness for standardized communication

**Important**: If integration tests fail with connection errors, check:
1. Is `npm run dev` running?
2. Is port 8788 available?
3. Does `curl http://localhost:8788/health` respond with status ok?

### Coverage Targets

Maintain these coverage levels:

- **Overall**: 94%+
- **openapi-parser**: 95%+
- **api-client**: 95%+
- **json-schema-to-zod**: 90%+
- **validator**: 85%+

**Check coverage**:
```bash
npm run test:coverage        # Generate coverage report
npm run test:coverage:open   # Open HTML report (local only)
```

**Identify gaps**: Look in `coverage/index.html` for uncovered lines

### Running Tests Efficiently

```bash
# Full test suite (recommended before commits)
npm run test:all

# Quick unit test iteration
npm run test:unit

# Watch mode for active development (unit tests only)
npm run test:watch

# Integration tests only (requires dev server)
npm run test:integration
```

## Code Quality Standards

### TypeScript

- **Strict mode enabled**: All code must pass `npm run type-check`
- **No `any` types**: Use proper types or `unknown` with type guards
- **Export types**: Export interfaces/types that are used across files
- **Zod for validation**: Use Zod schemas for runtime type checking

**Example**:
```typescript
// Good
export interface ApiMetadata {
  id: string;
  name: string;
  versions: string[];
}

// Bad
export interface ApiMetadata {
  id: any;  // Don't use 'any'
  name: string;
  versions: any[];  // Don't use 'any'
}
```

### Formatting & Linting

- **Use Biome**: `npm run format` and `npm run lint:fix`
- **No trailing whitespace**
- **Consistent indentation** (tabs)
- **Semicolons required**
- **Double quotes for strings**

**Auto-fix**:
```bash
npm run format      # Fix formatting
npm run lint:fix    # Fix linting issues
```

### Error Handling

- **User-friendly messages**: Errors should explain what went wrong and how to fix it
- **Structured errors**: Use consistent error format across tools
- **Include context**: Field names, expected values, received values
- **Suggest fixes**: When possible, suggest how to correct the error

**Example**:
```typescript
// Good
return {
  content: [{
    type: "text",
    text: `Field 'ssn' must be 9 digits without hyphens.\nReceived: "${value}"\nExpected format: "123456789"`
  }],
  isError: true
};

// Bad
return {
  content: [{ type: "text", text: "Invalid SSN" }],
  isError: true
};
```

### Code Organization

Follow existing patterns:

- **Services** (`src/services/`): Core infrastructure (cache, API client, parser, validator)
- **Tools** (`src/tools/`): MCP tool implementations (4 files, 13 tools)
- **Utils** (`src/utils/`): Helper functions (error formatting, example generation)
- **Types** (`src/types/`): TypeScript type definitions
- **Tests mirror source**: `test/unit/services/`, `test/unit/utils/`

## Git Workflow

### Commit Message Format

Use conventional commits:

```
<type>(<scope>): <description>

<optional body>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Test updates
- `refactor`: Code refactoring
- `chore`: Build/tooling changes
- `perf`: Performance improvements

**Scopes**:
- `tools`: MCP tools
- `services`: Core services
- `validation`: Validation logic
- `cache`: Caching
- `tests`: Test infrastructure
- `docs`: Documentation

**Examples**:
```
feat(tools): Add field-level validation rules to get_validation_rules

Added fieldPath parameter to get_validation_rules tool, enabling detailed
validation rule exploration for specific fields using dot-notation paths.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

```
fix(validation): Handle null values in JSON schema conversion

Fixed issue where null type schemas caused validation errors. Added proper
null handling in jsonSchemaToZod converter.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Before Committing

**Always run these checks**:
```bash
npm run type-check   # TypeScript must pass
npm run test:all     # All tests must pass
npm run format       # Code must be formatted
npm run lint:fix     # No linting errors
```

**Never commit**:
- `node_modules/`
- `coverage/`
- `.wrangler/`
- `.dev.vars`
- `.claude/settings.local.json`
- `*.log`
- `.DS_Store`

These are already in `.gitignore`.

## Common Tasks

### Adding a New MCP Tool

**Location**: `src/tools/` (choose appropriate file based on category)

**Steps**:

1. **Add tool implementation** in appropriate tools file:
   ```typescript
   server.tool(
     "tool_name",
     "Tool description",
     {
       param1: z.string().describe("Parameter description"),
       param2: z.number().optional().describe("Optional parameter"),
     },
     async ({ param1, param2 }) => {
       try {
         // Implementation
         return {
           content: [{ type: "text", text: "Result" }],
         };
       } catch (error) {
         return {
           content: [{
             type: "text",
             text: `Error: ${error instanceof Error ? error.message : String(error)}`
           }],
           isError: true,
         };
       }
     }
   );
   ```

2. **Register in src/index.ts** if new category:
   ```typescript
   registerNewCategoryTools(server);
   ```

3. **Add unit tests** in `test/unit/` (if testable in isolation)

4. **Add integration test** in `test/integration/tools/`:
   ```typescript
   describe("tool_name", () => {
     it("should return expected result", async () => {
       const result = await harness.callTool("tool_name", {
         param1: "value",
       });
       expect(result).toMatchObject({ /* expected */ });
     });
   });
   ```

5. **Document in docs/TOOLS.md**:
   - Add to table of contents
   - Create detailed section with parameters, returns, examples

6. **Update CLAUDE.md** if it changes the tool count

7. **Run tests**:
   ```bash
   npm run test:all
   npm run type-check
   ```

### Fixing a Bug

**Process**:

1. **Reproduce the bug**: Write a failing test that demonstrates the issue
   ```typescript
   it("should handle edge case correctly", () => {
     const result = functionWithBug(edgeCaseInput);
     expect(result).toBe(expectedOutput); // This should fail
   });
   ```

2. **Locate the bug**: Read the source code, use error messages, check stack traces

3. **Fix the bug**: Make minimal changes to fix the issue

4. **Verify the fix**: Run the test - it should now pass
   ```bash
   npm run test:unit
   ```

5. **Check for regressions**: Run all tests
   ```bash
   npm run test:all
   ```

6. **Update documentation** if behavior changed

7. **Commit** with clear message explaining the fix

### Improving Test Coverage

**Identify gaps**:
```bash
npm run test:coverage        # Generate coverage
npm run test:coverage:open   # View HTML report (local only)
```

**Look for**:
- Red/yellow highlighted lines in coverage report
- Uncovered branches (if/else paths)
- Error handling code paths
- Edge cases

**Write targeted tests**:
```typescript
describe("Edge Cases", () => {
  it("should handle empty array", () => {
    expect(fn([])).toBe(expectedResult);
  });

  it("should handle null input", () => {
    expect(fn(null)).toBe(expectedResult);
  });

  it("should handle error condition", () => {
    expect(() => fn(invalidInput)).toThrow();
  });
});
```

**Verify improvement**:
```bash
npm run test:coverage
# Check that coverage percentage increased
```

### Updating Documentation

**When to update**:
- Adding new features
- Changing behavior
- Fixing bugs that affect user-facing behavior
- Adding new tools or commands
- Updating dependencies

**What to update**:
- `CLAUDE.md`: If commands or quick start changed
- `docs/TOOLS.md`: If tools added/modified
- `docs/DEVELOPMENT.md`: If development workflow changed
- `docs/DEPLOYMENT.md`: If deployment process changed
- `README.md`: If high-level description changed (keep concise!)

**Style**:
- **Concise**: Get to the point quickly
- **Accurate**: Reflect current state of code
- **Examples**: Include code examples and expected output
- **Links**: Reference other docs instead of duplicating

**Verification**:
- Check all links work
- Run documented commands to verify accuracy
- Ensure examples are current

### Refactoring Code

**When to refactor**:
- Code duplication (DRY principle)
- Complex functions (split into smaller functions)
- Unclear naming (rename for clarity)
- Performance issues
- Hard-to-test code

**How to refactor safely**:

1. **Ensure tests exist**: Write tests if they don't exist
2. **Run tests before**: `npm run test:all` - should pass
3. **Make incremental changes**: Small, focused refactors
4. **Run tests after each change**: Catch regressions immediately
5. **Keep behavior unchanged**: Tests should still pass
6. **Improve readability**: Clear names, simple logic
7. **Run final validation**:
   ```bash
   npm run type-check
   npm run test:all
   npm run format
   ```

**Example**:
```typescript
// Before: Complex, hard to test
function processData(data: any) {
  const result = data.map(item => {
    if (item.type === 'a') {
      return { ...item, value: item.value * 2 };
    } else if (item.type === 'b') {
      return { ...item, value: item.value + 10 };
    }
    return item;
  });
  return result.filter(item => item.value > 0);
}

// After: Clear, testable
function transformItem(item: Item): Item {
  if (item.type === 'a') {
    return { ...item, value: item.value * 2 };
  }
  if (item.type === 'b') {
    return { ...item, value: item.value + 10 };
  }
  return item;
}

function isPositiveValue(item: Item): boolean {
  return item.value > 0;
}

function processData(data: Item[]): Item[] {
  return data
    .map(transformItem)
    .filter(isPositiveValue);
}
```

## Remote vs Local Considerations

### Detecting Environment

```bash
if [ -n "$CLAUDE_CODE_REMOTE" ]; then
  echo "Remote environment"
else
  echo "Local environment"
fi
```

### Remote Environment Limitations

**Network Access**:
- Limited to allowlisted domains:
  - github.com
  - npmjs.com
  - api.va.gov
  - developer.va.gov
  - Common package registries
- Full internet access: ❌ Not available
- Local network access: ❌ Not available

**Deployment**:
- Cloudflare Workers deployment: ❌ Not available in remote
- `npm run deploy`: Should not be run in remote (requires auth)
- Testing deployment: Use local environment only

**Git Operations**:
- Uses GitHub proxy with scoped credentials
- Can read/write to connected repository
- Limited to repository scope

**Persistent State**:
- VM is temporary (session-based)
- No persistent file system across sessions
- Each session starts fresh

### Local Environment Advantages

- Full network access
- Cloudflare Workers deployment
- Direct file system access
- Persistent state
- Faster iteration (no VM overhead)

### Optimizing for Remote

**Fast feedback loops**:
```bash
# Use fast checks during development
npm run test:unit       # Faster than test:all
npm run type-check      # Quick validation

# Run full suite before completing task
npm run test:all        # Comprehensive check
```

**Minimize network calls**:
- Cache is already in place (LRU, 1hr TTL)
- Mock external APIs in tests
- Use local test fixtures

**Efficient testing**:
- Write unit tests (fast, no network)
- Integration tests only when needed
- Use `test:watch` for rapid iteration

## Feedback Loops

### Immediate Feedback (Fastest)

**TypeScript Errors**:
```bash
npm run type-check
# Instant feedback on type errors
```

**Syntax/Formatting**:
```bash
npm run lint:fix
npm run format
# Auto-fixes most issues
```

### Fast Feedback (Seconds)

**Unit Tests**:
```bash
npm run test:unit
# 226 tests run in ~5-10 seconds
```

**Watch Mode** (local only):
```bash
npm run test:watch
# Re-runs tests on file save
```

### Comprehensive Feedback (Minutes)

**All Tests**:
```bash
npm run test:all
# 314 tests (unit + integration)
# Requires dev server for integration tests
```

**Coverage Report**:
```bash
npm run test:coverage
# Generates detailed coverage report
```

### Validation Before Commit

**Complete validation**:
```bash
npm run type-check && \
npm run format && \
npm run lint:fix && \
npm run test:all
```

If all pass, you're ready to commit!

## Troubleshooting

### Common Issues

**"Cannot find module" errors**:
```bash
# Solution: Install dependencies
npm install
```

**Integration tests fail with connection errors**:
```bash
# Solution: Start dev server first
npm run dev
# Then in another terminal:
npm run test:integration
```

**Port 8788 already in use**:
```bash
# Solution: Find and kill process
lsof -ti:8788 | xargs kill -9
# Then start dev server
npm run dev
```

**Tests fail after changes**:
```bash
# Solution: Check what failed
npm run test:all
# Read error messages carefully
# Fix the issue
# Re-run tests
```

**TypeScript errors after changes**:
```bash
# Solution: Check errors
npm run type-check
# Fix type issues
# Re-run type-check
```

**Coverage dropped**:
```bash
# Solution: Identify uncovered code
npm run test:coverage
# Look for red/yellow lines
# Write tests for uncovered code
```

### Debugging Tips

**Server not responding**:
```bash
# Check if server is running
curl http://localhost:8788/health

# Check server logs (in dev terminal)
# Look for error messages
```

**Test failures**:
- Read error message carefully
- Check stack trace for file/line
- Add console.log if needed (remove after debugging)
- Use `test:watch` for rapid iteration
- Isolate the failing test

**Type errors**:
- Read error message - TypeScript is usually clear
- Check what type is expected vs received
- Use type assertions sparingly
- Prefer fixing types over using `as any`

## Best Practices Summary

### ✅ Do

- Read existing code before modifying
- Run `npm run type-check` before committing
- Run `npm run test:all` before committing
- Write tests for new code
- Update documentation when behavior changes
- Use descriptive variable names
- Keep functions small and focused
- Handle errors gracefully with user-friendly messages
- Follow conventional commit format
- Use Zod for validation
- Mock external dependencies in tests

### ❌ Don't

- Use `any` type in TypeScript
- Skip tests
- Commit without running checks
- Make large, unfocused changes
- Ignore type errors
- Commit `node_modules/` or generated files
- Run `npm run deploy` in remote environment
- Modify `.claude/settings.json` without understanding impact
- Use global state or side effects in tests
- Duplicate code - refactor instead

## Quick Command Reference

```bash
# Setup
npm install                     # Install dependencies

# Development
npm run dev                     # Start dev server (port 8788)
curl http://localhost:8788/health  # Check server health

# Testing
npm run test:all                # All tests (314)
npm run test:unit               # Unit tests (226)
npm run test:integration        # Integration tests (88) - needs dev server!
npm run test:coverage           # Generate coverage report
npm run test:watch              # Watch mode (unit tests)

# Code Quality
npm run type-check              # TypeScript validation
npm run format                  # Format with Biome
npm run lint:fix                # Fix linting issues

# Before Commit
npm run type-check && npm run format && npm run lint:fix && npm run test:all

# Deployment (Local Only)
npm run deploy                  # Deploy to Cloudflare Workers (local only)
```

## Getting Help

**Documentation**:
- Read `CLAUDE.md` for project overview
- Read `docs/TOOLS.md` for MCP tools reference
- Read `docs/DEVELOPMENT.md` for development details
- Read `docs/DEPLOYMENT.md` for deployment info

**Test Examples**:
- Look at `test/unit/` for unit test patterns
- Look at `test/integration/` for integration test patterns
- Copy patterns from existing tests

**Code Examples**:
- Look at existing tools in `src/tools/`
- Look at existing services in `src/services/`
- Follow established patterns

## Summary

**Successful agent operation requires**:

1. **Reliable environment setup** - Dependencies installed automatically
2. **Fast feedback loops** - Type-check, lint, test frequently
3. **Comprehensive testing** - Unit and integration tests
4. **Code quality** - TypeScript strict, formatted, linted
5. **Clear documentation** - Update docs when behavior changes
6. **Proper git workflow** - Conventional commits, run checks before commit
7. **Understanding constraints** - Remote vs local, integration test requirements

**Remember**: The goal is to make reliable, well-tested changes with clear documentation and proper validation. Take your time, run checks frequently, and ensure everything works before committing.
