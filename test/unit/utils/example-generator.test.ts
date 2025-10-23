/**
 * Tests for Example Generator
 */

import { describe, it, expect } from "vitest";
import { ExampleGenerator } from "../../../src/utils/example-generator.js";
import testSchemas from "../../fixtures/schemas/test-schemas.json";

describe("ExampleGenerator", () => {
	describe("Simple Types", () => {
		it("should generate string example", () => {
			const result = ExampleGenerator.generate(testSchemas.simpleString);
			expect(typeof result).toBe("string");
		});

		it("should generate number example", () => {
			const schema = { type: "number" };
			const result = ExampleGenerator.generate(schema);
			expect(typeof result).toBe("number");
		});

		it("should generate integer example", () => {
			const schema = { type: "integer" };
			const result = ExampleGenerator.generate(schema);
			expect(typeof result).toBe("number");
			expect(Number.isInteger(result)).toBe(true);
		});

		it("should generate boolean example", () => {
			const schema = { type: "boolean" };
			const result = ExampleGenerator.generate(schema);
			expect(typeof result).toBe("boolean");
			expect(result).toBe(true);
		});

		it("should generate null example", () => {
			const schema = { type: "null" };
			const result = ExampleGenerator.generate(schema);
			expect(result).toBeNull();
		});
	});

	describe("Object Generation", () => {
		it("should generate simple object", () => {
			const schema = {
				type: "object",
				properties: {
					name: { type: "string" },
					age: { type: "integer" },
				},
			};
			const result = ExampleGenerator.generate(schema);

			expect(result).toHaveProperty("name");
			expect(result).toHaveProperty("age");
			expect(typeof result.name).toBe("string");
			expect(typeof result.age).toBe("number");
		});

		it("should generate object with only required fields when requiredOnly is true", () => {
			const schema = {
				type: "object",
				required: ["name"],
				properties: {
					name: { type: "string" },
					email: { type: "string" },
					phone: { type: "string" },
				},
			};
			const result = ExampleGenerator.generate(schema, { requiredOnly: true });

			expect(result).toHaveProperty("name");
			expect(result).not.toHaveProperty("email");
			expect(result).not.toHaveProperty("phone");
		});

		it("should generate all fields when requiredOnly is false", () => {
			const schema = {
				type: "object",
				required: ["name"],
				properties: {
					name: { type: "string" },
					email: { type: "string" },
				},
			};
			const result = ExampleGenerator.generate(schema);

			expect(result).toHaveProperty("name");
			expect(result).toHaveProperty("email");
		});

		it("should generate complex person schema", () => {
			const result = ExampleGenerator.generate(testSchemas.personSchema);

			expect(result).toHaveProperty("firstName");
			expect(result).toHaveProperty("lastName");
			expect(result).toHaveProperty("ssn");
			expect(result.ssn).toMatch(/^\d{3}-\d{2}-\d{4}$/);
		});
	});

	describe("Array Generation", () => {
		it("should generate array", () => {
			const result = ExampleGenerator.generate(testSchemas.arraySchema);

			expect(Array.isArray(result)).toBe(true);
			expect(result.length).toBeGreaterThan(0);
		});

		it("should generate array with minItems", () => {
			const schema = {
				type: "array",
				items: { type: "string" },
				minItems: 3,
			};
			const result = ExampleGenerator.generate(schema);

			expect(Array.isArray(result)).toBe(true);
			expect(result.length).toBeGreaterThanOrEqual(3);
		});

		it("should generate array of objects", () => {
			const schema = {
				type: "array",
				items: {
					type: "object",
					properties: {
						id: { type: "integer" },
						name: { type: "string" },
					},
				},
			};
			const result = ExampleGenerator.generate(schema);

			expect(Array.isArray(result)).toBe(true);
			expect(result.length).toBeGreaterThan(0);
			expect(result[0]).toHaveProperty("id");
			expect(result[0]).toHaveProperty("name");
		});

		it("should return empty array when no items schema", () => {
			const schema = { type: "array" };
			const result = ExampleGenerator.generate(schema);

			expect(Array.isArray(result)).toBe(true);
			expect(result.length).toBe(0);
		});
	});

	describe("String Formats", () => {
		it("should generate email format", () => {
			const schema = { type: "string", format: "email" };
			const result = ExampleGenerator.generate(schema);

			expect(result).toContain("@");
			expect(result).toContain(".");
		});

		it("should generate date format", () => {
			const schema = { type: "string", format: "date" };
			const result = ExampleGenerator.generate(schema);

			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		});

		it("should generate date-time format", () => {
			const schema = { type: "string", format: "date-time" };
			const result = ExampleGenerator.generate(schema);

			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
		});

		it("should generate uri format", () => {
			const schema = { type: "string", format: "uri" };
			const result = ExampleGenerator.generate(schema);

			expect(result).toMatch(/^https?:\/\//);
		});

		it("should generate uuid format", () => {
			const schema = { type: "string", format: "uuid" };
			const result = ExampleGenerator.generate(schema);

			expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
		});

		it("should generate ssn format", () => {
			const schema = { type: "string", format: "ssn" };
			const result = ExampleGenerator.generate(schema);

			expect(result).toMatch(/^\d{3}-\d{2}-\d{4}$/);
		});

		it("should generate phone format", () => {
			const schema = { type: "string", format: "phone" };
			const result = ExampleGenerator.generate(schema);

			expect(result).toMatch(/^\d{3}-\d{3}-\d{4}$/);
		});

		it("should generate ipv4 format", () => {
			const schema = { type: "string", format: "ipv4" };
			const result = ExampleGenerator.generate(schema);

			expect(result).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
		});

		it("should generate ipv6 format", () => {
			const schema = { type: "string", format: "ipv6" };
			const result = ExampleGenerator.generate(schema);

			expect(result).toMatch(/^[0-9a-f:]+$/);
		});
	});

	describe("String Patterns", () => {
		it("should generate SSN pattern", () => {
			const schema = { type: "string", pattern: "^\\d{3}-\\d{2}-\\d{4}$" };
			const result = ExampleGenerator.generate(schema);

			expect(result).toMatch(/^\d{3}-\d{2}-\d{4}$/);
		});

		it("should generate phone pattern", () => {
			const schema = { type: "string", pattern: "^\\d{3}-\\d{3}-\\d{4}$" };
			const result = ExampleGenerator.generate(schema);

			expect(result).toMatch(/^\d{3}-\d{3}-\d{4}$/);
		});

		it("should generate ID pattern", () => {
			const schema = { type: "string", pattern: "^[A-Z]{2}\\d{6}$" };
			const result = ExampleGenerator.generate(schema);

			expect(result).toMatch(/^[A-Z]{2}\d{6}$/);
		});

		it("should fallback to generic string for unknown pattern", () => {
			const schema = { type: "string", pattern: "^[a-z]+@[a-z]+\\.[a-z]{2,}$" };
			const result = ExampleGenerator.generate(schema);

			expect(typeof result).toBe("string");
		});
	});

	describe("Enum Values", () => {
		it("should use first enum value for strings", () => {
			const schema = { type: "string", enum: ["active", "inactive", "pending"] };
			const result = ExampleGenerator.generate(schema);

			expect(result).toBe("active");
		});

		it("should use first enum value for numbers", () => {
			const schema = { type: "integer", enum: [1, 2, 3] };
			const result = ExampleGenerator.generate(schema);

			expect(result).toBe(1);
		});
	});

	describe("Number Constraints", () => {
		it("should use minimum value when specified", () => {
			const schema = { type: "integer", minimum: 18 };
			const result = ExampleGenerator.generate(schema);

			expect(result).toBe(18);
		});

		it("should use maximum value when specified (and no minimum)", () => {
			const schema = { type: "integer", maximum: 100 };
			const result = ExampleGenerator.generate(schema);

			expect(result).toBe(100);
		});

		it("should prefer minimum over maximum", () => {
			const schema = { type: "integer", minimum: 10, maximum: 100 };
			const result = ExampleGenerator.generate(schema);

			expect(result).toBe(10);
		});

		it("should generate 0 for integer with no constraints", () => {
			const schema = { type: "integer" };
			const result = ExampleGenerator.generate(schema);

			expect(result).toBe(0);
		});

		it("should generate 0.0 for number with no constraints", () => {
			const schema = { type: "number" };
			const result = ExampleGenerator.generate(schema);

			expect(result).toBe(0.0);
		});
	});

	describe("Schema Keywords", () => {
		it("should use example if provided", () => {
			const schema = { type: "string", example: "test-example" };
			const result = ExampleGenerator.generate(schema);

			expect(result).toBe("test-example");
		});

		it("should use default if provided", () => {
			const schema = { type: "string", default: "test-default" };
			const result = ExampleGenerator.generate(schema);

			expect(result).toBe("test-default");
		});

		it("should prefer example over default", () => {
			const schema = { type: "string", example: "example", default: "default" };
			const result = ExampleGenerator.generate(schema);

			expect(result).toBe("example");
		});
	});

	describe("oneOf/anyOf/allOf", () => {
		it("should use first option in oneOf", () => {
			const schema = {
				oneOf: [
					{ type: "string" },
					{ type: "number" },
				],
			};
			const result = ExampleGenerator.generate(schema);

			expect(typeof result).toBe("string");
		});

		it("should use first option in anyOf", () => {
			const schema = {
				anyOf: [
					{ type: "number" },
					{ type: "string" },
				],
			};
			const result = ExampleGenerator.generate(schema);

			expect(typeof result).toBe("number");
		});

		it("should merge allOf schemas", () => {
			const schema = {
				allOf: [
					{
						type: "object",
						properties: {
							name: { type: "string" },
						},
						required: ["name"],
					},
					{
						type: "object",
						properties: {
							email: { type: "string" },
						},
						required: ["email"],
					},
				],
			};
			const result = ExampleGenerator.generate(schema);

			expect(result).toHaveProperty("name");
			expect(result).toHaveProperty("email");
		});
	});

	describe("Edge Cases", () => {
		it("should handle null schema", () => {
			const result = ExampleGenerator.generate(null);
			expect(result).toBeNull();
		});

		it("should handle undefined schema", () => {
			const result = ExampleGenerator.generate(undefined);
			expect(result).toBeNull();
		});

		it("should handle $ref (if not dereferenced)", () => {
			const schema = { $ref: "#/definitions/User" };
			const result = ExampleGenerator.generate(schema);

			expect(typeof result).toBe("string");
			expect(result).toContain("reference");
		});

		it("should handle schema without type", () => {
			const schema = { properties: { name: { type: "string" } } };
			const result = ExampleGenerator.generate(schema);

			expect(result).toBeNull();
		});

		it("should handle nested objects", () => {
			const schema = {
				type: "object",
				properties: {
					user: {
						type: "object",
						properties: {
							name: { type: "string" },
							contact: {
								type: "object",
								properties: {
									email: { type: "string", format: "email" },
								},
							},
						},
					},
				},
			};
			const result = ExampleGenerator.generate(schema);

			expect(result.user).toBeDefined();
			expect(result.user.name).toBeDefined();
			expect(result.user.contact).toBeDefined();
			expect(result.user.contact.email).toContain("@");
		});

		it("should handle empty object schema", () => {
			const schema = { type: "object" };
			const result = ExampleGenerator.generate(schema);

			expect(result).toEqual({});
		});

		it("should handle complex nested arrays", () => {
			const schema = {
				type: "array",
				items: {
					type: "array",
					items: {
						type: "string",
					},
				},
			};
			const result = ExampleGenerator.generate(schema);

			expect(Array.isArray(result)).toBe(true);
			expect(Array.isArray(result[0])).toBe(true);
		});
	});
});
