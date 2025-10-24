# Development Guide

This guide covers development setup, testing, and contribution workflows for the VA Lighthouse MCP Server.

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+
- Git

## Installation

```bash
# Clone the repository
git clone https://github.com/agilesix/va-lighthouse-mcp.git
cd va-lighthouse-mcp

# Install dependencies
npm install
```

## Using with Claude Code Web

This repository is configured for autonomous agent operation in Claude Code web (remote environments).

### Configuration Files

- **`CLAUDE.md`**: Primary agent context with project overview, commands, and quick reference
- **`AGENTS.md`**: Detailed agent instructions for development workflows, testing, and code quality
- **`.claude/settings.json`**: Automated environment setup with SessionStart hooks and permissions

### Automatic Environment Setup

When starting a Claude Code web session, the environment automatically:

1. **Detects remote environment** via `CLAUDE_CODE_REMOTE` environment variable
2. **Installs dependencies** by running `npm install` through SessionStart hook
3. **Provides comprehensive context** to agents from CLAUDE.md and AGENTS.md
4. **Configures permissions** for development tasks (testing, formatting, linting)

### Remote Environment Characteristics

**Automatic Setup**:
```bash
# SessionStart hook runs automatically:
if [ -n "$CLAUDE_CODE_REMOTE" ]; then
  echo '🌐 Remote Claude Code session detected'
  npm install
fi
```

**Network Access**:
- Limited to allowlisted domains:
  - `api.va.gov` - VA Lighthouse APIs
  - `developer.va.gov` - VA API documentation
  - `github.com` - Source control
  - `npmjs.com`, `registry.npmjs.org` - Package management
  - Common development tool domains

**Limitations**:
- No Cloudflare Workers deployment (`npm run deploy` disabled in remote)
- Temporary VMs (session-based, no persistent state)
- GitHub proxy for git operations

### Local Development Settings

For local development, use `.claude/settings.local.json` (already exists, not tracked in git):

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run dev:*)",
      "Bash(npm run test:*)",
      // ... local-specific permissions
    ]
  }
}
```

**Key Difference**:
- `.claude/settings.json` - Tracked in git, used in remote Claude Code web sessions
- `.claude/settings.local.json` - Not tracked (.gitignore), used for local development

### Agent Feedback Loops

Claude Code web agents have multiple feedback mechanisms:

**Fast Feedback** (seconds):
- `npm run type-check` - TypeScript validation
- `npm run lint:fix` - Linting and auto-fix
- `npm run format` - Code formatting
- `npm run test:unit` - Unit tests (226 tests)

**Comprehensive Feedback** (minutes):
- `npm run test:all` - All tests (314 tests, includes integration)
- `npm run test:coverage` - Coverage report (94% target)

**Pre-commit Validation**:
```bash
npm run type-check && npm run format && npm run lint:fix && npm run test:all
```

### Documentation for Agents

Agents access comprehensive documentation:

- **CLAUDE.md**: Quick start, common commands, testing workflows
- **AGENTS.md**: Environment setup, code quality standards, git workflow, troubleshooting
- **docs/TOOLS.md**: Complete MCP tools reference (1,100 lines)
- **docs/DEVELOPMENT.md**: This file - development guide
- **docs/DEPLOYMENT.md**: Cloudflare Workers deployment (local only)

### Testing in Remote Sessions

**Unit Tests**: Work normally in remote sessions
```bash
npm run test:unit        # Fast, no server required
npm run test:coverage    # Includes coverage report
```

**Integration Tests**: Require dev server running
```bash
# Terminal 1 (or background process)
npm run dev

# Terminal 2
npm run test:integration
```

**Important**: Integration tests connect to `http://localhost:8788/sse` and will fail if the server isn't running.

### Example Agent Workflow

Typical workflow for autonomous agent in Claude Code web:

1. **Session starts**: SessionStart hook installs dependencies automatically
2. **Agent reads context**: Reviews CLAUDE.md and AGENTS.md for project understanding
3. **Makes changes**: Modifies code following established patterns
4. **Validates changes**:
   ```bash
   npm run type-check   # TypeScript validation
   npm run format       # Format code
   npm run test:unit    # Run tests
   ```
5. **Comprehensive check**:
   ```bash
   npm run test:all     # All tests must pass
   ```
6. **Commits**: Uses conventional commits format with Claude attribution

### Permissions Model

The `.claude/settings.json` file defines what agents can do:

**Allowed** (no confirmation needed):
- Development commands: `npm run dev`, `npm run test:*`
- Code quality: `npm run format`, `npm run lint:fix`
- Type checking: `npm run type-check`
- Web fetching: VA APIs, GitHub, npm registry
- Process management: `lsof`, `ps`, `kill` (for managing dev server)

**Ask for confirmation**:
- Deployment: `npm run deploy`, `wrangler` commands
- Git push: `git push` operations
- Destructive: `rm -rf` operations

**Denied**:
- Currently none (rely on "ask" for dangerous operations)

### Transitioning Between Web and Local

**Web to Local**:
1. Start task in Claude Code web
2. Click "Open in CLI" in the web interface
3. Paste provided command in local repository
4. Local changes are stashed, remote session loads
5. Continue development locally

**Local to Web**:
- Not directly supported (start new web session)
- Git commits are shared across both environments

## Development Server

Start the development server with hot reloading:

```bash
npm run dev
```

The server will be available at `http://localhost:8788/sse`

