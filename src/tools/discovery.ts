/**
 * Discovery tools for listing and getting VA Lighthouse API information
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { VAApiClient } from "../services/api-client.js";
import type { VAApiMetadata } from "../types/va-api.js";

/**
 * Category mapping for VA Lighthouse APIs
 */
const API_CATEGORIES: Record<
	string,
	{ category: string; description: string }
> = {
	// Benefits APIs
	"benefits-claims": {
		category: "benefits",
		description: "Submit and track benefits claims",
	},
	"benefits-intake": {
		category: "benefits",
		description: "Upload benefits-related documents",
	},
	"decision-reviews": {
		category: "benefits",
		description: "Request decision reviews and appeals",
	},
	appeals: { category: "benefits", description: "Track and manage appeals" },
	"loan-guaranty": {
		category: "benefits",
		description: "Home loan benefit information",
	},
	"notice-of-disagreement": {
		category: "benefits",
		description: "File notice of disagreement",
	},
	"supplemental-claims": {
		category: "benefits",
		description: "Submit supplemental claims",
	},
	"higher-level-reviews": {
		category: "benefits",
		description: "Request higher-level reviews",
	},

	// Health APIs
	health: {
		category: "health",
		description: "Access patient health records (FHIR)",
	},
	fhir: { category: "health", description: "VA Health FHIR API" },
	"community-care": {
		category: "health",
		description: "Community care eligibility",
	},
	prescriptions: {
		category: "health",
		description: "Prescription tracking and refills",
	},
	appointments: {
		category: "health",
		description: "Schedule and manage VA appointments",
	},
	immunizations: { category: "health", description: "Immunization records" },

	// Facilities APIs
	facilities: {
		category: "facilities",
		description: "Find VA facilities and services",
	},
	"va-facilities": {
		category: "facilities",
		description: "VA facilities locator",
	},

	// Verification APIs
	"veteran-verification": {
		category: "verification",
		description: "Verify veteran status",
	},
	"veteran-confirmation": {
		category: "verification",
		description: "Confirm veteran status",
	},
	"disability-rating": {
		category: "verification",
		description: "Access disability rating information",
	},
	"service-history": {
		category: "verification",
		description: "Military service history verification",
	},
	"veteran-status": {
		category: "verification",
		description: "Veteran status confirmation",
	},

	// Other APIs
	"address-validation": {
		category: "other",
		description: "Validate postal addresses",
	},
	forms: { category: "other", description: "VA forms library and submission" },
	representative: {
		category: "other",
		description: "Accredited representative information",
	},
	"direct-deposit": {
		category: "other",
		description: "Manage direct deposit information",
	},
	letters: { category: "other", description: "Generate VA benefit letters" },
};

