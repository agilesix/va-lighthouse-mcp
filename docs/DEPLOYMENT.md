# Deployment Guide

This guide covers deploying the VA Lighthouse MCP Server to Cloudflare Workers.

## Prerequisites

- Cloudflare account (free tier supported)
- Wrangler CLI (installed via `npm install`)
- Node.js 18+ and npm 9+

## Cloudflare Workers Setup

### 1. Create Cloudflare Account

1. Sign up at https://dash.cloudflare.com/sign-up
2. Verify your email address
3. Complete account setup

### 2. Authenticate Wrangler

```bash
npx wrangler login
```

This opens a browser window to authorize Wrangler with your Cloudflare account.

### 3. Configure Account ID

Update `wrangler.jsonc` with your account ID:

```jsonc
{
  "account_id": "your-account-id-here"
}
```

Find your account ID in the Cloudflare dashboard under **Workers & Pages** > **Overview**.

## Deployment

### Deploy to Production

```bash
npm run deploy
```

This command:
1. Builds the TypeScript source
2. Bundles dependencies
3. Uploads to Cloudflare Workers
4. Provisions Durable Objects

Your server will be available at:
```
https://va-lighthouse-mcp.<your-account>.workers.dev/sse
```

### Deploy to Custom Domain

1. Add a route in `wrangler.jsonc`:

```jsonc
{
  "routes": [
    {
      "pattern": "mcp.yourdomain.com/*",
      "zone_name": "yourdomain.com"
    }
  ]
}
```

2. Deploy:

```bash
npm run deploy
```

3. Update DNS records in Cloudflare dashboard to point to your Worker.

## Configuration

### wrangler.jsonc Structure

```jsonc
{
  "name": "va-lighthouse-mcp",           // Worker name
  "account_id": "...",                   // Cloudflare account ID
  "main": "src/index.ts",                // Entry point
  "compatibility_date": "2025-03-10",    // Runtime compatibility
  "compatibility_flags": ["nodejs_compat"], // Enable Node.js APIs
  "durable_objects": {                   // Durable Objects configuration
    "bindings": [
      {
        "class_name": "VALighthouseMCP",
        "name": "MCP_OBJECT"
      }
    ]
  },
  "observability": {
    "enabled": true                      // Enable logging & metrics
  },
  "dev": {
    "port": 8788                         // Local development port
  }
}
```

### Environment Variables

Set environment variables using Wrangler secrets:

```bash
# Set a secret
npx wrangler secret put API_KEY

# List secrets
npx wrangler secret list

# Delete a secret
npx wrangler secret delete API_KEY
```

Access secrets in code:

```typescript
export default {
  async fetch(request: Request, env: Env) {
    const apiKey = env.API_KEY;
    // Use apiKey
  }
};
```

## Durable Objects

The server uses Cloudflare Durable Objects for stateful operations:

- **Class**: `VALighthouseMCP`
- **Binding**: `MCP_OBJECT`
- **Migration Tag**: `v1`

Durable Objects provide:
- Strong consistency
- Automatic state persistence
- WebSocket connection management

### Migrations

When updating Durable Object classes, add a migration:

```jsonc
{
  "migrations": [
    {
      "tag": "v1",
      "new_sqlite_classes": ["VALighthouseMCP"]
    },
    {
      "tag": "v2",
      "renamed_classes": [
        {
          "from": "VALighthouseMCP",
          "to": "VALighthouseMCPv2"
        }
      ]
    }
  ]
}
```

Deploy with migrations:

```bash
npm run deploy
```

## Monitoring

### View Logs

Stream real-time logs:

```bash
npx wrangler tail
```

Filter by status:

```bash
npx wrangler tail --status error
```

### Metrics Dashboard

View metrics in the Cloudflare dashboard:

1. Navigate to **Workers & Pages**
2. Select `va-lighthouse-mcp`
3. Click **Metrics** tab

Metrics include:
- Requests per second
- Error rate
- CPU time
- Success rate

### Observability

The server has observability enabled (`"observability": { "enabled": true }`):

- Automatic error tracking
- Performance metrics
- Request tracing

## Performance Optimization

### Script Size

Current bundle size: ~200KB (well under 1MB limit)

To reduce bundle size:
1. Remove unused dependencies
2. Use dynamic imports for large modules
3. Enable tree-shaking in bundler

### CPU Time

Cloudflare Workers limits:
- **Free tier**: 50ms CPU time per request
- **Paid tier**: 50s CPU time per request

Current performance:
- Simple operations: 5-10ms
- OpenAPI parsing: 20-40ms
- Complex validation: 15-30ms

### Caching Strategy