### Health Check

Verify the server is running:

```bash
curl http://localhost:8788/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "VA Lighthouse API Discovery MCP Server",
  "version": "1.0.0"
}
```

## Testing

The project has 314 tests with a 94% code coverage rate.

### Test Structure

```
test/
├── unit/                    # 226 unit tests
│   ├── services/           # Core service tests (cache, API client, parser, validator)
│   └── utils/              # Utility function tests
└── integration/            # 88 integration tests
    ├── tools/              # MCP tool integration tests
    ├── harness/            # Test harness infrastructure
    └── specs/              # Test specifications
```

### Running Tests

**Unit Tests** (226 tests)

Unit tests use the Cloudflare Workers pool to validate deployment compatibility:

```bash
npm run test:unit
```

**Integration Tests** (88 tests)

Integration tests require a running server:

```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Run integration tests
npm run test:integration
```

**All Tests** (314 tests)

Run the complete test suite:

```bash
npm run test:all
```

### Code Coverage

The project uses a dual Vitest configuration:
- `vitest.config.ts` - Uses Cloudflare Workers pool for deployment validation
- `vitest.unit.config.ts` - Uses Node.js environment for V8 coverage collection

**Generate Coverage Report**

```bash
npm run test:coverage
```

This generates:
- HTML report in `coverage/index.html`
- JSON report in `coverage/coverage-final.json`
- Text summary to console

**View Coverage Report**

```bash
npm run test:coverage:open
```

Opens the HTML coverage report in your default browser.

**Current Coverage Metrics**

- Overall: 94%
- openapi-parser: 99%
- api-client: 96%
- validator: 85%
- json-schema-to-zod: 93%

## Project Structure

```
src/
├── index.ts              # MCP server entry point
├── services/             # Core infrastructure
│   ├── cache.ts          # LRU cache with TTL (max 50 items, 1hr expiry)
│   ├── api-client.ts     # VA Lighthouse API client
│   ├── openapi-parser.ts # OpenAPI 3.0 parsing & dereferencing
│   └── validator.ts      # Zod-based validation with fix suggestions
├── tools/                # MCP tool implementations
│   ├── discovery.ts      # list_lighthouse_apis, get_api_info
│   ├── exploration.ts    # get_api_summary, list_api_endpoints, etc.
│   ├── validation.ts     # validate_request_payload, generate_example_payload, etc.
│   └── utilities.ts      # check_api_health, compare_api_versions
├── utils/                # Helper utilities
│   ├── json-schema-to-zod.ts  # JSON Schema → Zod conversion
│   └── error-formatter.ts     # Validation error formatting
└── types/                # TypeScript type definitions
```

## Code Quality

### TypeScript

All code must pass TypeScript checks:

```bash
npm run typecheck
```

### Testing Guidelines

**Unit Tests**
- Test pure logic and algorithms
- Mock external dependencies (fetch, API calls)
- Use Vitest's `vi.mock()` for module mocking
- Keep tests isolated and deterministic

**Integration Tests**
- Test complete user workflows
- Use the test harness to interact with the live server
- Validate MCP protocol compliance
- Test error handling and edge cases

**Coverage Goals**
- New code should maintain 90%+ coverage
- Critical paths (validation, parsing) require 95%+ coverage
- Tools are primarily tested via integration tests

## Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write code
   - Add/update tests
   - Update documentation

3. **Run tests**
   ```bash
   npm run test:all
   npm run test:coverage
   ```

4. **Commit changes**
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## MCP Inspector

Use the MCP Inspector to test tools interactively:

```bash
npx @modelcontextprotocol/inspector@latest
```

1. Open http://localhost:5173 in your browser
2. Connect to http://localhost:8788/sse
3. Explore available tools and test parameters

## Debugging

### Verbose Logging

Enable detailed logging in development:

```typescript
// In src/index.ts
console.log('Debug info:', { /* data */ });
```

Logs appear in the terminal running `npm run dev`.

### Cloudflare Workers Logs

When deployed, view logs in the Cloudflare dashboard:

```bash
npx wrangler tail
```

### Common Issues

**Port Already in Use**

If port 8788 is in use:

```bash
# Find and kill the process
lsof -ti:8788 | xargs kill -9
```

**Cache Issues**

Clear the LRU cache by restarting the server. The cache is in-memory only.

**Test Failures**

Ensure the development server is running for integration tests:

```bash
# Check server health
curl http://localhost:8788/health
```

## Performance Considerations

### Caching Strategy

The server uses an LRU cache with the following characteristics:
- **Max Size**: 50 items
- **TTL**: 1 hour
- **Automatic Cleanup**: Expired entries removed on access

Cached items:
- OpenAPI specifications
- Parsed API structures
- Health check responses

### Cloudflare Workers Limits

- **CPU Time**: 50ms (free tier), 50s (paid)
- **Memory**: 128MB
- **Response Size**: 100MB
- **Script Size**: 1MB (after compression)

See [docs/DEPLOYMENT.md](./DEPLOYMENT.md) for optimization strategies.

## Resources

- [VA Lighthouse API Documentation](https://developer.va.gov/)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Vitest Documentation](https://vitest.dev/)
- [Zod Documentation](https://zod.dev/)

## Getting Help

- Review [docs/TOOLS.md](./TOOLS.md) for tool-specific documentation
- Check [test/integration/README.md](../test/integration/README.md) for integration test patterns
- Review existing tests for examples and patterns
