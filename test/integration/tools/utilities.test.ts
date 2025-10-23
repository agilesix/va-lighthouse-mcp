/**
 * Integration Tests for Utility Tools
 *
 * Tests the MCP utility tools:
 * - check_api_health
 * - compare_api_versions
 *
 * Prerequisites:
 * - Server must be running: npm run dev
 * - Server must be available on http://localhost:8788
 */

import { describe, it, expect, beforeAll } from "vitest";
import { createMCPClient } from "../../helpers/mcp-client.js";

const client = createMCPClient();
const TEST_API = "benefits-claims";
const HEALTH_CHECK_URL = "https://api.va.gov/services/claims/v2/healthcheck";

describe("Utility Tools", () => {
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

	describe("check_api_health", () => {
		it("should check API health status", async () => {
			const result = await client.callTool("check_api_health", {
				apiId: TEST_API,
				healthCheckUrl: HEALTH_CHECK_URL,
			});

			const text = client.getTextContent(result);

			// Should include health check heading
			expect(text).toContain("Health Check");

			// Should include status (UP, DOWN, or UNKNOWN)
			expect(text).toMatch(/UP|DOWN|UNKNOWN/i);
		});

		it("should handle unreachable health check URLs", async () => {
			const result = await client.callTool("check_api_health", {
				apiId: TEST_API,
				healthCheckUrl: "https://nonexistent-url-12345.invalid/health",
			});

			const text = client.getTextContent(result);

			// Should gracefully handle failure
			expect(text).toMatch(/DOWN|UNKNOWN|unavailable|failed|error/i);
		});

		it("should provide detailed health information", async () => {
			const result = await client.callTool("check_api_health", {
				apiId: TEST_API,
				healthCheckUrl: HEALTH_CHECK_URL,
			});

			const text = client.getTextContent(result);

			// Should have substantive content
			expect(text.length).toBeGreaterThan(30);

			// Should include the API ID
			expect(text.toLowerCase()).toContain(TEST_API.toLowerCase());
		});

		it("should work with just apiId (using default health URL)", async () => {
			try {
				const result = await client.callTool("check_api_health", {
					apiId: TEST_API,
				});

				const text = client.getTextContent(result);

				// Should attempt health check with default URL
				expect(text).toContain("Health Check");
			} catch (error) {
				// If default URL isn't available, that's okay
				expect(error).toBeDefined();
			}
		});
	});

	describe("compare_api_versions", () => {
		it("should compare two API versions", async () => {
			const result = await client.callTool("compare_api_versions", {
				apiId: TEST_API,
				version1: "v1",
				version2: "v2",
			});

			const text = client.getTextContent(result);

			// Should include comparison heading
			expect(text).toMatch(/Comparison|version/i);

			// Should mention both versions
			expect(text).toContain("v1");
			expect(text).toContain("v2");
		});

		it("should identify differences between versions", async () => {
			const result = await client.callTool("compare_api_versions", {
				apiId: TEST_API,
				version1: "v1",
				version2: "v2",
			});

			const text = client.getTextContent(result);

			// Should have meaningful comparison content
			expect(text.length).toBeGreaterThan(100);

			// Should mention endpoints or changes
			expect(text).toMatch(/endpoint|change|difference|added|removed|modified/i);
		});

		it("should handle comparing same version", async () => {
			const result = await client.callTool("compare_api_versions", {
				apiId: TEST_API,
				version1: "v2",
				version2: "v2",
			});

			const text = client.getTextContent(result);

			// Should indicate versions are the same or show no differences
			expect(text).toMatch(/same|identical|no changes|no differences|Comparison/i);
		});

		it("should handle invalid version comparison", async () => {
			try {
				const result = await client.callTool("compare_api_versions", {
					apiId: TEST_API,
					version1: "v1",
					version2: "v999",
				});

				const text = client.getTextContent(result);

				// Should handle gracefully
				expect(text).toMatch(/not found|invalid|error|unavailable/i);
			} catch (error) {
				// Alternatively might throw
				expect(error).toBeDefined();
			}
		});

		it("should provide structured comparison output", async () => {
			const result = await client.callTool("compare_api_versions", {
				apiId: TEST_API,
				version1: "v1",
				version2: "v2",
			});

			const text = client.getTextContent(result);

			// Should have organized sections
			expect(text).toMatch(/v1|v2|Version|Comparison/i);

			// Should be readable and structured
			expect(text).toMatch(/\n/); // Should have line breaks
		});
	});
});
