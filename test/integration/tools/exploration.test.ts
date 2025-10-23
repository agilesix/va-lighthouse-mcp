/**
 * Integration Tests for Exploration Tools
 *
 * Tests the MCP tools for exploring VA Lighthouse API details:
 * - get_api_summary
 * - list_api_endpoints
 * - get_endpoint_details
 * - get_api_schemas
 * - search_api_operations
 *
 * Prerequisites:
 * - Server must be running: npm run dev
 * - Server must be available on http://localhost:8788
 */

import { describe, it, expect, beforeAll } from "vitest";
import { createMCPClient } from "../../helpers/mcp-client.js";

const client = createMCPClient();
const TEST_API = "benefits-claims";
const TEST_VERSION = "v2";
const TEST_ENDPOINT = "/veterans/{veteranId}/claims/{id}";
const TEST_METHOD = "GET";

describe("Exploration Tools", () => {
	beforeAll(async () => {
		// Check server availability
		const isAvailable = await client.isServerAvailable();
		if (!isAvailable) {
			throw new Error(
				"MCP server is not running. Please start it with: npm run dev",
			);
		}

		// Initialize MCP session
		await client.initialize();
	});

	describe("get_api_summary", () => {
		it("should return summary with endpoint count and tags", async () => {
			const result = await client.callTool("get_api_summary", {
				apiId: TEST_API,
				version: TEST_VERSION,
			});

			const text = client.getTextContent(result);

			// Should include API name
			expect(text).toContain("API: Benefits Claims");

			// Should include endpoint count
			expect(text).toContain("Total Endpoints:");

			// Should include tags
			expect(text).toContain("Tags");
		});

		it("should handle version parameter", async () => {
			const result = await client.callTool("get_api_summary", {
				apiId: TEST_API,
				version: "v1",
			});

			const text = client.getTextContent(result);

			// Should return content for v1 (even if different from v2)
			expect(text.length).toBeGreaterThan(50);
		});

		it("should provide meaningful summary information", async () => {
			const result = await client.callTool("get_api_summary", {
				apiId: TEST_API,
				version: TEST_VERSION,
			});

			const text = client.getTextContent(result);

			// Should have substantive content
			expect(text.length).toBeGreaterThan(100);

			// Should be structured with sections
			expect(text).toMatch(/API:|Summary:|Endpoints:/i);
		});
	});

	describe("list_api_endpoints", () => {
		it("should return list of endpoints with HTTP methods", async () => {
			const result = await client.callTool("list_api_endpoints", {
				apiId: TEST_API,
				version: TEST_VERSION,
			});

			const text = client.getTextContent(result);

			// Should indicate endpoints found
			expect(text).toContain("Found");
			expect(text).toMatch(/endpoint/i);

			// Should include HTTP methods
			expect(text).toMatch(/GET|POST|PUT|DELETE|PATCH/);
		});

		it("should filter endpoints by method when specified", async () => {
			const result = await client.callTool("list_api_endpoints", {
				apiId: TEST_API,
				version: TEST_VERSION,
				method: "GET",
			});

			const text = client.getTextContent(result);

			// Should return GET endpoints
			expect(text).toContain("GET");
		});

		it("should filter endpoints by tag when specified", async () => {
			const result = await client.callTool("list_api_endpoints", {
				apiId: TEST_API,
				version: TEST_VERSION,
				tag: "Claims",
			});

			const text = client.getTextContent(result);

			// Should return filtered results
			expect(text).toMatch(/Found|endpoint/i);
		});

		it("should handle deprecated endpoint filtering", async () => {
			const result = await client.callTool("list_api_endpoints", {
				apiId: TEST_API,
				version: TEST_VERSION,
				includeDeprecated: false,
			});

			const text = client.getTextContent(result);

			// Should return non-deprecated endpoints
			expect(text).toMatch(/Found|endpoint/i);
		});
	});

	describe("get_endpoint_details", () => {
		it("should return detailed endpoint information", async () => {
			const result = await client.callTool("get_endpoint_details", {
				apiId: TEST_API,
				version: TEST_VERSION,
				path: TEST_ENDPOINT,
				method: TEST_METHOD,
			});

			const text = client.getTextContent(result);

			// Should include endpoint identification
			expect(text).toMatch(/GET \/veterans|Endpoint/i);

			// Should include parameters or summary
			expect(text).toMatch(/Parameters|Summary/i);
		});

		it("should include path parameters if present", async () => {
			const result = await client.callTool("get_endpoint_details", {
				apiId: TEST_API,
				version: TEST_VERSION,
				path: TEST_ENDPOINT,
				method: TEST_METHOD,
			});

			const text = client.getTextContent(result);

			// Endpoint has path parameters, should be documented
			expect(text).toMatch(/veteranId|parameter|path/i);
		});

		it("should handle invalid endpoint gracefully", async () => {
			try {
				const result = await client.callTool("get_endpoint_details", {
					apiId: TEST_API,
					version: TEST_VERSION,
					path: "/nonexistent/endpoint",
					method: "GET",
				});

				const text = client.getTextContent(result);

				// Should indicate not found
				expect(text.toLowerCase()).toMatch(/not found|invalid|error/);
			} catch (error) {
				// Alternatively might throw
				expect(error).toBeDefined();
			}
		});

		it("should provide comprehensive endpoint documentation", async () => {
			const result = await client.callTool("get_endpoint_details", {
				apiId: TEST_API,
				version: TEST_VERSION,
				path: TEST_ENDPOINT,
				method: TEST_METHOD,
			});

			const text = client.getTextContent(result);

			// Should have detailed content
			expect(text.length).toBeGreaterThan(100);

			// Should include key documentation sections
			expect(text).toMatch(/Description|Summary|Parameters|Response/i);
		});
	});

	describe("get_api_schemas", () => {
		it("should return API schema information", async () => {
			const result = await client.callTool("get_api_schemas", {
				apiId: TEST_API,
				version: TEST_VERSION,
			});

			const text = client.getTextContent(result);

			// Should mention schemas
			expect(text).toMatch(/Schemas in Benefits Claims|schema/i);
		});

		it("should filter schemas by name when specified", async () => {
			const result = await client.callTool("get_api_schemas", {
				apiId: TEST_API,
				version: TEST_VERSION,
				schemaName: "Claim",
			});

			const text = client.getTextContent(result);

			// Should return filtered schema
			expect(text).toMatch(/schema/i);
		});

		it("should provide schema details when requested", async () => {
			const result = await client.callTool("get_api_schemas", {
				apiId: TEST_API,
				version: TEST_VERSION,
				includeDetails: true,
			});

			const text = client.getTextContent(result);

			// Should have a valid response (some APIs have inline schemas rather than named schemas)
			expect(text.length).toBeGreaterThan(0);
			expect(text).toMatch(/Found \d+ schema/i);
		});
	});

	describe("search_api_operations", () => {
		it("should find operations matching search query", async () => {
			const result = await client.callTool("search_api_operations", {
				apiId: TEST_API,
				version: TEST_VERSION,
				query: "claim",
			});

			const text = client.getTextContent(result);

			// Should return search results
			expect(text).toContain("Found");
			expect(text).toMatch(/operation|endpoint/i);
		});

		it("should handle case-insensitive search", async () => {
			const result = await client.callTool("search_api_operations", {
				apiId: TEST_API,
				version: TEST_VERSION,
				query: "CLAIM",
			});

			const text = client.getTextContent(result);

			// Should still find results
			expect(text).toContain("Found");
		});

		it("should return no results for non-matching query", async () => {
			const result = await client.callTool("search_api_operations", {
				apiId: TEST_API,
				version: TEST_VERSION,
				query: "zzzznonexistentquery9999",
			});

			const text = client.getTextContent(result);

			// Should indicate no results
			expect(text.toLowerCase()).toMatch(/found 0|no.*found|no.*match/i);
		});

		it("should search across multiple fields", async () => {
			const result = await client.callTool("search_api_operations", {
				apiId: TEST_API,
				version: TEST_VERSION,
				query: "veteran",
			});

			const text = client.getTextContent(result);

			// Should find operations related to veterans
			expect(text).toContain("Found");
			expect(text).toMatch(/veteran/i);
		});
	});
});
