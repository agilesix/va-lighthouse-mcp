# VA Lighthouse MCP Server

## What is This Project?

This is a **Model Context Protocol (MCP) server** that provides progressive discovery and validation of VA Lighthouse APIs. It enables Claude and other AI assistants to explore, understand, and validate VA API endpoints without requiring manual API documentation lookup.

**13 MCP Tools** across 4 categories:
- **Discovery** (2): List APIs, get metadata
- **Exploration** (5): Summarize APIs, browse endpoints, search operations, view schemas
- **Validation** (4): Validate payloads, generate examples, get validation rules
- **Utilities** (2): Check health, compare versions

## Tech Stack

- **Runtime**: Cloudflare Workers (serverless)
- **Language**: TypeScript 5.9 (strict mode)
- **MCP SDK**: @modelcontextprotocol/sdk 1.19
- **Validation**: Zod 3.25 (runtime type checking)
- **OpenAPI Parser**: @scalar/openapi-parser 0.22
- **Testing**: Vitest 3.2 (314 tests, 94% coverage)
- **Code Quality**: Biome (formatting & linting)

## Architecture

```
┌─────────────────────────────────────────┐
│  13 MCP Tools (4 categories)            │
├─────────────────────────────────────────┤
│  • Cache (LRU, 1hr TTL)                 │
│  • API Client (VA Lighthouse)           │
│  • OpenAPI Parser (@scalar)             │
│  • Validator (Zod)                      │
├─────────────────────────────────────────┤
│  Cloudflare Workers Runtime             │
└─────────────────────────────────────────┘
```

## Quick Start

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm 9+

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```
Server runs at `http://localhost:8788/sse`

### Health Check
```bash
curl http://localhost:8788/health
```
Expected: `{"status":"ok","service":"VA Lighthouse API Discovery MCP Server","version":"1.0.0"}`

## Common Commands

### Development
```bash
npm run dev              # Start development server (port 8788)
npm run start            # Alias for dev
```

### Testing
```bash
npm run test:all         # Run all tests (314 tests)
npm run test:unit        # Run unit tests only (226 tests)
npm run test:integration # Run integration tests (88 tests) - requires dev server running!
npm run test:coverage    # Generate coverage report (94% target)
npm run test:coverage:open # View coverage HTML report
```

**⚠️ IMPORTANT**: Integration tests require the dev server to be running in a separate terminal/process!

### Code Quality
```bash
npm run type-check       # TypeScript validation (no emit)
npm run format           # Format code with Biome
npm run lint:fix         # Fix linting issues automatically
```

### Deployment (Local Only - Not Available in Remote Sessions)
```bash
npm run deploy           # Deploy to Cloudflare Workers
npm run cf-typegen       # Generate Cloudflare types
```

## Project Structure

```
src/
├── index.ts              # MCP server entry point
├── services/             # Core infrastructure
│   ├── cache.ts          # LRU cache with TTL (max 50 items, 1hr)
│   ├── api-client.ts     # VA Lighthouse API client
│   ├── openapi-parser.ts # OpenAPI 3.0 parsing & dereferencing
│   └── validator.ts      # Zod-based validation with fix suggestions
├── tools/                # MCP tool implementations (13 tools in 4 files)
│   ├── discovery.ts      # list_lighthouse_apis, get_api_info
│   ├── exploration.ts    # get_api_summary, list_api_endpoints, etc.
│   ├── validation.ts     # validate_request_payload, generate_example_payload, etc.
│   └── utilities.ts      # check_api_health, compare_api_versions
├── utils/                # Helper utilities
│   ├── json-schema-to-zod.ts  # JSON Schema → Zod conversion
│   └── error-formatter.ts     # Validation error formatting
└── types/                # TypeScript type definitions

test/
├── unit/                 # 226 tests (Workers pool, 94% coverage)
│   ├── services/         # Core service tests
│   └── utils/            # Utility function tests
└── integration/          # 88 tests (Node.js + HTTP)
    ├── tools/            # MCP tool integration tests
    ├── harness/          # Test harness infrastructure
    └── specs/            # Test specifications

docs/
├── TOOLS.md              # Complete MCP tools reference (1,100 lines)
├── DEVELOPMENT.md        # Development and testing guide (340 lines)
└── DEPLOYMENT.md         # Cloudflare deployment guide (440 lines)
```

