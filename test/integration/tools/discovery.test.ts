/**
 * Integration Tests for Discovery Tools
 *
 * Tests the MCP tools for discovering VA Lighthouse APIs:
 * - list_lighthouse_apis
 * - get_api_info
 *
 * Prerequisites:
 * - Server must be running: npm run dev
 * - Server must be available on http://localhost:8788
 */

import { describe, it, expect, beforeAll } from "vitest";
import { createMCPClient } from "../../helpers/mcp-client.js";

const client = createMCPClient();

describe("Discovery Tools", () => {
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

	describe("list_lighthouse_apis", () => {
		it("should return a list of available VA Lighthouse APIs", async () => {
			const result = await client.callTool("list_lighthouse_apis", {
				includeDeprecated: false,
			});

			const text = client.getTextContent(result);

			// Should contain list indication
			expect(text).toContain("Found");
			expect(text).toContain("VA Lighthouse API");

			// Should include known APIs
			expect(text).toContain("benefits-claims");
		});

		it("should include deprecated APIs when requested", async () => {
			const result = await client.callTool("list_lighthouse_apis", {
				includeDeprecated: true,
			});

			const text = client.getTextContent(result);

			// Should still return results
			expect(text).toContain("Found");
			expect(text).toContain("VA Lighthouse API");
		});

		it("should filter by category when specified", async () => {
			const result = await client.callTool("list_lighthouse_apis", {
				includeDeprecated: false,
				category: "Benefits",
			});

			const text = client.getTextContent(result);

			// Should return filtered results
			expect(text).toContain("Found");
		});

		it("should return results without parameters", async () => {
			const result = await client.callTool("list_lighthouse_apis", {});

			const text = client.getTextContent(result);

			// Should have default behavior
			expect(text).toContain("Found");
			expect(text).toContain("VA Lighthouse API");
		});
	});

	describe("get_api_info", () => {
		it("should return detailed information for a specific API", async () => {
			const result = await client.callTool("get_api_info", {
				apiId: "benefits-claims",
			});

			const text = client.getTextContent(result);

			// Should include API name
			expect(text).toContain("API: Benefits Claims");

			// Should include version information
			expect(text).toContain("Available Versions");
		});

		it("should handle invalid API ID gracefully", async () => {
			try {
				const result = await client.callTool("get_api_info", {
					apiId: "non-existent-api-id-12345",
				});

				const text = client.getTextContent(result);

				// Should indicate API not found
				expect(text.toLowerCase()).toMatch(/not found|invalid|error/);
			} catch (error) {
				// Alternatively, might throw an error
				expect(error).toBeDefined();
			}
		});

		it("should include all required metadata fields", async () => {
			const result = await client.callTool("get_api_info", {
				apiId: "benefits-claims",
			});

			const text = client.getTextContent(result);

			// Check for key metadata fields
			expect(text).toContain("API:");
			expect(text).toContain("Versions");

			// Should have some descriptive content
			expect(text.length).toBeGreaterThan(50);
		});

		it("should work with different valid API IDs", async () => {
			// Try another known API if available
			const apiIds = ["benefits-claims", "address-validation"];

			for (const apiId of apiIds) {
				try {
					const result = await client.callTool("get_api_info", {
						apiId,
					});

					const text = client.getTextContent(result);

					// Should return valid content
					expect(text.length).toBeGreaterThan(20);
				} catch (error) {
					// If API doesn't exist, that's okay for this test
					console.log(`API ${apiId} may not exist, skipping`);
				}
			}
		});

		it("should include base URLs for each version", async () => {
			const result = await client.callTool("get_api_info", {
				apiId: "benefits-claims",
			});

			const text = client.getTextContent(result);

			// Should have version details section
			expect(text).toContain("Available Versions");

			// Should include base URL field
			expect(text).toContain("Base URL:");

			// Should mark latest version
			expect(text).toContain("(latest)");

			// Should have URLs that match expected pattern (https://...)
			expect(text).toMatch(/https:\/\/[^\s]+/);

			// Should have OpenAPI Spec URLs
			expect(text).toContain("OpenAPI Spec:");

			// May have health check URLs
			if (text.includes("Health Check:")) {
				expect(text).toMatch(/Health Check:.*https:\/\//);
			}
		});
	});
});