The server uses an in-memory LRU cache:
- **Max items**: 50
- **TTL**: 1 hour
- **Cleanup**: Automatic on access

Cached data:
- OpenAPI specifications
- Parsed API structures
- Health check responses

### Rate Limiting

Cloudflare automatically rate limits requests:
- **Free tier**: 100,000 requests/day
- **Paid tier**: 10,000,000+ requests/month

Implement custom rate limiting if needed:

```typescript
const RATE_LIMIT = 100; // requests per minute

export default {
  async fetch(request: Request, env: Env) {
    // Check rate limit
    const clientId = request.headers.get('CF-Connecting-IP');
    // Implement rate limiting logic
  }
};
```

## Rollback

### Rollback to Previous Version

List deployments:

```bash
npx wrangler deployments list
```

Rollback to a specific deployment:

```bash
npx wrangler rollback <deployment-id>
```

### Emergency Rollback

If the server is failing, immediately rollback:

```bash
npx wrangler rollback --message "Emergency rollback due to errors"
```

## Claude Desktop Integration

### Production Configuration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "va-lighthouse": {
      "command": "npx",
      "args": ["mcp-remote", "https://va-lighthouse-mcp.<your-account>.workers.dev/sse"]
    }
  }
}
```

### Custom Domain Configuration

For a custom domain:

```json
{
  "mcpServers": {
    "va-lighthouse": {
      "command": "npx",
      "args": ["mcp-remote", "https://mcp.yourdomain.com/sse"]
    }
  }
}
```

## Testing Deployment

### Health Check

```bash
curl https://va-lighthouse-mcp.<your-account>.workers.dev/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "VA Lighthouse API Discovery MCP Server",
  "version": "1.0.0"
}
```

### MCP Inspector

Test the deployed server with MCP Inspector:

```bash
npx @modelcontextprotocol/inspector@latest
```

1. Open http://localhost:5173
2. Connect to `https://va-lighthouse-mcp.<your-account>.workers.dev/sse`
3. Test tools and verify responses

## Troubleshooting

### Deployment Fails

**Error: Account ID not found**

Solution: Update `account_id` in `wrangler.jsonc`

```bash
npx wrangler whoami
# Copy account ID from output
```

**Error: Durable Object migration failed**

Solution: Check migration tags and ensure they're sequential:

```jsonc
{
  "migrations": [
    { "tag": "v1", ... },
    { "tag": "v2", ... }  // Must be v2, not v1
  ]
}
```

### Runtime Errors

**Error: CPU time limit exceeded**

Solution: Optimize expensive operations:
1. Use caching for repeated operations
2. Reduce OpenAPI spec size
3. Paginate large responses

**Error: Memory limit exceeded**

Solution: Reduce memory usage:
1. Clear cache more frequently
2. Limit concurrent operations
3. Stream large responses

### Connection Issues

**Error: WebSocket connection failed**

Solution: Check CORS and WebSocket headers:

```typescript
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
```

## Security

### API Keys

Store sensitive data as Wrangler secrets (never in code):

```bash
npx wrangler secret put VA_API_KEY
```

### CORS Configuration

Configure CORS for production:

```typescript
const allowedOrigins = [
  'https://claude.ai',
  'https://yourdomain.com',
];

function checkOrigin(request: Request) {
  const origin = request.headers.get('Origin');
  return allowedOrigins.includes(origin);
}
```

### Rate Limiting

Implement rate limiting to prevent abuse:

```typescript
// Using Cloudflare's Rate Limiting API
const rateLimiter = env.RATE_LIMITER;
const { success } = await rateLimiter.limit({ key: clientId });

if (!success) {
  return new Response('Too Many Requests', { status: 429 });
}
```

## Cost Estimation

### Free Tier

- **Requests**: 100,000/day
- **CPU Time**: 50ms/request
- **Storage**: 1GB Durable Objects storage
- **Cost**: $0/month

### Paid Tier ($5/month)

- **Requests**: 10,000,000/month
- **CPU Time**: 50s/request
- **Storage**: 1GB included, $0.20/GB thereafter
- **Cost**: $5/month base + usage overages

### Typical Usage

For a typical MCP server:
- 1,000 requests/day = Free tier sufficient
- 10,000 requests/day = ~$5/month
- 100,000 requests/day = ~$50/month

## Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [Durable Objects Guide](https://developers.cloudflare.com/durable-objects/)
- [Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [MCP Specification](https://modelcontextprotocol.io/)

## Support

For deployment issues:
1. Check [Cloudflare Status](https://www.cloudflarestatus.com/)
2. Review [Workers Community](https://community.cloudflare.com/c/developers/workers/)
3. Open an issue in the [GitHub repository](https://github.com/agilesix/va-lighthouse-mcp/issues)
