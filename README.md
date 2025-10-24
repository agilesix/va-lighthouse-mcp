# VA Lighthouse MCP Server

Model Context Protocol server for progressive discovery and validation of VA Lighthouse APIs. Built on Cloudflare Workers with TypeScript and Zod validation.

## Features

**13 MCP Tools** for VA API exploration:

- **Discovery** (2): List APIs, get metadata
- **Exploration** (5): Summarize APIs, browse endpoints, search operations, view schemas
- **Validation** (4): Validate payloads, generate examples, get validation rules
- **Utilities** (2): Check health, compare versions

**Production-Ready**
- 314 tests (226 unit, 88 integration) with 94% code coverage
- LRU cache with 1hr TTL for optimal performance
- OpenAPI 3.0 parsing and dereferencing
- Zod-based validation with fix suggestions
- Cloudflare Workers deployment

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run all tests
npm run test:all
```

Server runs at `http://localhost:8788/sse`

### Health Check

```bash
curl http://localhost:8788/health
```

## MCP Inspector

Test tools interactively:

```bash
npx @modelcontextprotocol/inspector@latest
# Open http://localhost:5173
# Connect to http://localhost:8788/sse
```

## Claude Desktop Integration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "va-lighthouse": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:8788/sse"]
    }
  }
}
```

For production, use: `https://va-lighthouse-mcp.<your-account>.workers.dev/sse`

## Documentation

- **[Tools Reference](./docs/TOOLS.md)** - Complete documentation for all 13 MCP tools
- **[Development Guide](./docs/DEVELOPMENT.md)** - Setup, testing, code coverage, debugging
- **[Deployment Guide](./docs/DEPLOYMENT.md)** - Cloudflare Workers deployment, configuration, monitoring

### Testing

- **[Integration Tests](./test/integration/README.md)** - Integration test patterns and harness usage
- **[Test Harness](./test/integration/harness/README.md)** - Reusable test infrastructure

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

## Project Structure

```
src/
├── index.ts              # MCP server entry point
├── services/             # Cache, API client, parser, validator
├── tools/                # 13 MCP tools (4 files)
└── utils/                # Error formatting, example generation
test/
├── unit/                 # 226 tests (Workers pool, 94% coverage)
└── integration/          # 88 tests (Node.js + HTTP)
docs/
├── TOOLS.md              # Complete MCP tools reference
├── DEVELOPMENT.md        # Development and testing guide
└── DEPLOYMENT.md         # Cloudflare deployment guide
```

## Testing

**Run All Tests** (314 tests)

```bash
npm run test:all
```

**Unit Tests** (226 tests, 94% coverage)

```bash
npm run test:unit              # Run unit tests
npm run test:coverage          # Generate coverage report
npm run test:coverage:open     # View coverage HTML report
```

**Integration Tests** (88 tests)

```bash
npm run dev                    # Terminal 1: Start server
npm run test:integration       # Terminal 2: Run integration tests
```

**Code Coverage**

- Overall: **94%**
- openapi-parser: 99%
- api-client: 96%
- json-schema-to-zod: 93%
- validator: 85%

See [Development Guide](./docs/DEVELOPMENT.md) for detailed testing information.

## Deployment

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

Your server will be available at:
```
https://va-lighthouse-mcp.<your-account>.workers.dev/sse
```

See [Deployment Guide](./docs/DEPLOYMENT.md) for:
- Account setup and configuration
- Custom domains
- Environment variables and secrets
- Monitoring and observability
- Cost estimation

## Stack

- **Runtime**: Cloudflare Workers
- **Language**: TypeScript 5.9
- **MCP**: @modelcontextprotocol/sdk 1.19
- **Validation**: Zod 3.25
- **Parser**: @scalar/openapi-parser 0.22
- **Testing**: Vitest 3.2 (314 tests, 94% coverage)

## Resources

- [VA Lighthouse API Portal](https://developer.va.gov/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)

## License

MIT
