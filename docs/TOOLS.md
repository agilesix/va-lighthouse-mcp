# MCP Tools Reference

Complete documentation for all 13 MCP tools provided by the VA Lighthouse MCP Server.

## Table of Contents

- [Discovery Tools](#discovery-tools) (2)
  - [list_lighthouse_apis](#list_lighthouse_apis)
  - [get_api_info](#get_api_info)
- [Exploration Tools](#exploration-tools) (5)
  - [get_api_summary](#get_api_summary)
  - [list_api_endpoints](#list_api_endpoints)
  - [get_endpoint_details](#get_endpoint_details)
  - [get_api_schemas](#get_api_schemas)
  - [search_api_operations](#search_api_operations)
- [Validation Tools](#validation-tools) (4)
  - [validate_request_payload](#validate_request_payload)
  - [validate_response_payload](#validate_response_payload)
  - [generate_example_payload](#generate_example_payload)
  - [get_validation_rules](#get_validation_rules)
- [Utility Tools](#utility-tools) (2)
  - [check_api_health](#check_api_health)
  - [compare_api_versions](#compare_api_versions)

---

## Discovery Tools

Tools for discovering and getting metadata about VA Lighthouse APIs.

### list_lighthouse_apis

Lists all available VA Lighthouse APIs with their metadata, optionally filtered by category.

**Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `includeDeprecated` | boolean | No | Include deprecated APIs in the results |
| `category` | enum | No | Filter by category: `benefits`, `health`, `facilities`, `verification`, `other`, `all` (default: `all`) |

**Returns**

Grouped list of APIs by category with:
- API name and ID
- Description
- Status (if not active)

**Categories**

- **Benefits**: Claims, appeals, decision reviews, loan guaranty, etc.
- **Health**: Patient records (FHIR), prescriptions, appointments, immunizations
- **Facilities**: VA facilities locator
- **Verification**: Veteran status, disability rating, service history
- **Other**: Address validation, forms, representatives, direct deposit

**Example Usage**

```typescript
// List all active APIs
listLighthouseApis({ category: "all" })

// List only health APIs including deprecated
listLighthouseApis({
  category: "health",
  includeDeprecated: true
})

// List benefits APIs
listLighthouseApis({ category: "benefits" })
```

**Example Output**

```
Found 3 VA Lighthouse APIs in category: health

## Health (3)

• VA Health API (health)
  Access patient health records (FHIR)

• Community Care API (community-care)
  Community care eligibility

• Prescriptions API (prescriptions)
  Prescription tracking and refills
```

---

### get_api_info

Gets detailed information about a specific VA Lighthouse API including versions, endpoints, and contact information.

**Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `apiId` | string | Yes | The API ID (e.g., `benefits-claims`, `facilities`) |

**Returns**

Detailed API metadata including:
- Name, ID, description
- Status and authentication requirements
- Available versions with URLs
- OpenAPI specification URLs
- Health check endpoints
- Documentation links
- Contact information

**Example Usage**

```typescript
getApiInfo({ apiId: "benefits-claims" })
getApiInfo({ apiId: "facilities" })
```

**Example Output**

```
API: Benefits Claims API
ID: benefits-claims

Description: Submit and track benefits claims

Status: active
Authentication Required: Yes
Category: benefits

Available Versions (2):

  v1 (latest)
    Base URL: https://api.va.gov/services/benefits-claims/v1
    OpenAPI Spec: https://api.va.gov/services/benefits-claims/v1/openapi.json
    Health Check: https://api.va.gov/services/benefits-claims/v1/health

  v0
    Base URL: https://api.va.gov/services/benefits-claims/v0
    OpenAPI Spec: https://api.va.gov/services/benefits-claims/v0/openapi.json
    Status: deprecated

Documentation: https://developer.va.gov/explore/api/benefits-claims
```

---

## Exploration Tools

Tools for exploring API structures, endpoints, and schemas.

### get_api_summary

Gets a comprehensive summary of an API including total endpoints, authentication methods, tags, and contact information.

**Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `apiId` | string | Yes | The API ID |
| `version` | string | Yes | The API version (e.g., `v1`, `v2`) |

**Returns**

High-level API overview including:
- Title, version, base URL
- Description
- Total endpoint count
- Authentication methods
- Tags with endpoint counts
- Contact information

**Example Usage**

```typescript
getApiSummary({
  apiId: "benefits-claims",
  version: "v1"
})
```

**Example Output**

```
API: Benefits Claims API
Version: v1
Base URL: https://api.va.gov/services/benefits-claims/v1

Description: Submit and track VA benefits claims

Total Endpoints: 12

Authentication Methods: bearer, apiKey

Tags (3):
  • Claims (8 endpoints)
    Submit and manage benefits claims
  • Evidence (3 endpoints)
    Upload supporting evidence
  • Status (1 endpoint)
    Check claim status

Contact:
  Name: VA API Support
  Email: api@va.gov
  URL: https://developer.va.gov/support
```

---

### list_api_endpoints

Lists all endpoints for an API with optional filtering by tag, HTTP method, and deprecation status.

**Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `apiId` | string | Yes | The API ID |
| `version` | string | Yes | The API version |
| `tag` | string | No | Filter by tag |
| `method` | string | No | Filter by HTTP method (`GET`, `POST`, etc.) |
| `includeDeprecated` | boolean | No | Include deprecated endpoints |

**Returns**

List of endpoints with:
- HTTP method and path
- Summary
- Operation ID
- Tags
- Deprecation status

**Example Usage**

```typescript
// List all endpoints
listApiEndpoints({
  apiId: "benefits-claims",
  version: "v1"
})

// Filter by tag
listApiEndpoints({
  apiId: "benefits-claims",
  version: "v1",
  tag: "Claims"
})

// Filter by method
listApiEndpoints({
  apiId: "benefits-claims",
  version: "v1",
  method: "POST"
})
```

**Example Output**

```
Found 3 endpoints
(filtered by method: POST)

POST /claims
  Summary: Submit a new benefits claim
  Operation ID: submitClaim
  Tags: Claims

POST /claims/{claimId}/evidence
  Summary: Upload evidence for a claim
  Operation ID: uploadEvidence
  Tags: Claims, Evidence

POST /claims/{claimId}/withdraw
  Summary: Withdraw a pending claim
  Operation ID: withdrawClaim
  Tags: Claims
```

---

### get_endpoint_details

Gets detailed information about a specific API endpoint including parameters, request body, responses, and security requirements.

**Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `apiId` | string | Yes | The API ID |
| `version` | string | Yes | The API version |
| `path` | string | Yes | The endpoint path (e.g., `/veterans/{id}`) |
| `method` | string | Yes | The HTTP method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) |
| `detail_level` | enum | No | Schema detail level: `minimal`, `standard` (default), `full` |
| `max_depth` | number | No | Maximum nesting depth for schemas (default: 3, range: 1-10) |

**Detail Levels**

- **minimal**: Only required fields, types, and structure (fastest, prevents truncation)
- **standard**: Includes descriptions, examples, respects max_depth (default, balanced)
- **full**: Complete schema with all details (may truncate on complex endpoints)

**Returns**

Complete endpoint specification including:
- Summary and description
- Deprecation status
- Parameters (path, query, header)
- Request body schema
- Response schemas by status code
- Security requirements

**Example Usage**

```typescript
// Standard detail level
getEndpointDetails({
  apiId: "benefits-claims",
  version: "v1",
  path: "/claims/{claimId}",
  method: "GET"
})

// Minimal detail level (fast, no truncation)
getEndpointDetails({
  apiId: "benefits-claims",
  version: "v1",
  path: "/claims",
  method: "POST",
  detail_level: "minimal"
})

// Full detail level with deeper nesting
getEndpointDetails({
  apiId: "benefits-claims",
  version: "v1",
  path: "/claims",
  method: "POST",
  detail_level: "full",
  max_depth: 5
})
```

**Example Output**

```
POST /claims

Summary: Submit a new benefits claim

Description: Creates a new VA benefits claim with veteran information and supporting evidence

Operation ID: submitClaim

Tags: Claims

Parameters (1):
  • X-VA-User (header) (required)
    Veteran identifier
    Type: string
    Example: "123456789"

Request Body (required):
  Content-Type: application/json
  Schema:
    {
      "type": "object",
      "required": ["data"],
      "properties": {
        "data": {
          "type": "object",
          "required": ["type", "attributes"],
          "properties": {
            "type": { "type": "string", "enum": ["claim"] },
            "attributes": { "..." }
          }
        }
      }
    }

Responses:
  201: Claim created successfully
    Content-Type: application/json
    Schema:
      { "type": "object", "..." }

  400: Invalid request
    Content-Type: application/json

  401: Unauthorized

Security:
  • bearer: profile, claims.write
```

---

### get_api_schemas

Lists reusable schema components defined in the OpenAPI specification's `components/schemas` section.

**Important**: Many VA APIs define schemas inline within endpoint definitions rather than in reusable components. If this tool returns 0 schemas, use `get_endpoint_details` or `get_validation_rules` to view endpoint-specific schemas.

**Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `apiId` | string | Yes | The API ID |
| `version` | string | Yes | The API version |
| `schemaName` | string | No | Optional: specific schema name to retrieve |

**Returns**

- Without `schemaName`: List of all schemas with type, description, properties
- With `schemaName`: Full schema definition for the specified schema

**Example Usage**

```typescript
// List all schemas
getApiSchemas({
  apiId: "benefits-claims",
  version: "v1"
})

// Get specific schema
getApiSchemas({
  apiId: "benefits-claims",
  version: "v1",
  schemaName: "Claim"
})
```

**Example Output (List)**

```
Found 3 schemas:

• Claim
  Type: object
  Description: A VA benefits claim
  Properties (5): id, type, attributes, relationships, links
  Required: type, attributes

• ClaimAttributes
  Type: object
  Properties (8): claimType, veteranIdentification, serviceInformation, ...

• Evidence
  Type: object
  Description: Supporting evidence for a claim
  Properties (3): documentType, description, uploadedAt
```

**Example Output (Empty)**

```
No reusable schema components found in benefits-claims v1.

This API likely defines schemas inline within endpoint definitions rather than in a reusable components section.

To view schemas for this API:
• Use 'get_endpoint_details' with a specific endpoint path and method
• Use 'get_validation_rules' to see detailed field validation rules for request/response payloads
```

---

### search_api_operations

Searches for API operations matching a query string across paths, summaries, descriptions, operation IDs, and tags.

**Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `apiId` | string | Yes | The API ID |
| `version` | string | Yes | The API version |
| `query` | string | Yes | Search query |

**Returns**

List of matching endpoints with:
- HTTP method and path
- Summary
- Operation ID
- Tags
- Deprecation status

**Example Usage**

```typescript
searchApiOperations({
  apiId: "benefits-claims",
  version: "v1",
  query: "upload"
})

searchApiOperations({
  apiId: "facilities",
  version: "v1",
  query: "location"
})
```

**Example Output**

```
Found 2 matching endpoints for query: "upload"

POST /claims/{claimId}/evidence
  Summary: Upload evidence for a claim
  Operation ID: uploadEvidence
  Tags: Claims, Evidence

PUT /claims/{claimId}/documents/{documentId}
  Summary: Update uploaded document metadata
  Operation ID: updateDocument
  Tags: Evidence
```

---

## Validation Tools

Tools for validating payloads, generating examples, and understanding validation rules.

### validate_request_payload

Validates a request payload against the API's OpenAPI schema using Zod validation.

**Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `apiId` | string | Yes | The API ID |
| `version` | string | Yes | The API version |
| `path` | string | Yes | The endpoint path |
| `method` | string | Yes | The HTTP method |
| `payload` | any | Yes | The request payload to validate (JSON object or string) |

**Returns**

Validation result with:
- Valid/invalid status
- List of errors with field paths
- Error messages with fix suggestions
- Pattern/regex validation details

**Example Usage**

```typescript
validateRequestPayload({
  apiId: "benefits-claims",
  version: "v1",
  path: "/claims",
  method: "POST",
  payload: {
    data: {
      type: "claim",
      attributes: {
        veteranIdentification: {
          ssn: "123-45-6789"
        }
      }
    }
  }
})
```

**Example Output (Valid)**

```
✅ Validation passed

The payload is valid according to the API schema.
```

**Example Output (Invalid)**

```
❌ Validation failed

Found 2 validation errors:

1. data.attributes.veteranIdentification.ssn
   Error: String must match pattern ^\\d{9}$
   Expected: 9-digit SSN without hyphens
   Received: "123-45-6789"
   Fix: Remove hyphens (e.g., "123456789")

2. data.attributes.claimType
   Error: Required field is missing
   This field is required by the API schema
```

---

### validate_response_payload

Validates a response payload against the API's OpenAPI schema for a specific status code.

**Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `apiId` | string | Yes | The API ID |
| `version` | string | Yes | The API version |
| `path` | string | Yes | The endpoint path |
| `method` | string | Yes | The HTTP method |
| `statusCode` | string | Yes | The response status code (e.g., `200`, `400`) |
| `payload` | any | Yes | The response payload to validate (JSON object or string) |

**Returns**

Same as `validate_request_payload` - validation result with errors and fix suggestions.

**Example Usage**

```typescript
validateResponsePayload({
  apiId: "benefits-claims",
  version: "v1",
  path: "/claims/{claimId}",
  method: "GET",
  statusCode: "200",
  payload: {
    data: {
      id: "12345",
      type: "claim",
      attributes: { /* ... */ }
    }
  }
})
```

---

### generate_example_payload

Generates an example request payload from the API's OpenAPI schema, useful for understanding the required structure and testing.

**Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `apiId` | string | Yes | The API ID |
| `version` | string | Yes | The API version |
| `path` | string | Yes | The endpoint path |
| `method` | string | Yes | The HTTP method |
| `requiredOnly` | boolean | No | Generate only required fields (default: `false`) |

**Returns**

Example payload with:
- Realistic sample values
- All required fields populated
- Optional fields (if `requiredOnly` is `false`)
- Proper nesting and structure

**Example Usage**

```typescript
// Generate full example
generateExamplePayload({
  apiId: "benefits-claims",
  version: "v1",
  path: "/claims",
  method: "POST"
})

// Generate only required fields
generateExamplePayload({
  apiId: "benefits-claims",
  version: "v1",
  path: "/claims",
  method: "POST",
  requiredOnly: true
})
```

**Example Output**

```
Example request payload for POST /claims:

{
  "data": {
    "type": "claim",
    "attributes": {
      "claimType": "compensation",
      "veteranIdentification": {
        "ssn": "123456789",
        "firstName": "John",
        "lastName": "Doe",
        "dateOfBirth": "1980-01-15"
      },
      "serviceInformation": {
        "branch": "Army",
        "startDate": "2000-06-01",
        "endDate": "2004-06-01"
      }
    }
  }
}

Note: This example includes both required and optional fields.
```

---

### get_validation_rules

Gets validation rules for an API endpoint or specific field using dot-notation paths.

**Two Modes**

1. **Schema Overview** (no `fieldPath`): Returns high-level structure with type, required fields, and property list
2. **Field Details** (with `fieldPath`): Returns detailed validation rules for a specific field

**Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `apiId` | string | Yes | The API ID |
| `version` | string | Yes | The API version |
| `path` | string | Yes | The endpoint path |
| `method` | string | Yes | The HTTP method |
| `requestOrResponse` | enum | No | `request` (default) or `response` |
| `fieldPath` | string | No | Dot-notation path to specific field (e.g., `data.attributes.ssn`) |

**Field Path Examples**

- `data.type` - top-level field
- `data.attributes.veteranIdentification.ssn` - nested field
- `data.attributes.serviceInformation.branch` - deeply nested field

**Returns**

- Without `fieldPath`: Type, required fields, property count
- With `fieldPath`: Type, format, pattern, enum values, min/max length, examples

**Example Usage**

```typescript
// Get schema overview
getValidationRules({
  apiId: "benefits-claims",
  version: "v1",
  path: "/claims",
  method: "POST"
})

// Get specific field rules
getValidationRules({
  apiId: "benefits-claims",
  version: "v1",
  path: "/claims",
  method: "POST",
  fieldPath: "data.attributes.veteranIdentification.ssn"
})

// Get response validation rules
getValidationRules({
  apiId: "benefits-claims",
  version: "v1",
  path: "/claims/{claimId}",
  method: "GET",
  requestOrResponse: "response",
  fieldPath: "data.attributes.status"
})
```

**Example Output (Schema Overview)**

```
📋 Schema overview for POST /claims (request)

💡 Tip: Add 'fieldPath' parameter to get detailed rules for specific fields
   Example: fieldPath = "data.attributes.veteranIdentification.ssn"

Type: object
Required fields: data
Properties (1): data
```

**Example Output (Field Details)**

```
🔍 Validation rules for field: data.attributes.veteranIdentification.ssn

Type: string
Description: Veteran's Social Security Number
Pattern: ^\\d{9}$
Minimum length: 9
Maximum length: 9
Example: "123456789"
```

---

## Utility Tools

Tools for health checks and version comparison.

### check_api_health

Checks the health status of an API by calling its health check endpoint.

**Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `apiId` | string | Yes | The API ID |
| `healthCheckUrl` | string | No | Custom health check URL (if not in metadata) |

**Returns**

Health status with:
- Status (`ok`, `degraded`, `down`)
- URL checked
- Timestamp
- Additional details (if provided by the API)

**Example Usage**

```typescript
// Use health check URL from metadata
checkApiHealth({
  apiId: "benefits-claims"
})

// Use custom health check URL
checkApiHealth({
  apiId: "benefits-claims",
  healthCheckUrl: "https://api.va.gov/services/benefits-claims/v1/health"
})
```

**Example Output**

```
Health Check: benefits-claims
URL: https://api.va.gov/services/benefits-claims/v1/health
Status: ok
Timestamp: 2025-03-15T14:30:00.000Z

Details:
{
  "database": "connected",
  "cache": "operational",
  "uptime": 864000
}
```

---

### compare_api_versions

Compares two versions of an API to identify changes in endpoints and schemas.

**Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `apiId` | string | Yes | The API ID |
| `version1` | string | Yes | First version to compare (e.g., `v1`) |
| `version2` | string | Yes | Second version to compare (e.g., `v2`) |

**Returns**

Comparison report with:
- Endpoint changes (added, removed, modified)
- Schema changes (added, removed, modified)
- Total change count
- Deprecation changes

**Example Usage**

```typescript
compareApiVersions({
  apiId: "benefits-claims",
  version1: "v0",
  version2: "v1"
})
```

**Example Output**

```
API Version Comparison: benefits-claims
Comparing v0 → v1

Endpoint Changes:
  Added: 3
  Removed: 1
  Modified: 2

Endpoints Added:
  + POST /claims/{claimId}/evidence
  + GET /claims/{claimId}/status
  + DELETE /claims/{claimId}

Endpoints Removed:
  - POST /claims/bulk

Endpoints Modified:
  ~ POST /claims
    • Summary changed
  ~ GET /claims/{claimId}
    • Marked as deprecated

Schema Changes:
  Added: 2
  Removed: 0
  Modified: 1

Schemas Added:
  + Evidence
  + ClaimStatus

Schemas Modified:
  ~ Claim

Total changes: 9
```

---

## Error Handling

All tools return structured error responses when issues occur:

```
Error: <error-type>

<detailed-error-message>

<helpful-suggestions>
```

Common error scenarios:
- API not found
- Invalid version
- Endpoint not found
- Missing required parameters
- Invalid payload format
- Network errors
- Schema parsing errors

## Best Practices

1. **Start with Discovery**: Use `list_lighthouse_apis` and `get_api_info` to understand available APIs
2. **Explore Structure**: Use `get_api_summary` and `list_api_endpoints` before diving into details
3. **Detail Levels**: Use `minimal` for quick structure overview, `standard` for most cases, `full` only when needed
4. **Validation**: Generate examples first with `generate_example_payload`, then validate with `validate_request_payload`
5. **Field-Level Details**: Use `get_validation_rules` with `fieldPath` for specific field requirements
6. **Caching**: Results are cached for 1 hour; repeated requests are fast and efficient

## Additional Resources

- [VA Lighthouse API Portal](https://developer.va.gov/)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Development Guide](./DEVELOPMENT.md)
- [Deployment Guide](./DEPLOYMENT.md)