export function registerDiscoveryTools(server: McpServer) {
	/**
	 * List all available VA Lighthouse APIs
	 */
	server.tool(
		"list_lighthouse_apis",
		"Lists all available VA Lighthouse APIs with their metadata, optionally filtered by category",
		{
			includeDeprecated: z
				.boolean()
				.optional()
				.describe("Include deprecated APIs in the results"),
			category: z
				.enum([
					"benefits",
					"health",
					"facilities",
					"verification",
					"other",
					"all",
				])
				.optional()
				.describe(
					"Filter APIs by category (benefits, health, facilities, verification, other, all). Default: all",
				),
		},
		async ({ includeDeprecated, category }) => {
			try {
				const apis = await VAApiClient.listApis();

				// Enrich APIs with category and description from mapping
				const enrichedApis = apis.map((api) => {
					const categoryInfo = API_CATEGORIES[api.id];
					return {
						...api,
						category: categoryInfo?.category || "other",
						description: api.description || categoryInfo?.description || "",
					};
				});

				// Filter deprecated if requested
				let filtered = includeDeprecated
					? enrichedApis
					: enrichedApis.filter((api) => api.status !== "deprecated");

				// Filter by category if specified
				if (category && category !== "all") {
					filtered = filtered.filter((api) => api.category === category);
				}

				// Group APIs by category
				const grouped = filtered.reduce(
					(acc, api) => {
						const cat = api.category || "other";
						if (!acc[cat]) {
							acc[cat] = [];
						}
						acc[cat].push(api);
						return acc;
					},
					{} as Record<string, VAApiMetadata[]>,
				);

				// Format output
				const output = [
					`Found ${filtered.length} VA Lighthouse API${filtered.length === 1 ? "" : "s"}`,
				];

				if (category && category !== "all") {
					output[0] += ` in category: ${category}`;
				}

				output.push("\n");

				// Category display names and order
				const categoryNames: Record<string, string> = {
					benefits: "Benefits",
					health: "Health",
					facilities: "Facilities",
					verification: "Verification",
					other: "Other",
				};

				const categoryOrder = [
					"benefits",
					"health",
					"facilities",
					"verification",
					"other",
				];

				// Output APIs grouped by category
				for (const cat of categoryOrder) {
					const apisInCategory = grouped[cat];
					if (!apisInCategory || apisInCategory.length === 0) continue;

					output.push(`## ${categoryNames[cat]} (${apisInCategory.length})\n`);

					for (const api of apisInCategory) {
						output.push(`• ${api.name} (${api.id})`);

						if (api.description) {
							output.push(`  ${api.description}`);
						}

						if (api.status && api.status !== "active") {
							output.push(`  Status: ${api.status}`);
						}

						output.push("");
					}
				}

				return {
					content: [{ type: "text", text: output.join("\n") }],
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: `Error listing APIs: ${error instanceof Error ? error.message : String(error)}`,
						},
					],
					isError: true,
				};
			}
		},
	);

	/**
	 * Get detailed information about a specific API
	 */
	server.tool(
		"get_api_info",
		"Gets detailed information about a specific VA Lighthouse API",
		{
			apiId: z
				.string()
				.describe("The API ID (e.g., 'benefits-claims', 'facilities')"),
		},
		async ({ apiId }) => {
			try {
				const apiInfo = await VAApiClient.getApiMetadata(apiId);

				// Format output
				const output = [`API: ${apiInfo.name}`, `ID: ${apiInfo.id}`, ""];

				if (apiInfo.description) {
					output.push(`Description: ${apiInfo.description}`, "");
				}

				if (apiInfo.status) {
					output.push(`Status: ${apiInfo.status}`);
				}

				if (apiInfo.authRequired !== undefined) {
					output.push(
						`Authentication Required: ${apiInfo.authRequired ? "Yes" : "No"}`,
					);
				}

				if (apiInfo.category) {
					output.push(`Category: ${apiInfo.category}`);
				}

				output.push("");

				// Display version details if available
				if (apiInfo.versionDetails && apiInfo.versionDetails.length > 0) {
					output.push(
						`Available Versions (${apiInfo.versionDetails.length}):\n`,
					);

					for (const version of apiInfo.versionDetails) {
						// Add marker for current version
						const marker = version.isCurrent ? " (latest)" : "";
						output.push(`  ${version.version}${marker}`);

						if (version.baseUrl) {
							output.push(`    Base URL: ${version.baseUrl}`);
						}

						output.push(`    OpenAPI Spec: ${version.openApiUrl}`);

						if (version.healthCheck) {
							output.push(`    Health Check: ${version.healthCheck}`);
						}

						if (version.status === "deprecated") {
							output.push(`    Status: deprecated`);
						}

						output.push(""); // Blank line between versions
					}
				} else {
					// Fallback to simple version list if versionDetails not available
					if (apiInfo.versions && apiInfo.versions.length > 0) {
						output.push(`Available Versions (${apiInfo.versions.length}):`);
						for (const version of apiInfo.versions) {
							output.push(`  • ${version}`);
						}
						output.push("");
					}

					if (apiInfo.openApiUrl) {
						output.push(`OpenAPI Spec: ${apiInfo.openApiUrl}`);
					}

					if (apiInfo.healthCheck) {
						output.push(`Health Check: ${apiInfo.healthCheck}`);
					}
				}

				if (apiInfo.documentation) {
					output.push(`Documentation: ${apiInfo.documentation}`);
				}

				if (apiInfo.contact) {
					output.push("", "Contact:");

					if (apiInfo.contact.name) {
						output.push(`  Name: ${apiInfo.contact.name}`);
					}

					if (apiInfo.contact.email) {
						output.push(`  Email: ${apiInfo.contact.email}`);
					}

					if (apiInfo.contact.url) {
						output.push(`  URL: ${apiInfo.contact.url}`);
					}
				}

				return {
					content: [{ type: "text", text: output.join("\n") }],
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: `Error getting API info: ${error instanceof Error ? error.message : String(error)}`,
						},
					],
					isError: true,
				};
			}
		},
	);
}
