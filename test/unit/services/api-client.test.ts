/**
 * Unit tests for VAApiClient
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { VAApiClient } from "../../../src/services/api-client.js";
import type { VAApiInfo, OpenAPISpec } from "../../../src/types/va-api.js";
import { metadataCache, openApiCache } from "../../../src/services/cache.js";

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
			expect(v2.healthCheck).toBe(
				"https://api.va.gov/services/claims/v2/healthcheck",
			);

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
					return Promise.resolve({
						ok: false,
						status: 404,
						statusText: "Not Found",
					});
				}
				return Promise.reject(new Error("Unexpected URL"));
			});

			const result = await VAApiClient.getApiMetadata("test-api-failed");

			// Should still have version details, but with empty baseUrl
			expect(result.versionDetails).toHaveLength(1);
			expect(result.versionDetails![0].version).toBe("v1");
			expect(result.versionDetails![0].baseUrl).toBe("");
			expect(result.versionDetails![0].healthCheck).toBe(
				"https://api.va.gov/services/failed/v1/healthcheck",
			);
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
						{
							version: "v3",
							path: "/services/multi/v3/openapi.json",
							status: "Current Version",
						},
						{
							version: "v2",
							path: "/services/multi/v2/openapi.json",
							status: "Deprecated",
						},
						{
							version: "v1",
							path: "/services/multi/v1/openapi.json",
							status: "Deprecated",
						},
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

	describe("listApis", () => {
		beforeEach(() => {
			// Clear cache before each test
			metadataCache.clear();
		});

		it("should parse S3 bucket listing and return API list", async () => {
			const mockS3Response = `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult>
    <Name>va-api-docs</Name>
    <Prefix></Prefix>
    <Marker></Marker>
    <MaxKeys>1000</MaxKeys>
    <IsTruncated>false</IsTruncated>
    <Contents>
        <Key>benefits-claims/v1/openapi.json</Key>
        <LastModified>2024-01-15T10:00:00.000Z</LastModified>
        <ETag>"abc123"</ETag>
        <Size>12345</Size>
    </Contents>
    <Contents>
        <Key>benefits-claims/v2/openapi.json</Key>
        <LastModified>2024-01-15T10:00:00.000Z</LastModified>
    </Contents>
    <Contents>
        <Key>benefits-claims/metadata.json</Key>
        <LastModified>2024-01-15T10:00:00.000Z</LastModified>
    </Contents>
    <Contents>
        <Key>address-validation/v1/openapi.json</Key>
        <LastModified>2024-01-15T10:00:00.000Z</LastModified>
    </Contents>
    <Contents>
        <Key>veteran-verification/v1/openapi.json</Key>
        <LastModified>2024-01-15T10:00:00.000Z</LastModified>
    </Contents>
</ListBucketResult>`;

			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				status: 200,
				statusText: "OK",
				text: async () => mockS3Response,
				headers: {
					get: (name: string) => {
						const headers: Record<string, string> = {
							"content-type": "application/xml",
							"content-length": String(mockS3Response.length),
						};
						return headers[name.toLowerCase()] || null;
					},
				},
			});

			const apis = await VAApiClient.listApis();

			expect(apis).toHaveLength(3);
			expect(apis.map((a) => a.id)).toEqual([
				"benefits-claims",
				"address-validation",
				"veteran-verification",
			]);
			expect(apis[0]).toMatchObject({
				id: "benefits-claims",
				name: "Benefits Claims",
				versions: [],
			});
		});

		it("should handle HTML response gracefully", async () => {
			const htmlResponse = `<!DOCTYPE html>
<html>
<head><title>Error</title></head>
<body><h1>Not Found</h1></body>
</html>`;

			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				status: 200,
				text: async () => htmlResponse,
				headers: {
					get: (name: string) => (name === "content-type" ? "text/html" : null),
				},
			});

			const apis = await VAApiClient.listApis();

			expect(apis).toEqual([]);
		});

		it("should handle malformed XML response", async () => {
			const malformedXml = `<InvalidXML>Not a proper S3 listing`;

			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				status: 200,
				text: async () => malformedXml,
				headers: {
					get: () => null,
				},
			});

			const apis = await VAApiClient.listApis();

			expect(apis).toEqual([]);
		});

		it("should deduplicate API IDs from multiple entries", async () => {
			const mockS3Response = `<?xml version="1.0"?>
<ListBucketResult>
    <Contents><Key>test-api/v1/openapi.json</Key></Contents>
    <Contents><Key>test-api/v2/openapi.json</Key></Contents>
    <Contents><Key>test-api/v3/openapi.json</Key></Contents>
    <Contents><Key>test-api/metadata.json</Key></Contents>
</ListBucketResult>`;

			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				status: 200,
				text: async () => mockS3Response,
				headers: {
					get: () => null,
				},
			});

			const apis = await VAApiClient.listApis();

			expect(apis).toHaveLength(1);
			expect(apis[0].id).toBe("test-api");
		});

		it("should throw error on failed fetch", async () => {
			(global.fetch as any).mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				headers: {
					get: () => null,
				},
			});

			await expect(VAApiClient.listApis()).rejects.toThrow(
				"Failed to fetch API list: 500 Internal Server Error",
			);
		});

		it("should throw error on network failure", async () => {
			(global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

			await expect(VAApiClient.listApis()).rejects.toThrow(
				"Error fetching API list: Network error",
			);
		});

		it("should cache API list results", async () => {
			const mockS3Response = `<?xml version="1.0"?>
<ListBucketResult>
    <Contents><Key>test-api/v1/openapi.json</Key></Contents>
</ListBucketResult>`;

			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				status: 200,
				text: async () => mockS3Response,
				headers: {
					get: () => null,
				},
			});

			// First call - should fetch
			await VAApiClient.listApis();
			expect(global.fetch).toHaveBeenCalledTimes(1);

			// Second call - should use cache
			await VAApiClient.listApis();
			expect(global.fetch).toHaveBeenCalledTimes(1); // Still 1, not 2
		});

		it("should format API names correctly", async () => {
			const mockS3Response = `<?xml version="1.0"?>
<ListBucketResult>
    <Contents><Key>benefits-claims/v1/openapi.json</Key></Contents>
    <Contents><Key>address-validation/v1/openapi.json</Key></Contents>
    <Contents><Key>veteran-verification-api/v1/openapi.json</Key></Contents>
</ListBucketResult>`;

			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				status: 200,
				text: async () => mockS3Response,
				headers: {
					get: () => null,
				},
			});

			const apis = await VAApiClient.listApis();

			expect(apis.map((a) => a.name)).toEqual([
				"Benefits Claims",
				"Address Validation",
				"Veteran Verification Api",
			]);
		});
	});

	describe("checkHealth", () => {
		it("should return UP status for healthy endpoint", async () => {
			const mockHealthResponse = { status: "UP" };

			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockHealthResponse,
			});

			const result = await VAApiClient.checkHealth("https://api.va.gov/health");

			expect(result.status).toBe("UP");
			expect(result.timestamp).toBeDefined();
			expect(result.details).toEqual(mockHealthResponse);
		});

		it("should return UP status for success=true response", async () => {
			const mockHealthResponse = { success: true };

			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockHealthResponse,
			});

			const result = await VAApiClient.checkHealth("https://api.va.gov/health");

			expect(result.status).toBe("UP");
			expect(result.details).toEqual(mockHealthResponse);
		});

		it("should return UP status for nested success response", async () => {
			const mockHealthResponse = { default: { success: true } };

			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockHealthResponse,
			});

			const result = await VAApiClient.checkHealth("https://api.va.gov/health");

			expect(result.status).toBe("UP");
		});

		it("should return UNKNOWN status for ambiguous response", async () => {
			const mockHealthResponse = { message: "Service running" };

			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => mockHealthResponse,
			});

			const result = await VAApiClient.checkHealth("https://api.va.gov/health");

			expect(result.status).toBe("UNKNOWN");
			expect(result.details).toEqual(mockHealthResponse);
		});

		it("should return DOWN status for failed HTTP response", async () => {
			(global.fetch as any).mockResolvedValueOnce({
				ok: false,
				status: 503,
				statusText: "Service Unavailable",
			});

			const result = await VAApiClient.checkHealth("https://api.va.gov/health");

			expect(result.status).toBe("DOWN");
			expect(result.details).toMatchObject({
				statusCode: 503,
				statusText: "Service Unavailable",
			});
		});

		it("should return DOWN status for network error", async () => {
			(global.fetch as any).mockRejectedValueOnce(
				new Error("Connection timeout"),
			);

			const result = await VAApiClient.checkHealth("https://api.va.gov/health");

			expect(result.status).toBe("DOWN");
			expect(result.details).toMatchObject({
				error: "Connection timeout",
			});
		});

		it("should include timestamp in all responses", async () => {
			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({ status: "UP" }),
			});

			const result = await VAApiClient.checkHealth("https://api.va.gov/health");

			expect(result.timestamp).toBeDefined();
			expect(new Date(result.timestamp).getTime()).toBeGreaterThan(
				Date.now() - 1000,
			);
		});
	});

	describe("getOpenApiSpec", () => {
		beforeEach(() => {
			openApiCache.clear();
		});

		it("should fetch and return OpenAPI spec", async () => {
			const mockSpec: OpenAPISpec = {
				openapi: "3.0.0",
				info: { title: "Test API", version: "1.0" },
				servers: [{ url: "https://api.va.gov" }],
				paths: {},
			};

			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => mockSpec,
			});

			const result = await VAApiClient.getOpenApiSpec("test-api", "v1");

			expect(result).toEqual(mockSpec);
			expect(global.fetch).toHaveBeenCalledWith(
				"https://api.va.gov/internal/docs/test-api/v1/openapi.json",
			);
		});

		it("should cache OpenAPI spec results", async () => {
			const mockSpec: OpenAPISpec = {
				openapi: "3.0.0",
				info: { title: "Test", version: "1.0" },
				paths: {},
			};

			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => mockSpec,
			});

			// First call - should fetch
			await VAApiClient.getOpenApiSpec("test-api", "v1");
			expect(global.fetch).toHaveBeenCalledTimes(1);

			// Second call - should use cache
			const cachedResult = await VAApiClient.getOpenApiSpec("test-api", "v1");
			expect(global.fetch).toHaveBeenCalledTimes(1); // Still 1, not 2
			expect(cachedResult).toEqual(mockSpec);
		});

		it("should throw error on failed fetch", async () => {
			(global.fetch as any).mockResolvedValueOnce({
				ok: false,
				status: 404,
				statusText: "Not Found",
			});

			await expect(
				VAApiClient.getOpenApiSpec("nonexistent", "v1"),
			).rejects.toThrow("Failed to fetch OpenAPI spec: 404 Not Found");
		});

		it("should throw error on network failure", async () => {
			(global.fetch as any).mockRejectedValueOnce(new Error("Timeout"));

			await expect(
				VAApiClient.getOpenApiSpec("test-api", "v1"),
			).rejects.toThrow(
				"Error fetching OpenAPI spec for test-api vv1: Timeout",
			);
		});

		it("should handle different API IDs and versions", async () => {
			const mockSpec: OpenAPISpec = {
				openapi: "3.0.0",
				info: { title: "Benefits", version: "2.0" },
				paths: {},
			};

			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => mockSpec,
			});

			await VAApiClient.getOpenApiSpec("benefits-claims", "v2");

			expect(global.fetch).toHaveBeenCalledWith(
				"https://api.va.gov/internal/docs/benefits-claims/v2/openapi.json",
			);
		});
	});
});
