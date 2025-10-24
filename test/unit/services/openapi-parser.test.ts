/**
 * Unit tests for OpenAPIParser
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { OpenAPIParser } from "../../../src/services/openapi-parser.js";
import type { OpenAPISpec } from "../../../src/types/va-api.js";

// Mock @scalar/openapi-parser to avoid Workers pool compatibility issues
vi.mock("@scalar/openapi-parser", () => ({
	dereference: vi.fn(async (spec: any) => ({
		schema: spec,
		errors: [],
	})),
}));

describe("OpenAPIParser", () => {
	describe("getSummary", () => {
		it("should return API summary with basic info", async () => {
			const spec: OpenAPISpec = {
				openapi: "3.0.0",
				info: {
					title: "Test API",
					description: "A test API for unit tests",
					version: "1.0.0",
				},
				servers: [{ url: "https://api.example.com/v1" }],
				paths: {
					"/users": {
						get: {
							summary: "Get users",
							operationId: "getUsers",
						},
					},
					"/users/{id}": {
						get: {
							summary: "Get user by ID",
							operationId: "getUserById",
						},
					},
				},
			};

			const parser = new OpenAPIParser(spec);
			const summary = await parser.getSummary();

			expect(summary.title).toBe("Test API");
			expect(summary.description).toBe("A test API for unit tests");
			expect(summary.version).toBe("1.0.0");
			expect(summary.baseUrl).toBe("https://api.example.com/v1");
			expect(summary.totalEndpoints).toBe(2);
		});

		it("should count endpoints by tag", async () => {
			const spec: OpenAPISpec = {
				openapi: "3.0.0",
				info: { title: "Test", version: "1.0" },
				tags: [
					{ name: "users", description: "User operations" },
					{ name: "posts", description: "Post operations" },
				],
				paths: {
					"/users": {
						get: { tags: ["users"], summary: "Get users" },
						post: { tags: ["users"], summary: "Create user" },
					},
					"/posts": {
						get: { tags: ["posts"], summary: "Get posts" },
					},
				},
			};

			const parser = new OpenAPIParser(spec);
			const summary = await parser.getSummary();

			expect(summary.tags).toHaveLength(2);
			expect(summary.tags?.[0]).toMatchObject({
				name: "users",
				description: "User operations",
				endpointCount: 2,
			});
			expect(summary.tags?.[1]).toMatchObject({
				name: "posts",
				description: "Post operations",
				endpointCount: 1,
			});
		});

		it("should handle untagged endpoints", async () => {
			const spec: OpenAPISpec = {
				openapi: "3.0.0",
				info: { title: "Test", version: "1.0" },
				paths: {
					"/users": {
						get: { summary: "Get users" }, // No tags
					},
					"/posts": {
						get: { tags: ["posts"], summary: "Get posts" },
					},
				},
			};

			const parser = new OpenAPIParser(spec);
			const summary = await parser.getSummary();

			const untaggedTag = summary.tags?.find((t) => t.name === "untagged");
			expect(untaggedTag).toBeDefined();
			expect(untaggedTag?.endpointCount).toBe(1);
		});

		it("should extract auth methods from security", async () => {
			const spec: OpenAPISpec = {
				openapi: "3.0.0",
				info: { title: "Test", version: "1.0" },
				security: [{ apiKey: [] }, { oauth2: [] }],
				paths: {},
			};

			const parser = new OpenAPIParser(spec);
			const summary = await parser.getSummary();

			expect(summary.authMethods).toEqual(["apiKey", "oauth2"]);
		});

		it("should handle missing optional fields", async () => {
			const spec: any = {
				openapi: "3.0.0",
				info: { title: "Minimal", version: "1.0" },
				paths: {},
			};

			const parser = new OpenAPIParser(spec);
			const summary = await parser.getSummary();

			expect(summary.baseUrl).toBe("");
			expect(summary.authMethods).toBeUndefined();
			expect(summary.tags).toBeUndefined();
			expect(summary.totalEndpoints).toBe(0);
		});
	});

	describe("listEndpoints", () => {
		const spec: OpenAPISpec = {
			openapi: "3.0.0",
			info: { title: "Test", version: "1.0" },
			paths: {
				"/users": {
					get: {
						summary: "List users",
						operationId: "listUsers",
						tags: ["users"],
						deprecated: false,
					},
					post: {
						summary: "Create user",
						operationId: "createUser",
						tags: ["users"],
					},
				},
				"/users/{id}": {
					get: {
						summary: "Get user",
						operationId: "getUser",
						tags: ["users"],
					},
					delete: {
						summary: "Delete user",
						operationId: "deleteUser",
						tags: ["users"],
						deprecated: true,
					},
				},
				"/posts": {
					get: {
						summary: "List posts",
						operationId: "listPosts",
						tags: ["posts"],
					},
				},
			},
		};

		it("should list all endpoints without filters", async () => {
			const parser = new OpenAPIParser(spec);
			const endpoints = await parser.listEndpoints();

			expect(endpoints).toHaveLength(5);
			expect(endpoints.map((e) => e.operationId)).toEqual([
				"listUsers",
				"createUser",
				"getUser",
				"deleteUser",
				"listPosts",
			]);
		});

		it("should filter endpoints by tag", async () => {
			const parser = new OpenAPIParser(spec);
			const endpoints = await parser.listEndpoints({ tag: "users" });

			expect(endpoints).toHaveLength(4);
			expect(endpoints.every((e) => e.tags?.includes("users"))).toBe(true);
		});

		it("should filter endpoints by method", async () => {
			const parser = new OpenAPIParser(spec);
			const endpoints = await parser.listEndpoints({ method: "GET" });

			expect(endpoints).toHaveLength(3);
			expect(endpoints.every((e) => e.method === "GET")).toBe(true);
		});

		it("should filter endpoints by deprecated status", async () => {
			const parser = new OpenAPIParser(spec);
			const deprecated = await parser.listEndpoints({ deprecated: true });
			const current = await parser.listEndpoints({ deprecated: false });

			expect(deprecated).toHaveLength(1);
			expect(deprecated[0].operationId).toBe("deleteUser");

			expect(current).toHaveLength(4);
			expect(current.every((e) => !e.deprecated)).toBe(true);
		});

		it("should combine multiple filters", async () => {
			const parser = new OpenAPIParser(spec);
			const endpoints = await parser.listEndpoints({
				tag: "users",
				method: "get",
				deprecated: false,
			});

			expect(endpoints).toHaveLength(2);
			expect(endpoints.map((e) => e.operationId)).toEqual([
				"listUsers",
				"getUser",
			]);
		});

		it("should return method names in uppercase", async () => {
			const parser = new OpenAPIParser(spec);
			const endpoints = await parser.listEndpoints();

			expect(endpoints.every((e) => e.method === e.method.toUpperCase())).toBe(
				true,
			);
		});

		it("should handle paths with no valid HTTP methods", async () => {
			const spec: any = {
				openapi: "3.0.0",
				info: { title: "Test", version: "1.0" },
				paths: {
					"/test": {
						parameters: [], // Not an HTTP method
						servers: [], // Not an HTTP method
					},
				},
			};

			const parser = new OpenAPIParser(spec);
			const endpoints = await parser.listEndpoints();

			expect(endpoints).toHaveLength(0);
		});
	});

	describe("getEndpointDetails", () => {
		it("should return full endpoint details", async () => {
			const spec: OpenAPISpec = {
				openapi: "3.0.0",
				info: { title: "Test", version: "1.0" },
				paths: {
					"/users/{id}": {
						get: {
							summary: "Get user by ID",
							description: "Returns a single user",
							operationId: "getUserById",
							tags: ["users"],
							parameters: [
								{
									name: "id",
									in: "path",
									required: true,
									description: "User ID",
									schema: { type: "string" },
									example: "12345",
								},
							],
							responses: {
								"200": {
									description: "Success",
									content: {
										"application/json": {
											schema: { type: "object" },
											example: { id: "12345", name: "John" },
										},
									},
								},
								"404": {
									description: "User not found",
								},
							},
							security: [{ apiKey: [] }],
						},
					},
				},
			};

			const parser = new OpenAPIParser(spec);
			const details = await parser.getEndpointDetails("/users/{id}", "GET");

			expect(details).toBeDefined();
			expect(details?.path).toBe("/users/{id}");
			expect(details?.method).toBe("GET");
			expect(details?.summary).toBe("Get user by ID");
			expect(details?.description).toBe("Returns a single user");
			expect(details?.operationId).toBe("getUserById");
			expect(details?.tags).toEqual(["users"]);

			// Parameters
			expect(details?.parameters).toHaveLength(1);
			expect(details?.parameters?.[0]).toMatchObject({
				name: "id",
				in: "path",
				required: true,
				description: "User ID",
			});

			// Responses
			expect(details?.responses["200"]).toMatchObject({
				description: "Success",
				contentType: "application/json",
			});
			expect(details?.responses["404"]).toMatchObject({
				description: "User not found",
			});

			// Security
			expect(details?.security).toEqual([{ apiKey: [] }]);
		});

		it("should handle request body", async () => {
			const spec: OpenAPISpec = {
				openapi: "3.0.0",
				info: { title: "Test", version: "1.0" },
				paths: {
					"/users": {
						post: {
							summary: "Create user",
							operationId: "createUser",
							requestBody: {
								required: true,
								description: "User data",
								content: {
									"application/json": {
										schema: {
											type: "object",
											properties: {
												name: { type: "string" },
												email: { type: "string" },
											},
										},
										example: { name: "John", email: "john@example.com" },
									},
								},
							},
							responses: {
								"201": { description: "Created" },
							},
						},
					},
				},
			};

			const parser = new OpenAPIParser(spec);
			const details = await parser.getEndpointDetails("/users", "POST");

			expect(details?.requestBody).toBeDefined();
			expect(details?.requestBody?.required).toBe(true);
			expect(details?.requestBody?.description).toBe("User data");
			expect(details?.requestBody?.contentType).toBe("application/json");
			expect(details?.requestBody?.schema).toBeDefined();
			expect(details?.requestBody?.example).toEqual({
				name: "John",
				email: "john@example.com",
			});
		});

		it("should return null for non-existent path", async () => {
			const spec: OpenAPISpec = {
				openapi: "3.0.0",
				info: { title: "Test", version: "1.0" },
				paths: {},
			};

			const parser = new OpenAPIParser(spec);
			const details = await parser.getEndpointDetails("/not-found", "GET");

			expect(details).toBeNull();
		});

		it("should return null for non-existent method", async () => {
			const spec: OpenAPISpec = {
				openapi: "3.0.0",
				info: { title: "Test", version: "1.0" },
				paths: {
					"/users": {
						get: { summary: "Get users" },
					},
				},
			};

			const parser = new OpenAPIParser(spec);
			const details = await parser.getEndpointDetails("/users", "POST");

			expect(details).toBeNull();
		});

		it("should handle lowercase method names", async () => {
			const spec: OpenAPISpec = {
				openapi: "3.0.0",
				info: { title: "Test", version: "1.0" },
				paths: {
					"/users": {
						get: { summary: "Get users", operationId: "getUsers" },
					},
				},
			};

			const parser = new OpenAPIParser(spec);
			const details = await parser.getEndpointDetails("/users", "get");

			expect(details).toBeDefined();
			expect(details?.method).toBe("GET"); // Should be uppercase in response
		});

		it("should handle optional fields gracefully", async () => {
			const spec: any = {
				openapi: "3.0.0",
				info: { title: "Test", version: "1.0" },
				paths: {
					"/minimal": {
						get: {
							// Minimal operation - no optional fields
							responses: {
								"200": { description: "OK" },
							},
						},
					},
				},
			};

			const parser = new OpenAPIParser(spec);
			const details = await parser.getEndpointDetails("/minimal", "GET");

			expect(details?.parameters).toBeUndefined();
			expect(details?.requestBody).toBeUndefined();
			expect(details?.summary).toBeUndefined();
			expect(details?.description).toBeUndefined();
			expect(details?.tags).toBeUndefined();
		});
	});

	describe("listSchemas", () => {
		it("should list all schemas from components", async () => {
			const spec: any = {
				openapi: "3.0.0",
				info: { title: "Test", version: "1.0" },
				components: {
					schemas: {
						User: {
							type: "object",
							description: "A user object",
							properties: {
								id: { type: "string" },
								name: { type: "string" },
								email: { type: "string" },
							},
							required: ["id", "name"],
							example: { id: "1", name: "John", email: "john@example.com" },
						},
						Post: {
							type: "object",
							description: "A blog post",
							properties: {
								title: { type: "string" },
								content: { type: "string" },
							},
							required: ["title"],
						},
					},
				},
				paths: {},
			};

			const parser = new OpenAPIParser(spec);
			const schemas = await parser.listSchemas();

			expect(schemas).toHaveLength(2);

			const userSchema = schemas.find((s) => s.name === "User");
			expect(userSchema).toMatchObject({
				name: "User",
				type: "object",
				description: "A user object",
				properties: ["id", "name", "email"],
				required: ["id", "name"],
			});

			const postSchema = schemas.find((s) => s.name === "Post");
			expect(postSchema).toMatchObject({
				name: "Post",
				type: "object",
				description: "A blog post",
				properties: ["title", "content"],
				required: ["title"],
			});
		});

		it("should handle schemas without properties", async () => {
			const spec: any = {
				openapi: "3.0.0",
				info: { title: "Test", version: "1.0" },
				components: {
					schemas: {
						SimpleString: {
							type: "string",
							description: "A simple string type",
						},
					},
				},
				paths: {},
			};

			const parser = new OpenAPIParser(spec);
			const schemas = await parser.listSchemas();

			expect(schemas).toHaveLength(1);
			expect(schemas[0]).toMatchObject({
				name: "SimpleString",
				type: "string",
				description: "A simple string type",
			});
			expect(schemas[0].properties).toBeUndefined();
		});

		it("should return empty array when no components", async () => {
			const spec: any = {
				openapi: "3.0.0",
				info: { title: "Test", version: "1.0" },
				paths: {},
			};

			const parser = new OpenAPIParser(spec);
			const schemas = await parser.listSchemas();

			expect(schemas).toEqual([]);
		});

		it("should return empty array when components has no schemas", async () => {
			const spec: any = {
				openapi: "3.0.0",
				info: { title: "Test", version: "1.0" },
				components: {
					// No schemas
				},
				paths: {},
			};

			const parser = new OpenAPIParser(spec);
			const schemas = await parser.listSchemas();

			expect(schemas).toEqual([]);
		});
	});

	describe("getSchema", () => {
		const spec: any = {
			openapi: "3.0.0",
			info: { title: "Test", version: "1.0" },
			components: {
				schemas: {
					User: {
						type: "object",
						properties: {
							id: { type: "string" },
							name: { type: "string" },
						},
					},
					Post: {
						type: "object",
						properties: {
							title: { type: "string" },
						},
					},
				},
			},
			paths: {},
		};

		it("should retrieve a specific schema by name", async () => {
			const parser = new OpenAPIParser(spec);
			const schema = await parser.getSchema("User");

			expect(schema).toBeDefined();
			expect(schema.type).toBe("object");
			expect(schema.properties).toHaveProperty("id");
			expect(schema.properties).toHaveProperty("name");
		});

		it("should return null for non-existent schema", async () => {
			const parser = new OpenAPIParser(spec);
			const schema = await parser.getSchema("NonExistent");

			expect(schema).toBeNull();
		});

		it("should handle spec without components", async () => {
			const minimalSpec: any = {
				openapi: "3.0.0",
				info: { title: "Test", version: "1.0" },
				paths: {},
			};

			const parser = new OpenAPIParser(minimalSpec);
			const schema = await parser.getSchema("User");

			expect(schema).toBeNull();
		});
	});

	describe("searchOperations", () => {
		const spec: OpenAPISpec = {
			openapi: "3.0.0",
			info: { title: "Test", version: "1.0" },
			paths: {
				"/users": {
					get: {
						summary: "List all users",
						description: "Get a paginated list of users",
						operationId: "listUsers",
						tags: ["users"],
					},
				},
				"/users/{id}": {
					get: {
						summary: "Get user by ID",
						description: "Retrieve a specific user",
						operationId: "getUserById",
						tags: ["users"],
					},
					delete: {
						summary: "Delete user",
						description: "Remove a user from the system",
						operationId: "deleteUser",
						tags: ["users"],
					},
				},
				"/posts": {
					get: {
						summary: "List posts",
						description: "Get all blog posts",
						operationId: "listPosts",
						tags: ["posts", "content"],
					},
				},
				"/admin/reports": {
					get: {
						summary: "Generate reports",
						description: "Admin endpoint for reporting",
						operationId: "generateReports",
						tags: ["admin"],
					},
				},
			},
		};

		it("should find operations by path keyword", async () => {
			const parser = new OpenAPIParser(spec);
			const results = await parser.searchOperations("admin");

			expect(results).toHaveLength(1);
			expect(results[0].operationId).toBe("generateReports");
		});

		it("should find operations by summary keyword", async () => {
			const parser = new OpenAPIParser(spec);
			const results = await parser.searchOperations("list");

			expect(results).toHaveLength(2);
			expect(results.map((r) => r.operationId)).toContain("listUsers");
			expect(results.map((r) => r.operationId)).toContain("listPosts");
		});

		it("should find operations by description keyword", async () => {
			const parser = new OpenAPIParser(spec);
			const results = await parser.searchOperations("paginated");

			expect(results).toHaveLength(1);
			expect(results[0].operationId).toBe("listUsers");
		});

		it("should find operations by operationId keyword", async () => {
			const parser = new OpenAPIParser(spec);
			const results = await parser.searchOperations("delete");

			expect(results).toHaveLength(1);
			expect(results[0].operationId).toBe("deleteUser");
		});

		it("should find operations by tag keyword", async () => {
			const parser = new OpenAPIParser(spec);
			const results = await parser.searchOperations("content");

			expect(results).toHaveLength(1);
			expect(results[0].operationId).toBe("listPosts");
		});

		it("should perform case-insensitive search", async () => {
			const parser = new OpenAPIParser(spec);
			const lowerResults = await parser.searchOperations("admin");
			const upperResults = await parser.searchOperations("ADMIN");
			const mixedResults = await parser.searchOperations("AdMiN");

			expect(lowerResults).toEqual(upperResults);
			expect(lowerResults).toEqual(mixedResults);
		});

		it("should return empty array when no matches", async () => {
			const parser = new OpenAPIParser(spec);
			const results = await parser.searchOperations("nonexistent");

			expect(results).toEqual([]);
		});

		it("should handle partial keyword matches", async () => {
			const parser = new OpenAPIParser(spec);
			const results = await parser.searchOperations("user");

			// Should match "users" paths, "user" in descriptions
			expect(results.length).toBeGreaterThan(0);
			expect(results.map((r) => r.tags?.flat())).toContainEqual(["users"]);
		});
	});

	describe("getRawSpec", () => {
		it("should return the original spec", () => {
			const spec: OpenAPISpec = {
				openapi: "3.0.0",
				info: { title: "Test", version: "1.0" },
				paths: {},
			};

			const parser = new OpenAPIParser(spec);
			const rawSpec = parser.getRawSpec();

			expect(rawSpec).toBe(spec);
			expect(rawSpec).toEqual(spec);
		});
	});
});
