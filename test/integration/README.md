# VA Lighthouse MCP Integration Tests

**Declarative Integration Testing for the VA Lighthouse MCP Server**

This directory contains integration tests for the VA Lighthouse MCP server using a portable, agent-friendly test harness. Tests are written in simple YAML files without requiring code.

> 📘 **For detailed harness documentation**, see [harness/README.md](./harness/README.md)

---

## Quick Start

### Prerequisites

Before running tests, ensure the MCP server is running:

```bash
# Start the server
npm run dev

# Verify it's accessible (in another terminal)
curl http://localhost:8788/mcp
```

### 5-Step Quick Start

**1. List Available Tests**
```bash
npm run integration:list
```

**2. Run All Tests**
```bash
npm run integration:run
```

**3. Generate a New Test**
```bash
npm run integration:generate -- list_lighthouse_apis \
  --args '{"includeDeprecated": false}' \
  --output specs/my-test.yaml
```

**4. Run Specific Test**
```bash
npm run integration:run -- specs/my-test.yaml
```

**5. Get Machine-Readable Results**
```bash
npm run integration:run -- --json
```

---

## Test Specification Format

Tests are defined in YAML/JSON files. Here's a quick example:

```yaml
name: "Test list_lighthouse_apis"
tool: "list_lighthouse_apis"
arguments:
  includeDeprecated: false

assertions:
  - type: "success"
  - type: "response_time_ms"
    max: 5000
  - type: "contains_text"
    text: "Benefits"
```