## Testing Workflows

### Unit Tests (226 tests, 94% coverage)
- Fast, isolated tests using Cloudflare Workers pool
- Test pure logic: validation, caching, parsing, error formatting
- **Dual Config Strategy**:
  - `vitest.config.ts` - Workers pool (deployment compatibility)
  - `vitest.unit.config.ts` - Node environment (V8 coverage collection)
- Run: `npm run test:unit`
- Coverage: `npm run test:coverage` (uses Node environment)

### Integration Tests (88 tests)
- Test complete MCP protocol flows and tool interactions
- Requires live server: `npm run dev` must be running first
- Uses test harness to communicate with server over HTTP
- Run: `npm run test:integration` (after starting `npm run dev`)

### Coverage Targets
- Overall: **94%**
- openapi-parser: 99%
- api-client: 96%
- json-schema-to-zod: 93%
- validator: 85%

## Important Constraints & Gotchas

### Integration Tests Require Running Server
Integration tests connect to `http://localhost:8788/sse` and will fail if the dev server isn't running:
```bash
# Terminal 1
npm run dev

# Terminal 2
npm run test:integration
```

### Dual Vitest Configurations
- **Why**: Cloudflare Workers pool incompatible with V8 coverage collection
- **Solution**: Two configs for different purposes
  - Use `vitest.config.ts` (Workers pool) for deployment validation
  - Use `vitest.unit.config.ts` (Node) for coverage reporting
- Coverage commands automatically use the correct config

### Cloudflare Workers Deployment
- Deployment only works from local environment (not remote Claude Code sessions)
- Requires Cloudflare account and wrangler authentication
- Configuration in `wrangler.jsonc`
- See `docs/DEPLOYMENT.md` for setup instructions

### Network Access (Remote Sessions)
- Remote Claude Code sessions have limited network access
- Allowlisted domains: github.com, npmjs.com, api.va.gov, developer.va.gov
- Full internet access available in local development

## Documentation

For comprehensive information, see:

- **[docs/TOOLS.md](./docs/TOOLS.md)** - Complete reference for all 13 MCP tools with examples
- **[docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md)** - Development setup, testing strategies, debugging
- **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - Cloudflare Workers deployment and monitoring
- **[test/integration/README.md](./test/integration/README.md)** - Integration test patterns
- **[test/integration/harness/README.md](./test/integration/harness/README.md)** - Test harness usage

## Agent Instructions

**For detailed autonomous agent operation instructions, see:**

@AGENTS.md

The AGENTS.md file contains comprehensive guidance for:
- Environment setup and verification
- Development workflows and best practices
- Testing strategies and feedback loops
- Code quality standards
- Git workflow and commit conventions
- Common tasks (adding features, fixing bugs, updating docs)
- Remote vs local considerations
- Troubleshooting and debugging

## Quick Reference: Common Agent Tasks

### Adding a New MCP Tool
1. Create tool in appropriate file in `src/tools/`
2. Register tool in `src/index.ts`
3. Add unit tests in `test/unit/`
4. Add integration test in `test/integration/tools/`
5. Document tool in `docs/TOOLS.md`
6. Run `npm run test:all` to verify

### Fixing a Bug
1. Write a failing test that reproduces the bug
2. Fix the bug in source code
3. Verify test passes: `npm run test:all`
4. Check types: `npm run type-check`
5. Format code: `npm run format`
6. Commit with descriptive message

### Improving Test Coverage
1. Generate coverage report: `npm run test:coverage`
2. Open HTML report: `npm run test:coverage:open`
3. Identify uncovered lines in coverage/index.html
4. Write targeted tests for uncovered code paths
5. Re-run coverage to verify improvement

### Updating Documentation
1. Modify files in `docs/` or README.md
2. Keep documentation concise and accurate
3. Update examples if code behavior changed
4. Verify all links work
5. Commit changes with docs tag

## Health Check

Verify the server is running correctly:

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

## Resources

- [VA Lighthouse API Portal](https://developer.va.gov/)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Vitest Documentation](https://vitest.dev/)
- [Zod Documentation](https://zod.dev/)

## License

MIT
