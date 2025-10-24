/**
 * Comprehensive Integration Test Suite
 *
 * Tests all 13 MCP tools in sequence to verify complete system functionality.
 * This is the integration equivalent of the old test-all-tools.js script.
 *
 * Prerequisites:
 * - Server must be running: npm run dev
 * - Server must be available on http://localhost:8788
 */

import { describe, it, expect, beforeAll } from "vitest";
import { createMCPClient } from "./adapters/mcp-client.js";

const client = createMCPClient();

describe("Comprehensive Tool Suite - All 13 Tools", () => {
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

	describe("Complete Tool Test Suite", () => {
		it("should successfully call all 13 tools", async () => {
			const results: Array<{ tool: string; success: boolean; error?: string }> =
				[];

			// Discovery Tools (2)
			try {
				await client.callTool("list_lighthouse_apis", {
					includeDeprecated: false,
				});
				results.push({ tool: "list_lighthouse_apis", success: true });
			} catch (e: any) {
				results.push({
					tool: "list_lighthouse_apis",
					success: false,
					error: e.message,
				});
			}

			try {
				await client.callTool("get_api_info", { apiId: "benefits-claims" });
				results.push({ tool: "get_api_info", success: true });
			} catch (e: any) {
				results.push({
					tool: "get_api_info",
					success: false,
					error: e.message,
				});
			}

			// Exploration Tools (5)
			try {
				await client.callTool("get_api_summary", {
					apiId: "benefits-claims",
					version: "v2",
				});
				results.push({ tool: "get_api_summary", success: true });
			} catch (e: any) {
				results.push({
					tool: "get_api_summary",
					success: false,
					error: e.message,
				});
			}

			try {
				await client.callTool("list_api_endpoints", {
					apiId: "benefits-claims",
					version: "v2",
				});
				results.push({ tool: "list_api_endpoints", success: true });
			} catch (e: any) {
				results.push({
					tool: "list_api_endpoints",
					success: false,
					error: e.message,
				});
			}

			try {
				await client.callTool("get_endpoint_details", {
					apiId: "benefits-claims",
					version: "v2",
					path: "/veterans/{veteranId}/claims/{id}",
					method: "GET",
				});
				results.push({ tool: "get_endpoint_details", success: true });
			} catch (e: any) {
				results.push({
					tool: "get_endpoint_details",
					success: false,
					error: e.message,
				});
			}

			try {
				await client.callTool("get_api_schemas", {
					apiId: "benefits-claims",
					version: "v2",
				});
				results.push({ tool: "get_api_schemas", success: true });
			} catch (e: any) {
				results.push({
					tool: "get_api_schemas",
					success: false,
					error: e.message,
				});
			}

			try {
				await client.callTool("search_api_operations", {
					apiId: "benefits-claims",
					version: "v2",
					query: "claim",
				});
				results.push({ tool: "search_api_operations", success: true });
			} catch (e: any) {
				results.push({
					tool: "search_api_operations",
					success: false,
					error: e.message,
				});
			}

			// Validation Tools (4)
			try {
				await client.callTool("generate_example_payload", {
					apiId: "benefits-claims",
					version: "v2",
					path: "/veterans/{veteranId}/claims/{id}",
					method: "GET",
				});
				results.push({ tool: "generate_example_payload", success: true });
			} catch (e: any) {
				results.push({
					tool: "generate_example_payload",
					success: false,
					error: e.message,
				});
			}

			try {
				await client.callTool("validate_request_payload", {
					apiId: "benefits-claims",
					version: "v2",
					path: "/veterans/{veteranId}/claims/{id}",
					method: "GET",
				});
				results.push({ tool: "validate_request_payload", success: true });
			} catch (e: any) {
				results.push({
					tool: "validate_request_payload",
					success: false,
					error: e.message,
				});
			}

			try {
				await client.callTool("validate_response_payload", {
					apiId: "benefits-claims",
					version: "v2",
					path: "/veterans/{veteranId}/claims/{id}",
					method: "GET",
					statusCode: "200",
					payload: { data: { id: "123", type: "claim" } },
				});
				results.push({ tool: "validate_response_payload", success: true });
			} catch (e: any) {
				results.push({
					tool: "validate_response_payload",
					success: false,
					error: e.message,
				});
			}

			try {
				await client.callTool("get_validation_rules", {
					apiId: "benefits-claims",
					version: "v2",
					path: "/veterans/{veteranId}/claims/{id}",
					method: "GET",
				});
				results.push({ tool: "get_validation_rules", success: true });
			} catch (e: any) {
				results.push({
					tool: "get_validation_rules",
					success: false,
					error: e.message,
				});
			}

			// Utility Tools (2)
			try {
				await client.callTool("check_api_health", {
					apiId: "benefits-claims",
					healthCheckUrl: "https://api.va.gov/services/claims/v2/healthcheck",
				});
				results.push({ tool: "check_api_health", success: true });
			} catch (e: any) {
				results.push({
					tool: "check_api_health",
					success: false,
					error: e.message,
				});
			}

			try {
				await client.callTool("compare_api_versions", {
					apiId: "benefits-claims",
					version1: "v1",
					version2: "v2",
				});
				results.push({ tool: "compare_api_versions", success: true });
			} catch (e: any) {
				results.push({
					tool: "compare_api_versions",
					success: false,
					error: e.message,
				});
			}

			// Print summary
			const passed = results.filter((r) => r.success).length;
			const failed = results.filter((r) => !r.success).length;

			console.log("\n=== Test Summary ===");
			console.log(`Total Tools: ${results.length}`);
			console.log(`✅ Passed: ${passed}`);
			console.log(`❌ Failed: ${failed}`);

			if (failed > 0) {
				console.log("\nFailed Tools:");
				results
					.filter((r) => !r.success)
					.forEach((r) => {
						console.log(`  - ${r.tool}: ${r.error}`);
					});
			}

			// All tools should succeed
			expect(passed).toBe(13);
			expect(failed).toBe(0);
		}, 60000); // 60 second timeout for comprehensive test
	});

	describe("Tool Categories", () => {
		it("should have all Discovery tools working", async () => {
			const result1 = await client.callTool("list_lighthouse_apis", {
				includeDeprecated: false,
			});
			const text1 = client.getTextContent(result1);
			expect(text1).toContain("Found");

			const result2 = await client.callTool("get_api_info", {
				apiId: "benefits-claims",
			});
			const text2 = client.getTextContent(result2);
			expect(text2).toContain("API:");
		});

		it("should have all Exploration tools working", async () => {
			const tools = [
				{
					name: "get_api_summary",
					args: { apiId: "benefits-claims", version: "v2" },
				},
				{
					name: "list_api_endpoints",
					args: { apiId: "benefits-claims", version: "v2" },
				},
				{
					name: "get_endpoint_details",
					args: {
						apiId: "benefits-claims",
						version: "v2",
						path: "/veterans/{veteranId}/claims/{id}",
						method: "GET",
					},
				},
				{
					name: "get_api_schemas",
					args: { apiId: "benefits-claims", version: "v2" },
				},
				{
					name: "search_api_operations",
					args: { apiId: "benefits-claims", version: "v2", query: "claim" },
				},
			];

			for (const tool of tools) {
				const result = await client.callTool(tool.name, tool.args);
				const text = client.getTextContent(result);
				expect(text.length).toBeGreaterThan(0);
			}
		});

		it("should have all Validation tools working", async () => {
			const tools = [
				{
					name: "generate_example_payload",
					args: {
						apiId: "benefits-claims",
						version: "v2",
						path: "/veterans/{veteranId}/claims/{id}",
						method: "GET",
					},
				},
				{
					name: "validate_request_payload",
					args: {
						apiId: "benefits-claims",
						version: "v2",
						path: "/veterans/{veteranId}/claims/{id}",
						method: "GET",
					},
				},
				{
					name: "validate_response_payload",
					args: {
						apiId: "benefits-claims",
						version: "v2",
						path: "/veterans/{veteranId}/claims/{id}",
						method: "GET",
						statusCode: "200",
						payload: { data: { id: "123", type: "claim" } },
					},
				},
				{
					name: "get_validation_rules",
					args: {
						apiId: "benefits-claims",
						version: "v2",
						path: "/veterans/{veteranId}/claims/{id}",
						method: "GET",
					},
				},
			];

			for (const tool of tools) {
				const result = await client.callTool(tool.name, tool.args);
				expect(result).toBeDefined();
			}
		});

		it("should have all Utility tools working", async () => {
			const result1 = await client.callTool("check_api_health", {
				apiId: "benefits-claims",
				healthCheckUrl: "https://api.va.gov/services/claims/v2/healthcheck",
			});
			const text1 = client.getTextContent(result1);
			expect(text1).toContain("Health Check");

			const result2 = await client.callTool("compare_api_versions", {
				apiId: "benefits-claims",
				version1: "v1",
				version2: "v2",
			});
			const text2 = client.getTextContent(result2);
			expect(text2).toMatch(/Comparison|version/i);
		});
	});
});
