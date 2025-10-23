/**
 * Unit tests for VAApiClient version details functionality
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { VAApiClient } from "../../../src/services/api-client.js";
import type { VAApiInfo, OpenAPISpec } from "../../../src/types/va-api.js";

// Mock fetch globally
global.fetch = vi.fn();

describe("VAApiClient - Version Details", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Clear caches before each test
		// Note: We can't access private cache directly, so we test with fresh mocks
	});

	describe("getApiMetadata with version details", () => {
		it("should fetch version details with base URLs for multiple versions", async () => {
			// Mock metadata response
			const mockMetadata = {
				meta: {
					display_name: "Benefits Claims API",
					display_description: "Submit and track claims",
					versions: [
						{
							version: "v2",
							path: "/services/claims/v2/openapi.json",
							healthcheck: "https://api.va.gov/services/claims/v2/healthcheck",
							status: "Current Version",
							security: [{ apikey: [] }],
						},
						{
							version: "v1",
							path: "/services/claims/v1/openapi.json",
							healthcheck: "https://api.va.gov/services/claims/v1/healthcheck",
							status: "Deprecated",
							security: [{ apikey: [] }],
						},
					],
				},
			};

			// Mock OpenAPI specs for each version
			const mockV2Spec: OpenAPISpec = {
				openapi: "3.0.0",
				info: { title: "Test API", version: "v2" },
				servers: [{ url: "https://sandbox-api.va.gov/services/claims/v2" }],
				paths: {},
			};

			const mockV1Spec: OpenAPISpec = {
				openapi: "3.0.0",
				info: { title: "Test API", version: "v1" },
				servers: [{ url: "https://sandbox-api.va.gov/services/claims/v1" }],
				paths: {},
			};

			// Setup fetch mocks
			(global.fetch as any).mockImplementation((url: string) => {
				if (url.includes("metadata.json")) {
					return Promise.resolve({
						ok: true,
						json: async () => mockMetadata,
					});
				}
				if (url.includes("/v2/openapi.json")) {
					return Promise.resolve({
						ok: true,
						json: async () => mockV2Spec,
					});
				}
				if (url.includes("/v1/openapi.json")) {
					return Promise.resolve({
						ok: true,
						json: async () => mockV1Spec,
					});
				}
				return Promise.reject(new Error("Unexpected URL"));
			});

			const result = await VAApiClient.getApiMetadata("benefits-claims");

			// Should have version details
			expect(result.versionDetails).toBeDefined();
			expect(result.versionDetails).toHaveLength(2);

			// Check v2 (current)
			const v2 = result.versionDetails![0];
			expect(v2.version).toBe("v2");
			expect(v2.baseUrl).toBe("https://sandbox-api.va.gov/services/claims/v2");
			expect(v2.isCurrent).toBe(true);
			expect(v2.status).toBe("current");
			expect(v2.healthCheck).toBe("https://api.va.gov/services/claims/v2/healthcheck");

			// Check v1 (deprecated)
			const v1 = result.versionDetails![1];
			expect(v1.version).toBe("v1");
			expect(v1.baseUrl).toBe("https://sandbox-api.va.gov/services/claims/v1");
			expect(v1.isCurrent).toBe(false);
			expect(v1.status).toBe("deprecated");
		});

		it("should handle single version API", async () => {
			const mockMetadata = {
				meta: {
					display_name: "Test API",
					versions: [
						{
							version: "v1",
							path: "/services/test/v1/openapi.json",
							status: "Current Version",
						},
					],
				},
			};

			const mockSpec: OpenAPISpec = {
				openapi: "3.0.0",
				info: { title: "Test API", version: "v1" },
				servers: [{ url: "https://sandbox-api.va.gov/services/test/v1" }],
				paths: {},
			};

			(global.fetch as any).mockImplementation((url: string) => {
				if (url.includes("metadata.json")) {
					return Promise.resolve({ ok: true, json: async () => mockMetadata });
				}
				if (url.includes("openapi.json")) {
					return Promise.resolve({ ok: true, json: async () => mockSpec });
				}
				return Promise.reject(new Error("Unexpected URL"));
			});

			const result = await VAApiClient.getApiMetadata("test-api");

			expect(result.versionDetails).toHaveLength(1);
			expect(result.versionDetails![0].version).toBe("v1");
			expect(result.versionDetails![0].isCurrent).toBe(true);
		});

		it("should handle missing base URL in OpenAPI spec", async () => {
			const mockMetadata = {
				meta: {
					display_name: "Test API No Servers",
					versions: [
						{
							version: "v1",
							path: "/services/noservers/v1/openapi.json",
							status: "Current Version",
						},
					],
				},
			};

			// Spec without servers array
			const mockSpec: any = {
				openapi: "3.0.0",
				info: { title: "Test API", version: "v1" },
				paths: {},
			};

			(global.fetch as any).mockImplementation((url: string) => {
				if (url.includes("metadata.json")) {
					return Promise.resolve({ ok: true, json: async () => mockMetadata });
				}
				if (url.includes("openapi.json")) {
					return Promise.resolve({ ok: true, json: async () => mockSpec });
				}
				return Promise.reject(new Error("Unexpected URL"));
			});

			const result = await VAApiClient.getApiMetadata("test-api-no-servers");

			expect(result.versionDetails).toHaveLength(1);
			expect(result.versionDetails![0].baseUrl).toBe(""); // Empty string when not available
		});

		it("should handle failed OpenAPI spec fetch gracefully", async () => {
			const mockMetadata = {
				meta: {
					display_name: "Test API Failed",
					versions: [
						{
							version: "v1",
							path: "/services/failed/v1/openapi.json",
							healthcheck: "https://api.va.gov/services/failed/v1/healthcheck",
							status: "Current Version",
						},
					],
				},
			};

			(global.fetch as any).mockImplementation((url: string) => {
				if (url.includes("metadata.json")) {
					return Promise.resolve({ ok: true, json: async () => mockMetadata });
				}
				if (url.includes("openapi.json")) {
					// Simulate fetch failure
					return Promise.resolve({ ok: false, status: 404, statusText: "Not Found" });
				}
				return Promise.reject(new Error("Unexpected URL"));
			});

			const result = await VAApiClient.getApiMetadata("test-api-failed");

			// Should still have version details, but with empty baseUrl
			expect(result.versionDetails).toHaveLength(1);
			expect(result.versionDetails![0].version).toBe("v1");
			expect(result.versionDetails![0].baseUrl).toBe("");
			expect(result.versionDetails![0].healthCheck).toBe("https://api.va.gov/services/failed/v1/healthcheck");
		});

		it("should handle versions without path", async () => {
			const mockMetadata = {
				meta: {
					display_name: "Test API No Path",
					versions: [
						{
							version: "v1",
							// No path field
							status: "Current Version",
						},
					],
				},
			};

			(global.fetch as any).mockImplementation((url: string) => {
				if (url.includes("metadata.json")) {
					return Promise.resolve({ ok: true, json: async () => mockMetadata });
				}
				return Promise.reject(new Error("Unexpected URL"));
			});

			const result = await VAApiClient.getApiMetadata("test-api-no-path");

			// Should have empty versionDetails array (filtered out null results)
			expect(result.versionDetails).toBeUndefined();
		});

		it("should handle empty versions array", async () => {
			const mockMetadata = {
				meta: {
					display_name: "Test API Empty",
					versions: [],
				},
			};

			(global.fetch as any).mockImplementation((url: string) => {
				if (url.includes("metadata.json")) {
					return Promise.resolve({ ok: true, json: async () => mockMetadata });
				}
				return Promise.reject(new Error("Unexpected URL"));
			});

			const result = await VAApiClient.getApiMetadata("test-api-empty");

			expect(result.versionDetails).toBeUndefined();
			expect(result.versions).toEqual([]);
		});

		it("should mark only first version as current", async () => {
			const mockMetadata = {
				meta: {
					display_name: "Test API Multi",
					versions: [
						{ version: "v3", path: "/services/multi/v3/openapi.json", status: "Current Version" },
						{ version: "v2", path: "/services/multi/v2/openapi.json", status: "Deprecated" },
						{ version: "v1", path: "/services/multi/v1/openapi.json", status: "Deprecated" },
					],
				},
			};

			const mockSpec: OpenAPISpec = {
				openapi: "3.0.0",
				info: { title: "Test", version: "1.0" },
				servers: [{ url: "https://test.example.com" }],
				paths: {},
			};

			(global.fetch as any).mockImplementation((url: string) => {
				if (url.includes("metadata.json")) {
					return Promise.resolve({ ok: true, json: async () => mockMetadata });
				}
				if (url.includes("openapi.json")) {
					return Promise.resolve({ ok: true, json: async () => mockSpec });
				}
				return Promise.reject(new Error("Unexpected URL"));
			});

			const result = await VAApiClient.getApiMetadata("test-api-multi");

			expect(result.versionDetails).toHaveLength(3);
			expect(result.versionDetails![0].isCurrent).toBe(true);
			expect(result.versionDetails![1].isCurrent).toBe(false);
			expect(result.versionDetails![2].isCurrent).toBe(false);
		});
	});
});
