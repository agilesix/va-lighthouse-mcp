/**
 * API client for fetching VA Lighthouse API metadata and OpenAPI specs
 */

import type { VAApiMetadata, VAApiInfo, VAApiVersionInfo, OpenAPISpec, HealthCheckResponse } from "../types/va-api.js";
import { metadataCache, openApiCache } from "./cache.js";

const BASE_URL = "https://api.va.gov/internal/docs";

export class VAApiClient {
	/**
	 * List all available VA Lighthouse APIs from the S3 bucket index
	 */
	static async listApis(): Promise<VAApiMetadata[]> {
		// Check cache first
		const cached = metadataCache.get("api-list");
		if (cached) {
			console.log("[API Client] Returning cached API list");
			return cached;
		}

		const startTime = Date.now();
		console.log(`[API Client] Fetching API list from: ${BASE_URL}`);

		try {
			const response = await fetch(BASE_URL);
			const fetchTime = Date.now() - startTime;

			// Log response details
			console.log("[API Client] Response received:");
			console.log(`  - Status: ${response.status} ${response.statusText}`);
			console.log(`  - Content-Type: ${response.headers.get("content-type")}`);
			console.log(`  - Content-Length: ${response.headers.get("content-length")}`);
			console.log(`  - Fetch time: ${fetchTime}ms`);

			if (!response.ok) {
				throw new Error(`Failed to fetch API list: ${response.status} ${response.statusText}`);
			}

			// Parse the S3 bucket listing (XML)
			const text = await response.text();
			console.log(`[API Client] Response body length: ${text.length} characters`);
			console.log(`[API Client] Response body preview (first 500 chars):\n${text.substring(0, 500)}`);

			const apis = this.parseS3BucketListing(text);
			console.log(`[API Client] Parsed ${apis.length} APIs from response`);

			// Cache the result
			metadataCache.set("api-list", apis);

			return apis;
		} catch (error) {
			console.error(`[API Client] Error fetching API list:`, error);
			throw new Error(`Error fetching API list: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Get detailed metadata for a specific API
	 */
	static async getApiMetadata(apiId: string): Promise<VAApiInfo> {
		// Check cache first
		const cacheKey = `metadata:${apiId}`;
		const cached = metadataCache.get(cacheKey);
		if (cached) {
			console.log(`[API Client] Returning cached metadata for ${apiId}`);
			return cached;
		}

		console.log(`[API Client] Fetching metadata for: ${apiId}`);

		try {
			const metadataUrl = `${BASE_URL}/${apiId}/metadata.json`;
			const response = await fetch(metadataUrl);

			console.log(`[API Client] Metadata response: ${response.status} ${response.statusText}`);

			if (!response.ok) {
				throw new Error(`Failed to fetch metadata for ${apiId}: ${response.status} ${response.statusText}`);
			}

			const rawMetadata = await response.json() as any;
			console.log(`[API Client] Metadata structure:`, Object.keys(rawMetadata));

			// VA API metadata has a nested "meta" object structure
			const meta = rawMetadata.meta || rawMetadata;

			// Fetch version details with base URLs in parallel
			const versionDetails = await this.fetchVersionDetails(apiId, meta.versions || []);

			// Transform VA metadata format to VAApiInfo format
			const metadata: VAApiInfo = {
				id: apiId,
				name: meta.display_name || this.formatApiName(apiId),
				description: meta.display_description,
				versions: (meta.versions || []).map((v: any) => v.version),
				healthCheck: meta.versions?.[0]?.healthcheck,
				// Path already includes full URL path, just need the base domain
				openApiUrl: meta.versions?.[0]?.path ? `https://api.va.gov${meta.versions[0].path}` : "",
				status: meta.versions?.[0]?.status === "Current Version" ? "active" : undefined,
				authRequired: meta.versions?.[0]?.security?.length > 0,
				category: meta.category,
				documentation: meta.documentation,
				contact: meta.contact,
				versionDetails: versionDetails.length > 0 ? versionDetails : undefined,
			};

			console.log(`[API Client] Transformed metadata for ${apiId}:`, {
				name: metadata.name,
				versions: metadata.versions,
				versionDetailsCount: versionDetails.length,
			});

			// Cache the result
			metadataCache.set(cacheKey, metadata);

			return metadata;
		} catch (error) {
			console.error(`[API Client] Error fetching metadata for ${apiId}:`, error);
			throw new Error(`Error fetching metadata for ${apiId}: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Fetch version details including base URLs for all versions
	 */
	private static async fetchVersionDetails(apiId: string, versions: any[]): Promise<VAApiVersionInfo[]> {
		if (!versions || versions.length === 0) {
			return [];
		}

		console.log(`[API Client] Fetching version details for ${versions.length} version(s) of ${apiId}`);

		// Fetch all version specs in parallel for better performance
		const versionPromises = versions.map(async (versionMeta, index) => {
			try {
				// Only fetch if we have a path to the OpenAPI spec
				if (!versionMeta.path) {
					console.log(`[API Client] No path for version ${versionMeta.version}, skipping spec fetch`);
					return null;
				}

				// Fetch the OpenAPI spec to get the base URL
				const spec = await this.getOpenApiSpec(apiId, versionMeta.version);

				const versionInfo: VAApiVersionInfo = {
					version: versionMeta.version,
					baseUrl: spec.servers?.[0]?.url || "",
					openApiUrl: `https://api.va.gov${versionMeta.path}`,
					healthCheck: versionMeta.healthcheck,
					status: versionMeta.status === "Current Version" ? "current" : "deprecated",
					isCurrent: index === 0, // First version in array is the current one
				};

				console.log(`[API Client] Fetched details for ${apiId} ${versionMeta.version}:`, {
					baseUrl: versionInfo.baseUrl,
					status: versionInfo.status,
				});

				return versionInfo;
			} catch (error) {
				console.warn(`[API Client] Failed to fetch spec for ${apiId} ${versionMeta.version}:`, error instanceof Error ? error.message : String(error));
				// Return partial info even if spec fetch fails
				return {
					version: versionMeta.version,
					baseUrl: "", // Empty if we couldn't fetch the spec
					openApiUrl: versionMeta.path ? `https://api.va.gov${versionMeta.path}` : "",
					healthCheck: versionMeta.healthcheck,
					status: versionMeta.status === "Current Version" ? "current" : "deprecated",
					isCurrent: index === 0,
				} as VAApiVersionInfo;
			}
		});

		// Wait for all versions to be fetched
		const results = await Promise.all(versionPromises);

		// Filter out null results (versions we couldn't fetch)
		return results.filter((v): v is VAApiVersionInfo => v !== null);
	}

	/**
	 * Fetch OpenAPI spec for a specific API version
	 */
	static async getOpenApiSpec(apiId: string, version: string): Promise<OpenAPISpec> {
		// Check cache first
		const cacheKey = `openapi:${apiId}:${version}`;
		const cached = openApiCache.get(cacheKey);
		if (cached) {
			return cached;
		}

		try {
			const specUrl = `${BASE_URL}/${apiId}/${version}/openapi.json`;
			const response = await fetch(specUrl);

			if (!response.ok) {
				throw new Error(`Failed to fetch OpenAPI spec: ${response.status} ${response.statusText}`);
			}

			const spec = await response.json() as OpenAPISpec;

			// Cache the result
			openApiCache.set(cacheKey, spec);

			return spec;
		} catch (error) {
			throw new Error(`Error fetching OpenAPI spec for ${apiId} v${version}: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Check API health endpoint
	 */
	static async checkHealth(healthCheckUrl: string): Promise<HealthCheckResponse> {
		try {
			const response = await fetch(healthCheckUrl);

			if (!response.ok) {
				return {
					status: "DOWN",
					timestamp: new Date().toISOString(),
					details: {
						statusCode: response.status,
						statusText: response.statusText,
					},
				};
			}

			const data = await response.json() as any;

			// Support multiple health check response formats
			// VA APIs may return { status: "UP" } or { success: true }
			const isHealthy =
			data.status === "UP" ||
			data.success === true ||
			data.default?.success === true;

			return {
				status: isHealthy ? "UP" : "UNKNOWN",
				timestamp: new Date().toISOString(),
				details: data as Record<string, any>,
			};
		} catch (error) {
			return {
				status: "DOWN",
				timestamp: new Date().toISOString(),
				details: {
					error: error instanceof Error ? error.message : String(error),
				},
			};
		}
	}

	/**
	 * Parse S3 bucket listing XML to extract API IDs
	 */
	private static parseS3BucketListing(xml: string): VAApiMetadata[] {
		console.log("[S3 Parser] Starting S3 bucket listing parse");
		console.log(`[S3 Parser] Input length: ${xml.length} characters`);

		// Check if response looks like HTML instead of XML
		if (xml.trimStart().startsWith("<!DOCTYPE html") || xml.trimStart().startsWith("<html")) {
			console.warn("[S3 Parser] WARNING: Response appears to be HTML, not XML!");
			console.warn("[S3 Parser] This likely means the S3 bucket listing endpoint is not available");
			return [];
		}

		// Check if response is valid XML
		if (!xml.includes("<?xml") && !xml.includes("<ListBucketResult")) {
			console.warn("[S3 Parser] WARNING: Response does not appear to be S3 XML format");
			console.warn("[S3 Parser] Expected <?xml or <ListBucketResult tags");
		}

		// Extract <Key> entries from S3 XML
		// VA API returns keys like: "api-name/version/openapi.json" or "api-name/metadata.json"
		const keyRegex = /<Key>([^<]+)<\/Key>/g;
		const matches = [...xml.matchAll(keyRegex)];

		console.log(`[S3 Parser] Regex found ${matches.length} <Key> matches`);

		if (matches.length > 0) {
			console.log("[S3 Parser] First 5 key matches:");
			matches.slice(0, 5).forEach((match, i) => {
				console.log(`  ${i + 1}. ${match[1]}`);
			});
		} else {
			console.warn("[S3 Parser] No <Key> tags found in response");
			console.warn("[S3 Parser] Trying fallback patterns...");

			// Try alternative patterns
			const altPatterns = [
				/<Prefix>([^<]+)\/<\/Prefix>/g,
				/<Name>([^<]+)<\/Name>/g,
				/<CommonPrefixes>.*?<Prefix>([^<]+)<\/Prefix>.*?<\/CommonPrefixes>/gs,
			];

			altPatterns.forEach((pattern, i) => {
				const altMatches = [...xml.matchAll(pattern)];
				if (altMatches.length > 0) {
					console.log(`[S3 Parser] Alternative pattern ${i + 1} found ${altMatches.length} matches`);
				}
			});
		}

		const apis: VAApiMetadata[] = [];
		const seenIds = new Set<string>();
		let skippedCount = 0;

		for (const match of matches) {
			const key = match[1]; // e.g., "address-validation/v1/openapi.json"

			// Extract API ID (first segment before the first "/")
			const parts = key.split("/");
			const apiId = parts[0]; // e.g., "address-validation"

			// Only add unique API IDs
			if (apiId && !seenIds.has(apiId)) {
				seenIds.add(apiId);

				apis.push({
					id: apiId,
					name: this.formatApiName(apiId),
					versions: [],
				});
				console.log(`[S3 Parser] Added API: ${apiId} -> ${this.formatApiName(apiId)}`);
			} else if (seenIds.has(apiId)) {
				skippedCount++;
			}
		}

		console.log(`[S3 Parser] Results: ${apis.length} APIs added, ${skippedCount} entries skipped`);

		if (apis.length === 0) {
			console.warn("[S3 Parser] WARNING: Parsing returned 0 APIs!");
			console.warn("[S3 Parser] Possible causes:");
			console.warn("  1. VA API endpoint does not provide S3 bucket listing");
			console.warn("  2. Response format is different than expected");
			console.warn("  3. Endpoint returns HTML error page");
			console.warn("  4. Network/CORS issues preventing proper response");
		}

		return apis;
	}

	/**
	 * Format API ID into a human-readable name
	 */
	private static formatApiName(apiId: string): string {
		return apiId
			.split("-")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
	}
}
