# VA Lighthouse MCP Server

Model Context Protocol server for progressive discovery and validation of VA Lighthouse APIs. Built on Cloudflare Workers with TypeScript and Zod validation.

## Features

**13 MCP Tools** across 4 categories:

- **Discovery** (2): List APIs, get metadata
- **Exploration** (5): Summarize APIs, browse endpoints, search operations, view schemas
- **Validation** (4): Validate payloads, generate examples, get validation rules (Zod-based)
- **Utilities** (2): Check health, compare versions

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

## Tools

**Discovery** (2)
- `list_lighthouse_apis` - List all APIs
- `get_api_info` - Get API metadata

**Exploration** (5)
- `get_api_summary` - API overview
- `list_api_endpoints` - List endpoints with filters
- `get_endpoint_details` - Endpoint specification
- `get_api_schemas` - Data model schemas
- `search_api_operations` - Search operations

**Validation** (4)
- `validate_request_payload` - Validate requests
- `validate_response_payload` - Validate responses
- `generate_example_payload` - Generate examples
- `get_validation_rules` - Validation rules

**Utilities** (2)
- `check_api_health` - Health checks
- `compare_api_versions` - Version comparison

## Quick Start

```bash
# Install
npm install

# Start server
npm run dev

# Run tests
npm run test:all

# Deploy
npm run deploy
```

Server runs at `http://localhost:8788/sse`

## Testing

**Unit Tests** (124 tests)
```bash
npm run test:unit
```

**Integration Tests** (75 tests)
```bash
npm run dev              # Terminal 1
npm run test:integration # Terminal 2
```

**All Tests** (199 tests - 100% pass rate)
```bash
npm run test:all
```

## MCP Inspector

```bash
npx @modelcontextprotocol/inspector@latest
# Open http://localhost:5173
# Connect to http://localhost:8788/sse
```

## Claude Desktop Configuration

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

For production, use `https://va-lighthouse-mcp.<your-account>.workers.dev/sse`

## Stack

- **Runtime**: Cloudflare Workers
- **Language**: TypeScript 5.9
- **MCP**: @modelcontextprotocol/sdk 1.19
- **Validation**: Zod 3.25
- **Parser**: @scalar/openapi-parser 0.22
- **Testing**: Vitest 3.2 (199 tests, 100% pass rate)

### Caching
- LRU cache with 1hr TTL (max 50 items)
- Automatic cleanup of expired entries

### Data Sources
- VA Lighthouse API: `https://api.va.gov/internal/docs/`

## Project Structure

```
src/
├── index.ts              # MCP server
├── services/             # Cache, API client, parser, validator (Zod)
├── tools/                # 13 MCP tools (4 files)
└── utils/                # Error formatting, example generation
test/
├── unit/                 # 124 tests (Workers pool)
└── integration/          # 75 tests (Node.js + HTTP)
```

## Health Check

```bash
curl http://localhost:8788/health
# {"status":"ok","service":"VA Lighthouse API Discovery MCP Server","version":"1.0.0"}
```

## Resources

- [VA Lighthouse API](https://developer.va.gov/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)

## License

MIT