> 📘 **Complete specification reference:** See [harness/README.md](./harness/README.md#test-specification-format) for:
> - Test specification structure
> - All 9 assertion types (success, error, contains_text, json_path, regex_match, etc.)
> - Advanced features (skip, only)
> - JSON output format

---

## CLI Commands

### Run Tests

```bash
# Run all tests
npm run integration:run

# Run specific test file
npm run integration:run -- specs/my-test.yaml

# Run tests matching pattern
npm run integration:run -- specs/validation-*.yaml

# Get JSON output (for parsing)
npm run integration:run -- --json

# Get simple pass/fail message
npm run integration:run -- --simple

# Verbose output
npm run integration:run -- --verbose
```

### List Tests

```bash
npm run integration:list
```

### Generate Test Template

```bash
# Basic generation
npm run integration:generate -- <tool-name>

# With arguments
npm run integration:generate -- list_lighthouse_apis \
  --args '{"includeDeprecated": false}'

# With description
npm run integration:generate -- get_api_info \
  --description "Test Benefits API metadata"

# Custom output location
npm run integration:generate -- check_api_health \
  --output specs/health-check.yaml

# Print to stdout instead of file
npm run integration:generate -- list_api_endpoints \
  --stdout
```

---

## Directory Structure

```
test/integration/
├── harness/                 # Portable test harness (→ future npm package)
│   ├── README.md           # Harness documentation
│   ├── types/              # TypeScript interfaces
│   ├── assertions/         # Assertion implementations
│   ├── reporters/          # Output formatters
│   ├── validation/         # Zod schemas
│   ├── runner.ts           # Test execution engine
│   ├── spec-loader.ts      # YAML/JSON loader
│   └── __tests__/          # Harness unit tests (88 tests)
│
├── adapters/                # VA Lighthouse integration
│   ├── mcp-client.ts       # MCP client (official SDK)
│   └── client-adapter.ts   # Implements IMCPTestClient
│
├── specs/                   # Test specifications
│   ├── discovery/          # Discovery tool tests
│   ├── exploration/        # Exploration tool tests
│   ├── validation/         # Validation tool tests
│   ├── utilities/          # Utility tool tests
│   ├── errors/             # Error handling tests
│   └── examples/           # Example tests
│
├── config.ts                # Test configuration
├── cli.ts                   # CLI entry point
├── tools/                   # Legacy Vitest tests (deprecated)
└── README.md               # This file
```

### Architecture

**Portable Harness** (`harness/`)
- Generic, reusable test framework
- No VA Lighthouse dependencies
- Can be extracted to npm: `@your-org/mcp-test-harness`
- See [harness/README.md](./harness/README.md) for details

**VA Lighthouse Integration** (`adapters/`, `config.ts`, `cli.ts`)
- MCP client using official SDK
- Server URL configuration
- CLI for running tests

**Test Specifications** (`specs/`)
- Declarative YAML/JSON tests
- Organized by tool category
- 17 tests covering all 13 VA Lighthouse MCP tools

---

## Agent Workflow

### Scenario: Adding a New Feature

1. **Write the feature code**
   - Make changes to your MCP server tool

2. **Generate test template**
   ```bash
   npm run integration:generate -- my_new_tool \
     --args '{"param": "value"}' \
     --output specs/utilities/my-new-tool.yaml
   ```

3. **Edit the test spec**
   - Open `specs/utilities/my-new-tool.yaml`
   - Add specific assertions for your use case
   - Reference [harness/README.md](./harness/README.md#assertion-types) for assertion types

4. **Run the test**
   ```bash
   npm run integration:run -- specs/utilities/my-new-tool.yaml --json
   ```

5. **Read the results**
   ```json
   {
     "summary": {
       "passed": 1,
       "failed": 0,
       "total": 1
     }
   }
   ```

6. **If test passes, commit it**
   ```bash
   git add specs/utilities/my-new-tool.yaml
   git commit -m "Add integration test for my_new_tool"
   ```

### For AI Agents

This test framework is optimized for AI agent usage:

**✅ DO:**
- Generate tests using `npm run integration:generate`
- Read results with `--json` flag for parsing
- Create tests in YAML format (easier than JSON)
- Use descriptive test names and descriptions
- Run specific tests for fast feedback

**❌ DON'T:**
- Write tests in TypeScript/JavaScript (use YAML)
- Modify harness code (it's portable and stable)
- Hard-code server URLs (use config.ts or env vars)
- Skip writing assertions (they catch regressions)

**Example Agent Commands:**
```bash
# Generate test
npm run integration:generate -- tool_name --args '{}' --stdout > temp-test.yaml

# Run and parse results
npm run integration:run -- temp-test.yaml --json | jq '.summary.passed'

# Check if all tests pass
npm run integration:run -- --json | jq -e '.summary.failed == 0'
```

---

## Examples

See `specs/examples/` for complete working examples:

- **`list-apis-basic.yaml`** - Basic tool testing with assertions
- **`list-apis-with-deprecated.yaml`** - Testing with different arguments
- **`check-health.yaml`** - Using regex assertions for health checks

Each category folder contains additional examples:
- `specs/discovery/` - API discovery tool tests
- `specs/exploration/` - API exploration tool tests
- `specs/validation/` - Payload validation tests
- `specs/utilities/` - Utility tool tests
- `specs/errors/` - Error handling tests

---

## Troubleshooting

### "No test specs found"
- Ensure you have `.yaml` or `.json` files in `test/integration/specs/`
- Check file extensions are correct
- Run `npm run integration:list` to see discovered tests

### "Error loading test spec"
- Verify YAML syntax is valid (use a YAML validator)
- Ensure all required fields are present: `name`, `tool`, `arguments`, `assertions`
- Check assertion types are spelled correctly
- See [harness/README.md](./harness/README.md#assertion-types) for valid types

### "Server not running"
- Start the server: `npm run dev`
- Verify server URL in `config.ts` matches your setup
- Check server accessibility: `curl http://localhost:8788/mcp`
- Set `MCP_SERVER_URL` environment variable if needed

### Tests timeout
- Increase timeout in `config.ts` (default timeout)
- Add `timeout: 30000` to specific test spec (per-test override)
- Check server performance (may be slow on first run)
- Verify network connectivity

### Tests fail unexpectedly
- Check server logs for errors
- Run with `--verbose` flag for detailed output
- Verify test assertions match actual tool output
- Compare with example tests in `specs/examples/`

---

## Configuration

Edit `config.ts` to customize:

```typescript
export const config = {
  serverUrl: process.env.MCP_SERVER_URL || 'http://localhost:8788/mcp',
  defaultTimeout: 30000,  // 30 seconds
  specsDir: path.join(__dirname, 'specs'),
};
```

### Environment Variables

- `MCP_SERVER_URL` - Override server URL
- Example: `MCP_SERVER_URL=http://localhost:9000/mcp npm run integration:run`

---

## Test Coverage

**Current Status: 95% success rate (19/20 tests passing)**

**Coverage by Category:**
- ✅ Discovery (3 tests) - list_lighthouse_apis, get_api_info
- ✅ Exploration (3 tests) - get_api_summary, list_api_endpoints, get_endpoint_details
- ✅ Validation (5 tests) - generate_example_payload, validate payloads
- ✅ Utilities (3 tests) - check_api_health, compare_api_versions, search_api_operations
- ✅ Errors (3 tests) - Invalid inputs, missing params, error messages

**All 13 VA Lighthouse MCP tools have integration test coverage.**

---

## Running Harness Unit Tests

The test harness itself has comprehensive unit tests:

```bash
# Run harness unit tests (fast, no server required)
npm run test:harness

# Run all tests (unit + harness + integration)
npm run test:all
```

> 📘 See [harness/README.md](./harness/README.md#unit-tests) for harness test details

---

## Next Steps

1. **Explore examples**: `ls test/integration/specs/examples/`
2. **Run your first test**: `npm run integration:run -- specs/examples/list-apis-basic.yaml`
3. **Generate a new test**: `npm run integration:generate -- list_lighthouse_apis`
4. **Customize and iterate**: Edit the generated YAML file and re-run

---

## Support

For issues or questions:
- Check example tests in `specs/examples/`
- Review [harness/README.md](./harness/README.md) for assertion types
- Review this README for CLI commands
- Check test output for specific error messages
- Run with `--verbose` for detailed output

---

**Built for Agents, by Agents** 🤖
