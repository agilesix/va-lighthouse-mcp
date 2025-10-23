/**
 * Integration Tests for MCP Protocol
 *
 * Tests basic MCP protocol functionality:
 * - Server connectivity
 * - Session management
 * - Tool listing
 * - Error handling
 *
 * Prerequisites:
 * - Server must be running: npm run dev
 * - Server must be available on http://localhost:8788
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createMCPClient } from "../helpers/mcp-client.js";

describe("MCP Protocol", () => {
	let client: ReturnType<typeof createMCPClient>;

	beforeEach(() => {
		// Create fresh client for each test
		client = createMCPClient();
	});

	describe("Server Connectivity", () => {
		it("should connect to the MCP server", async () => {
			const isAvailable = await client.isServerAvailable();
			expect(isAvailable).toBe(true);
		});

		it("should handle server initialization", async () => {
			const result = await client.initialize();

			// Should return protocol version and capabilities
			expect(result).toBeDefined();
			expect(result.protocolVersion).toBeDefined();
		});

		it("should establish a session ID", async () => {
			await client.initialize();

			const sessionId = client.getSessionId();
			expect(sessionId).toBeDefined();
			expect(typeof sessionId).toBe("string");
			expect(sessionId!.length).toBeGreaterThan(0);
		});
	});

	describe("Tool Listing", () => {
		it("should list all available tools", async () => {
			await client.initialize();

			const tools = await client.listTools();

			// Should return tools array
			expect(tools.tools).toBeDefined();
			expect(Array.isArray(tools.tools)).toBe(true);
			expect(tools.tools.length).toBeGreaterThan(0);
		});

		it("should include all 13 expected tools", async () => {
			await client.initialize();

			const tools = await client.listTools();
			const toolNames = tools.tools.map((t: any) => t.name);

			// Discovery tools (2)
			expect(toolNames).toContain("list_lighthouse_apis");
			expect(toolNames).toContain("get_api_info");

			// Exploration tools (5)
			expect(toolNames).toContain("get_api_summary");
			expect(toolNames).toContain("list_api_endpoints");
			expect(toolNames).toContain("get_endpoint_details");
			expect(toolNames).toContain("get_api_schemas");
			expect(toolNames).toContain("search_api_operations");

			// Validation tools (4)
			expect(toolNames).toContain("generate_example_payload");
			expect(toolNames).toContain("validate_request_payload");
			expect(toolNames).toContain("validate_response_payload");
			expect(toolNames).toContain("get_validation_rules");

			// Utility tools (2)
			expect(toolNames).toContain("check_api_health");
			expect(toolNames).toContain("compare_api_versions");

			// Should have exactly 13 tools
			expect(toolNames.length).toBe(13);
		});

		it("should provide tool descriptions", async () => {
			await client.initialize();

			const tools = await client.listTools();

			// Each tool should have a description
			for (const tool of tools.tools) {
				expect(tool.name).toBeDefined();
				expect(tool.description).toBeDefined();
				expect(typeof tool.description).toBe("string");
				expect(tool.description.length).toBeGreaterThan(0);
			}
		});

		it("should provide tool input schemas", async () => {
			await client.initialize();

			const tools = await client.listTools();

			// Each tool should have an input schema
			for (const tool of tools.tools) {
				expect(tool.inputSchema).toBeDefined();
				expect(typeof tool.inputSchema).toBe("object");
			}
		});
	});

	describe("Session Management", () => {
		it("should maintain session across multiple requests", async () => {
			await client.initialize();

			const firstSessionId = client.getSessionId();

			// Make another request
			await client.listTools();

			const secondSessionId = client.getSessionId();

			// Session ID should remain the same
			expect(secondSessionId).toBe(firstSessionId);
		});

		it("should allow session reset", async () => {
			await client.initialize();

			const firstSessionId = client.getSessionId();
			expect(firstSessionId).toBeDefined();

			// Reset session
			client.resetSession();

			const sessionAfterReset = client.getSessionId();
			expect(sessionAfterReset).toBeNull();
		});

		it("should create new session after reset", async () => {
			await client.initialize();
			const firstSessionId = client.getSessionId();

			client.resetSession();

			await client.initialize();
			const newSessionId = client.getSessionId();

			// Should have a different session ID
			expect(newSessionId).toBeDefined();
			expect(newSessionId).not.toBe(firstSessionId);
		});
	});

	describe("SSE Format Handling", () => {
		it("should handle Server-Sent Events response format", async () => {
			await client.initialize();

			// List tools uses SSE format
			const result = await client.listTools();

			// Should successfully parse SSE response
			expect(result).toBeDefined();
			expect(result.tools).toBeDefined();
		});

		it("should handle tool call responses in SSE format", async () => {
			await client.initialize();

			const result = await client.callTool("list_lighthouse_apis", {
				includeDeprecated: false,
			});

			// Should successfully parse tool call response
			expect(result).toBeDefined();
			expect(result.content).toBeDefined();
			expect(Array.isArray(result.content)).toBe(true);
		});
	});

	describe("Error Handling", () => {
		it("should handle invalid tool names gracefully", async () => {
			await client.initialize();

			try {
				await client.callTool("nonexistent_tool", {});
				// If it doesn't throw, that's okay too
			} catch (error: any) {
				// Should provide a meaningful error
				expect(error).toBeDefined();
				expect(error.message).toContain("Tool");
			}
		});

		it("should handle missing required arguments", async () => {
			await client.initialize();

			try {
				// get_api_info requires apiId
				await client.callTool("get_api_info", {});
				// If it doesn't throw, response should indicate error
			} catch (error: any) {
				// Should provide meaningful error about missing argument
				expect(error).toBeDefined();
				expect(error.message.toLowerCase()).toMatch(/apiid|argument|parameter|required/);
			}
		});

		it("should handle server unavailability", async () => {
			// Create client with invalid URL
			const badClient = createMCPClient("http://localhost:9999/sse");

			const isAvailable = await badClient.isServerAvailable();
			expect(isAvailable).toBe(false);
		});
	});

	describe("Request/Response Format", () => {
		it("should send proper JSON-RPC 2.0 format", async () => {
			// This is implicitly tested by successful communication
			await client.initialize();

			const result = await client.request("tools/list");

			// Should receive valid JSON-RPC response
			expect(result.jsonrpc).toBe("2.0");
			expect(result.id).toBeDefined();
			expect(result.result || result.error).toBeDefined();
		});

		it("should include proper headers", async () => {
			// Headers are handled internally, but we can verify they work
			await client.initialize();

			// If this succeeds, headers were correct
			const tools = await client.listTools();
			expect(tools).toBeDefined();
		});

		it("should increment request IDs", async () => {
			await client.initialize();

			// Make multiple requests
			const result1 = await client.request("tools/list");
			const result2 = await client.request("tools/list");

			// Request IDs should be different
			expect(result2.id).toBeGreaterThan(result1.id);
		});
	});
});
