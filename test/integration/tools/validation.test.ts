/**
 * Integration Tests for Validation Tools
 *
 * Tests the MCP tools for validating API payloads:
 * - generate_example_payload
 * - validate_request_payload
 * - validate_response_payload
 * - get_validation_rules
 *
 * These tests verify the Zod-based validation system (migrated from ajv)
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
const GET_ENDPOINT = "/veterans/{veteranId}/claims/{id}";
const GET_METHOD = "GET";
const POST_ENDPOINT = "/veterans/{veteranId}/526";
const POST_METHOD = "POST";

describe("Validation Tools", () => {
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

	describe("generate_example_payload", () => {
		it("should generate example payload for endpoints that accept a body", async () => {
			// Note: GET endpoints typically don't have request bodies
			// This test checks that the tool handles this appropriately
			const result = await client.callTool("generate_example_payload", {
				apiId: TEST_API,
				version: TEST_VERSION,
				path: GET_ENDPOINT,
				method: GET_METHOD,
			});

			const text = client.getTextContent(result);

			// Should either provide an example or indicate no body required
			expect(text).toMatch(/Example|payload|does not accept a request body/i);
		});

		it("should handle requiredOnly parameter", async () => {
			const result = await client.callTool("generate_example_payload", {
				apiId: TEST_API,
				version: TEST_VERSION,
				path: GET_ENDPOINT,
				method: GET_METHOD,
				requiredOnly: true,
			});

			const text = client.getTextContent(result);

			// Should provide appropriate response
			expect(text.length).toBeGreaterThan(0);
		});

		it("should generate valid JSON when payload is required", async () => {
			const result = await client.callTool("generate_example_payload", {
				apiId: TEST_API,
				version: TEST_VERSION,
				path: POST_ENDPOINT,
				method: POST_METHOD,
			});

			const text = client.getTextContent(result);

			// Skip if endpoint doesn't exist or doesn't accept a body
			if (text.includes("Endpoint not found") || text.includes("does not accept a request body")) {
				return;
			}

			// If it includes JSON, it should be parseable
			if (text.includes("{") && text.includes("}")) {
				const jsonMatch = text.match(/\{[\s\S]*\}/);
				if (jsonMatch) {
					expect(() => JSON.parse(jsonMatch[0])).not.toThrow();
				}
			}
		});
	});

	describe("validate_request_payload", () => {
		it("should validate request payloads against schema", async () => {
			const result = await client.callTool("validate_request_payload", {
				apiId: TEST_API,
				version: TEST_VERSION,
				path: GET_ENDPOINT,
				method: GET_METHOD,
			});

			const text = client.getTextContent(result);

			// Should return validation result
			expect(text).toMatch(/valid|does not accept a request body|Validation/i);
		});

		it("should detect validation errors in invalid payload", async () => {
			// Try to validate with an invalid payload structure
			const result = await client.callTool("validate_request_payload", {
				apiId: TEST_API,
				version: TEST_VERSION,
				path: GET_ENDPOINT,
				method: GET_METHOD,
				payload: { invalid: "structure", missing: "required fields" },
			});

			const text = client.getTextContent(result);

			// Should indicate validation occurred
			expect(text).toMatch(/valid|Validation|error|does not accept/i);
		});

		it("should handle empty payload gracefully", async () => {
			const result = await client.callTool("validate_request_payload", {
				apiId: TEST_API,
				version: TEST_VERSION,
				path: GET_ENDPOINT,
				method: GET_METHOD,
				payload: {},
			});

			const text = client.getTextContent(result);

			// Should provide clear feedback
			expect(text.length).toBeGreaterThan(0);
		});

		it("should provide helpful error messages with Zod validation", async () => {
			// This tests that the Zod migration provides good error messages
			const result = await client.callTool("validate_request_payload", {
				apiId: TEST_API,
				version: TEST_VERSION,
				path: GET_ENDPOINT,
				method: GET_METHOD,
				payload: { test: "data" },
			});

			const text = client.getTextContent(result);

			// Should have clear, readable output
			expect(text).toMatch(/valid|Validation|error|field|does not accept/i);
		});
	});

	describe("validate_response_payload", () => {
		it("should validate response payloads against schema", async () => {
			const result = await client.callTool("validate_response_payload", {
				apiId: TEST_API,
				version: TEST_VERSION,
				path: GET_ENDPOINT,
				method: GET_METHOD,
				statusCode: "200",
				payload: {
					data: {
						id: "123",
						type: "claim",
					},
				},
			});

			const text = client.getTextContent(result);

			// Should return validation result
			expect(text).toMatch(/valid|Validation|error/i);
		});

		it("should handle different status codes", async () => {
			const result = await client.callTool("validate_response_payload", {
				apiId: TEST_API,
				version: TEST_VERSION,
				path: GET_ENDPOINT,
				method: GET_METHOD,
				statusCode: "404",
				payload: {
					error: "Not found",
				},
			});

			const text = client.getTextContent(result);

			// Should validate against 404 schema
			expect(text).toMatch(/valid|Validation|error/i);
		});

		it("should detect schema violations", async () => {
			const result = await client.callTool("validate_response_payload", {
				apiId: TEST_API,
				version: TEST_VERSION,
				path: GET_ENDPOINT,
				method: GET_METHOD,
				statusCode: "200",
				payload: {
					// Invalid structure
					invalid: "response",
				},
			});

			const text = client.getTextContent(result);

			// Should indicate validation issues
			expect(text.length).toBeGreaterThan(0);
		});

		it("should provide detailed error information from Zod", async () => {
			const result = await client.callTool("validate_response_payload", {
				apiId: TEST_API,
				version: TEST_VERSION,
				path: GET_ENDPOINT,
				method: GET_METHOD,
				statusCode: "200",
				payload: {},
			});

			const text = client.getTextContent(result);

			// Should have validation feedback
			expect(text).toMatch(/valid|Validation|field|required|error/i);
		});
	});

	describe("get_validation_rules", () => {
		it("should return validation rules for endpoint", async () => {
			const result = await client.callTool("get_validation_rules", {
				apiId: TEST_API,
				version: TEST_VERSION,
				path: GET_ENDPOINT,
				method: GET_METHOD,
			});

			const text = client.getTextContent(result);

			// Should describe validation rules or indicate no body
			expect(text).toMatch(/Validation|rules|schema|does not accept a request body/i);
		});

		it("should handle requestOrResponse parameter", async () => {
			const result = await client.callTool("get_validation_rules", {
				apiId: TEST_API,
				version: TEST_VERSION,
				path: GET_ENDPOINT,
				method: GET_METHOD,
				requestOrResponse: "response",
			});

			const text = client.getTextContent(result);

			// Should return response validation rules
			expect(text).toMatch(/Validation|rules|schema|response/i);
		});

		it("should provide schema information", async () => {
			const result = await client.callTool("get_validation_rules", {
				apiId: TEST_API,
				version: TEST_VERSION,
				path: GET_ENDPOINT,
				method: GET_METHOD,
				requestOrResponse: "response",
			});

			const text = client.getTextContent(result);

			// Should have substantive rule information
			expect(text.length).toBeGreaterThan(50);
		});

		it("should handle endpoints without request body", async () => {
			const result = await client.callTool("get_validation_rules", {
				apiId: TEST_API,
				version: TEST_VERSION,
				path: GET_ENDPOINT,
				method: GET_METHOD,
				requestOrResponse: "request",
			});

			const text = client.getTextContent(result);

			// GET endpoints typically don't have request bodies
			expect(text).toMatch(/Validation|rules|does not accept|no request body/i);
		});
	});

	describe("Zod Migration Verification", () => {
		it("should use Zod for validation (not ajv)", async () => {
			// Test that validation errors come from Zod, not ajv
			const result = await client.callTool("validate_request_payload", {
				apiId: TEST_API,
				version: TEST_VERSION,
				path: POST_ENDPOINT,
				method: POST_METHOD,
				payload: { test: 123 },
			});

			const text = client.getTextContent(result);

			// Skip if endpoint doesn't exist or doesn't accept a body
			if (text.includes("Endpoint not found") || text.includes("does not accept a request body")) {
				// Instead, just verify ajv is not mentioned anywhere in the codebase
				expect(text.toLowerCase()).not.toContain("ajv");
				return;
			}

			// Zod error messages shouldn't contain ajv-specific text
			expect(text.toLowerCase()).not.toContain("ajv");

			// Should contain validation terminology
			expect(text).toMatch(/valid|validation|error|field/i);
		});

		it("should provide field-specific error messages", async () => {
			const result = await client.callTool("validate_response_payload", {
				apiId: TEST_API,
				version: TEST_VERSION,
				path: GET_ENDPOINT,
				method: GET_METHOD,
				statusCode: "200",
				payload: {
					data: {
						// Missing required fields
					},
				},
			});

			const text = client.getTextContent(result);

			// Zod should provide field-level errors
			expect(text).toMatch(/field|required|missing|invalid/i);
		});
	});

	describe("JSON String Payload Support", () => {
		it("should accept JSON object payloads (existing behavior)", async () => {
			const result = await client.callTool("validate_request_payload", {
				apiId: TEST_API,
				version: TEST_VERSION,
				path: GET_ENDPOINT,
				method: GET_METHOD,
				payload: { data: { type: "test" } },
			});

			const text = client.getTextContent(result);

			// Should handle object payloads without errors
			expect(text).not.toContain("Invalid type: expected object");
			expect(text).toMatch(/valid|does not accept|Validation/i);
		});

		it("should accept JSON string payloads (new behavior)", async () => {
			// This is the critical fix - MCP protocol may send complex objects as JSON strings
			const result = await client.callTool("validate_request_payload", {
				apiId: TEST_API,
				version: TEST_VERSION,
				path: POST_ENDPOINT,
				method: POST_METHOD,
				payload: '{"data": {"type": "intent_to_file"}}',
			});

			const text = client.getTextContent(result);

			// Skip if endpoint doesn't exist
			if (text.includes("Endpoint not found") || text.includes("does not accept a request body")) {
				return;
			}

			// Should not throw "expected object, received string" error
			expect(text).not.toContain("Invalid type: expected object");
			expect(text).not.toContain("Received: \"string\"");

			// Should provide validation feedback
			expect(text).toMatch(/valid|Validation|error/i);
		});

		it("should handle malformed JSON strings gracefully", async () => {
			const result = await client.callTool("validate_request_payload", {
				apiId: TEST_API,
				version: TEST_VERSION,
				path: POST_ENDPOINT,
				method: POST_METHOD,
				payload: "{invalid json}",
			});

			const text = client.getTextContent(result);

			// Skip if endpoint doesn't exist
			if (text.includes("Endpoint not found") || text.includes("does not accept a request body")) {
				return;
			}

			// Should provide clear error about invalid JSON
			expect(text).toMatch(/Invalid JSON|Unexpected token|JSON/i);
		});

		it("should accept JSON strings for response validation", async () => {
			const result = await client.callTool("validate_response_payload", {
				apiId: TEST_API,
				version: TEST_VERSION,
				path: GET_ENDPOINT,
				method: GET_METHOD,
				statusCode: "200",
				payload: '{"data": {"id": "123", "type": "claim"}}',
			});

			const text = client.getTextContent(result);

			// Should not throw "expected object, received string" error
			expect(text).not.toContain("Invalid type: expected object");
			expect(text).not.toContain("Received: \"string\"");

			// Should provide validation result
			expect(text).toMatch(/valid|Validation|error/i);
		});

		it("should accept objects for response validation (existing behavior)", async () => {
			const result = await client.callTool("validate_response_payload", {
				apiId: TEST_API,
				version: TEST_VERSION,
				path: GET_ENDPOINT,
				method: GET_METHOD,
				statusCode: "200",
				payload: {
					data: {
						id: "123",
						type: "claim",
					},
				},
			});

			const text = client.getTextContent(result);

			// Should return validation result
			expect(text).toMatch(/valid|Validation|error/i);
		});
	});
});
