/**
 * Unit tests for JSON Schema to Zod conversion
 */

import { describe, it, expect } from "vitest";
import {
	jsonSchemaToZod,
	getZodErrorMessage,
} from "../../../src/utils/json-schema-to-zod.js";
import { z } from "zod";

describe("jsonSchemaToZod", () => {
	describe("Null Type", () => {
		it("should handle null type schemas", () => {
			const schema = { type: "null" };
			const zodSchema = jsonSchemaToZod(schema);

			expect(zodSchema.safeParse(null).success).toBe(true);
			expect(zodSchema.safeParse("not null").success).toBe(false);
			expect(zodSchema.safeParse(undefined).success).toBe(false);
		});

		it("should handle nullable fields with oneOf", () => {
			const schema = {
				oneOf: [{ type: "string" }, { type: "null" }],
			};

			const zodSchema = jsonSchemaToZod(schema);

			expect(zodSchema.safeParse("value").success).toBe(true);
			expect(zodSchema.safeParse(null).success).toBe(true);
			expect(zodSchema.safeParse(123).success).toBe(false);
		});
	});

	describe("Pattern/Regex Constraints", () => {
		it("should apply pattern constraints to strings", () => {
			const schema = {
				type: "string",
				pattern: "^\\d{3}-\\d{2}-\\d{4}$",
			};

			const zodSchema = jsonSchemaToZod(schema);

			expect(zodSchema.safeParse("123-45-6789").success).toBe(true);
			expect(zodSchema.safeParse("123456789").success).toBe(false);
			expect(zodSchema.safeParse("abc-de-fghi").success).toBe(false);
		});

		it("should provide custom pattern error messages", () => {
			const schema = {
				type: "string",
				pattern: "^[A-Z]{3}$",
			};

			const zodSchema = jsonSchemaToZod(schema);
			const result = zodSchema.safeParse("abc");

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain("pattern");
			}
		});

		it("should handle complex patterns", () => {
			const schema = {
				type: "string",
				pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
			};

			const zodSchema = jsonSchemaToZod(schema);

			expect(zodSchema.safeParse("user@example.com").success).toBe(true);
			expect(zodSchema.safeParse("test.user+tag@domain.co.uk").success).toBe(
				true,
			);
			expect(zodSchema.safeParse("invalid@").success).toBe(false);
			expect(zodSchema.safeParse("@example.com").success).toBe(false);
		});

		it("should combine pattern with length constraints", () => {
			const schema = {
				type: "string",
				pattern: "^[A-Z]+$",
				minLength: 3,
				maxLength: 5,
			};

			const zodSchema = jsonSchemaToZod(schema);

			expect(zodSchema.safeParse("ABC").success).toBe(true);
			expect(zodSchema.safeParse("ABCDE").success).toBe(true);
			expect(zodSchema.safeParse("AB").success).toBe(false); // Too short
			expect(zodSchema.safeParse("ABCDEF").success).toBe(false); // Too long
			expect(zodSchema.safeParse("abc").success).toBe(false); // Wrong pattern
		});
	});

	describe("Number Constraints", () => {
		it("should handle exclusiveMinimum constraint", () => {
			const schema = {
				type: "number",
				exclusiveMinimum: 0,
			};

			const zodSchema = jsonSchemaToZod(schema);

			expect(zodSchema.safeParse(0.1).success).toBe(true);
			expect(zodSchema.safeParse(1).success).toBe(true);
			expect(zodSchema.safeParse(0).success).toBe(false); // Exactly 0 should fail
			expect(zodSchema.safeParse(-1).success).toBe(false);
		});

		it("should handle exclusiveMaximum constraint", () => {
			const schema = {
				type: "number",
				exclusiveMaximum: 100,
			};

			const zodSchema = jsonSchemaToZod(schema);

			expect(zodSchema.safeParse(99.9).success).toBe(true);
			expect(zodSchema.safeParse(50).success).toBe(true);
			expect(zodSchema.safeParse(100).success).toBe(false); // Exactly 100 should fail
			expect(zodSchema.safeParse(101).success).toBe(false);
		});

		it("should combine exclusive and inclusive constraints", () => {
			const schema = {
				type: "number",
				minimum: 0,
				exclusiveMaximum: 100,
			};

			const zodSchema = jsonSchemaToZod(schema);

			expect(zodSchema.safeParse(0).success).toBe(true); // Inclusive minimum
			expect(zodSchema.safeParse(50).success).toBe(true);
			expect(zodSchema.safeParse(99.99).success).toBe(true);
			expect(zodSchema.safeParse(100).success).toBe(false); // Exclusive maximum
			expect(zodSchema.safeParse(-1).success).toBe(false);
		});

		it("should handle multipleOf constraint", () => {
			const schema = {
				type: "number",
				multipleOf: 5,
			};

			const zodSchema = jsonSchemaToZod(schema);

			expect(zodSchema.safeParse(5).success).toBe(true);
			expect(zodSchema.safeParse(10).success).toBe(true);
			expect(zodSchema.safeParse(15).success).toBe(true);
			expect(zodSchema.safeParse(7).success).toBe(false);
			expect(zodSchema.safeParse(3).success).toBe(false);
		});
	});

	describe("Array Validation", () => {
		it("should handle maxItems constraint", () => {
			const schema = {
				type: "array",
				items: { type: "string" },
				maxItems: 3,
			};

			const zodSchema = jsonSchemaToZod(schema);

			expect(zodSchema.safeParse([]).success).toBe(true);
			expect(zodSchema.safeParse(["a"]).success).toBe(true);
			expect(zodSchema.safeParse(["a", "b", "c"]).success).toBe(true);
			expect(zodSchema.safeParse(["a", "b", "c", "d"]).success).toBe(false);
		});

		it("should handle minItems constraint", () => {
			const schema = {
				type: "array",
				items: { type: "number" },
				minItems: 2,
			};

			const zodSchema = jsonSchemaToZod(schema);

			expect(zodSchema.safeParse([1, 2]).success).toBe(true);
			expect(zodSchema.safeParse([1, 2, 3]).success).toBe(true);
			expect(zodSchema.safeParse([1]).success).toBe(false);
			expect(zodSchema.safeParse([]).success).toBe(false);
		});

		it("should handle both minItems and maxItems", () => {
			const schema = {
				type: "array",
				items: { type: "string" },
				minItems: 1,
				maxItems: 3,
			};

			const zodSchema = jsonSchemaToZod(schema);

			expect(zodSchema.safeParse(["a"]).success).toBe(true);
			expect(zodSchema.safeParse(["a", "b"]).success).toBe(true);
			expect(zodSchema.safeParse(["a", "b", "c"]).success).toBe(true);
			expect(zodSchema.safeParse([]).success).toBe(false); // Too few
			expect(zodSchema.safeParse(["a", "b", "c", "d"]).success).toBe(false); // Too many
		});
	});

	describe("getZodErrorMessage", () => {
		it("should format array too_big errors", () => {
			const issue: z.ZodIssue = {
				code: "too_big",
				type: "array",
				maximum: 5,
				inclusive: true,
				message: "Array too long",
				path: ["items"],
			};

			const message = getZodErrorMessage(issue, {});
			expect(message).toContain("Too many items");
			expect(message).toContain("5");
		});

		it("should format array too_small errors", () => {
			const issue: z.ZodIssue = {
				code: "too_small",
				type: "array",
				minimum: 2,
				inclusive: true,
				message: "Array too short",
				path: ["items"],
			};

			const message = getZodErrorMessage(issue, {});
			expect(message).toContain("Too few items");
			expect(message).toContain("2");
		});

		it("should handle default case for unknown error codes", () => {
			const issue: any = {
				code: "unknown_error_code",
				message: "Custom error message",
				path: [],
			};

			const message = getZodErrorMessage(issue, {});
			expect(message).toBe("Custom error message");
		});

		it("should handle missing message in default case", () => {
			const issue: any = {
				code: "unknown_error_code",
				path: [],
			};

			const message = getZodErrorMessage(issue, {});
			expect(message).toBe("Validation error");
		});

		it("should format invalid_type errors", () => {
			const issue: z.ZodIssue = {
				code: "invalid_type",
				expected: "string",
				received: "number",
				message: "Expected string",
				path: ["name"],
			};

			const message = getZodErrorMessage(issue, {});
			expect(message).toContain("expected string");
		});

		it("should format invalid_enum_value errors", () => {
			const issue: z.ZodIssue = {
				code: "invalid_enum_value",
				options: ["red", "green", "blue"],
				received: "yellow",
				message: "Invalid enum",
				path: ["color"],
			};

			const message = getZodErrorMessage(issue, {});
			expect(message).toContain("red");
			expect(message).toContain("green");
			expect(message).toContain("blue");
		});

		it("should format custom validation errors", () => {
			const issue: z.ZodIssue = {
				code: "custom",
				message: "Custom validation failed",
				path: ["field"],
			};

			const message = getZodErrorMessage(issue, {});
			expect(message).toBe("Custom validation failed");
		});
	});

	describe("Complex Schemas", () => {
		it("should handle allOf merging", () => {
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
							age: { type: "number" },
						},
						required: ["age"],
					},
				],
			};

			const zodSchema = jsonSchemaToZod(schema);

			expect(zodSchema.safeParse({ name: "John", age: 30 }).success).toBe(true);
			expect(zodSchema.safeParse({ name: "John" }).success).toBe(false); // Missing age
			expect(zodSchema.safeParse({ age: 30 }).success).toBe(false); // Missing name
		});

		it("should handle anyOf unions", () => {
			const schema = {
				anyOf: [{ type: "string" }, { type: "number" }],
			};

			const zodSchema = jsonSchemaToZod(schema);

			expect(zodSchema.safeParse("test").success).toBe(true);
			expect(zodSchema.safeParse(123).success).toBe(true);
			expect(zodSchema.safeParse(true).success).toBe(false);
		});

		it("should handle oneOf unions", () => {
			const schema = {
				oneOf: [
					{ type: "string", minLength: 5 },
					{ type: "number", minimum: 100 },
				],
			};

			const zodSchema = jsonSchemaToZod(schema);

			expect(zodSchema.safeParse("hello").success).toBe(true);
			expect(zodSchema.safeParse(150).success).toBe(true);
		});
	});

	describe("Integer Type Handling", () => {
		it("should enforce integer constraint", () => {
			const schema = {
				type: "integer",
			};

			const zodSchema = jsonSchemaToZod(schema);

			expect(zodSchema.safeParse(42).success).toBe(true);
			expect(zodSchema.safeParse(0).success).toBe(true);
			expect(zodSchema.safeParse(-10).success).toBe(true);
			expect(zodSchema.safeParse(3.14).success).toBe(false); // Not an integer
		});

		it("should handle integer with minimum constraint", () => {
			const schema = {
				type: "integer",
				minimum: 0,
			};

			const zodSchema = jsonSchemaToZod(schema);

			expect(zodSchema.safeParse(0).success).toBe(true);
			expect(zodSchema.safeParse(10).success).toBe(true);
			expect(zodSchema.safeParse(-1).success).toBe(false);
		});

		it("should handle integer with maximum constraint", () => {
			const schema = {
				type: "integer",
				maximum: 100,
			};

			const zodSchema = jsonSchemaToZod(schema);

			expect(zodSchema.safeParse(100).success).toBe(true);
			expect(zodSchema.safeParse(50).success).toBe(true);
			expect(zodSchema.safeParse(101).success).toBe(false);
		});

		it("should handle integer with exclusiveMinimum", () => {
			const schema = {
				type: "integer",
				exclusiveMinimum: 0,
			};

			const zodSchema = jsonSchemaToZod(schema);

			expect(zodSchema.safeParse(1).success).toBe(true);
			expect(zodSchema.safeParse(0).success).toBe(false);
			expect(zodSchema.safeParse(-1).success).toBe(false);
		});

		it("should handle integer with exclusiveMaximum", () => {
			const schema = {
				type: "integer",
				exclusiveMaximum: 100,
			};

			const zodSchema = jsonSchemaToZod(schema);

			expect(zodSchema.safeParse(99).success).toBe(true);
			expect(zodSchema.safeParse(100).success).toBe(false);
			expect(zodSchema.safeParse(101).success).toBe(false);
		});

		it("should handle integer with multipleOf", () => {
			const schema = {
				type: "integer",
				multipleOf: 5,
			};

			const zodSchema = jsonSchemaToZod(schema);

			expect(zodSchema.safeParse(10).success).toBe(true);
			expect(zodSchema.safeParse(15).success).toBe(true);
			expect(zodSchema.safeParse(0).success).toBe(true);
			expect(zodSchema.safeParse(7).success).toBe(false);
		});

		it("should handle integer enum", () => {
			const schema = {
				type: "integer",
				enum: [1, 2, 3],
			};

			const zodSchema = jsonSchemaToZod(schema);

			// Enum for numbers gets transformed to string enum then back to number
			expect(zodSchema.safeParse("1").success).toBe(true);
			expect(zodSchema.safeParse("2").success).toBe(true);
			expect(zodSchema.safeParse("4").success).toBe(false);
		});
	});

	describe("Number Type Constraints", () => {
		it("should handle number with exclusiveMinimum", () => {
			const schema = {
				type: "number",
				exclusiveMinimum: 0,
			};

			const zodSchema = jsonSchemaToZod(schema);

			expect(zodSchema.safeParse(0.1).success).toBe(true);
			expect(zodSchema.safeParse(0).success).toBe(false);
		});

		it("should handle number with exclusiveMaximum", () => {
			const schema = {
				type: "number",
				exclusiveMaximum: 10,
			};

			const zodSchema = jsonSchemaToZod(schema);

			expect(zodSchema.safeParse(9.99).success).toBe(true);
			expect(zodSchema.safeParse(10).success).toBe(false);
		});

		it("should handle number with multipleOf", () => {
			const schema = {
				type: "number",
				multipleOf: 0.5,
			};

			const zodSchema = jsonSchemaToZod(schema);

			expect(zodSchema.safeParse(1.5).success).toBe(true);
			expect(zodSchema.safeParse(2.0).success).toBe(true);
			expect(zodSchema.safeParse(1.3).success).toBe(false);
		});
	});

	describe("Array Constraints", () => {
		it("should handle array with minItems", () => {
			const schema = {
				type: "array",
				items: { type: "string" },
				minItems: 2,
			};

			const zodSchema = jsonSchemaToZod(schema);

			expect(zodSchema.safeParse(["a", "b"]).success).toBe(true);
			expect(zodSchema.safeParse(["a", "b", "c"]).success).toBe(true);
			expect(zodSchema.safeParse(["a"]).success).toBe(false);
		});

		it("should handle array with maxItems", () => {
			const schema = {
				type: "array",
				items: { type: "string" },
				maxItems: 3,
			};

			const zodSchema = jsonSchemaToZod(schema);

			expect(zodSchema.safeParse(["a"]).success).toBe(true);
			expect(zodSchema.safeParse(["a", "b", "c"]).success).toBe(true);
			expect(zodSchema.safeParse(["a", "b", "c", "d"]).success).toBe(false);
		});

		it("should handle array with both minItems and maxItems", () => {
			const schema = {
				type: "array",
				items: { type: "number" },
				minItems: 1,
				maxItems: 3,
			};

			const zodSchema = jsonSchemaToZod(schema);

			expect(zodSchema.safeParse([1]).success).toBe(true);
			expect(zodSchema.safeParse([1, 2, 3]).success).toBe(true);
			expect(zodSchema.safeParse([]).success).toBe(false);
			expect(zodSchema.safeParse([1, 2, 3, 4]).success).toBe(false);
		});
	});

	describe("Object Additional Properties", () => {
		it("should allow additional properties when additionalProperties is true", () => {
			const schema = {
				type: "object",
				properties: {
					name: { type: "string" },
				},
				additionalProperties: true,
			};

			const zodSchema = jsonSchemaToZod(schema);

			expect(zodSchema.safeParse({ name: "John", age: 30 }).success).toBe(true);
		});

		it("should disallow additional properties when additionalProperties is false", () => {
			const schema = {
				type: "object",
				properties: {
					name: { type: "string" },
				},
				additionalProperties: false,
			};

			const zodSchema = jsonSchemaToZod(schema);

			expect(zodSchema.safeParse({ name: "John" }).success).toBe(true);
			expect(zodSchema.safeParse({ name: "John", age: 30 }).success).toBe(
				false,
			);
		});

		it("should handle additionalProperties with schema definition", () => {
			const schema = {
				type: "object",
				properties: {
					name: { type: "string" },
				},
				additionalProperties: {
					type: "number",
				},
			};

			const zodSchema = jsonSchemaToZod(schema);

			// When additionalProperties is an object schema, it uses passthrough
			// which allows additional properties but doesn't validate their types
			expect(zodSchema.safeParse({ name: "John", age: 30 }).success).toBe(true);
			expect(zodSchema.safeParse({ name: "John", age: "thirty" }).success).toBe(
				true,
			);
		});
	});
});
