/**
 * Tests for JSON Schema Validator
 */

import { describe, it, expect } from "vitest";
import { Validator } from "../../../src/services/validator.js";
import testSchemas from "../../fixtures/schemas/test-schemas.json";
import { validPayloads, invalidPayloads } from "../../helpers/mock-data.js";

describe("Validator", () => {
	describe("Valid Payloads", () => {
		it("should validate a simple string", () => {
			const result = Validator.validate(validPayloads.simpleString, testSchemas.simpleString);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should validate an object with required email", () => {
			const result = Validator.validate(validPayloads.email, testSchemas.requiredEmail);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should validate a complete person schema", () => {
			const result = Validator.validate(validPayloads.person, testSchemas.personSchema);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
			expect(result.summary).toBe("Payload is valid");
		});

		it("should validate an address schema", () => {
			const result = Validator.validate(validPayloads.address, testSchemas.addressSchema);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should validate an array", () => {
			const result = Validator.validate(["item1", "item2"], testSchemas.arraySchema);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should validate draft-04 schema", () => {
			const result = Validator.validate({ name: "test" }, testSchemas.draft04Schema);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});
	});

	describe("Invalid Payloads - Required Fields", () => {
		it("should detect missing required fields", () => {
			const result = Validator.validate(invalidPayloads.missingRequired, testSchemas.personSchema);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);

			// Check for missing lastName
			const lastNameError = result.errors.find((e) => e.message.includes("lastName"));
			expect(lastNameError).toBeDefined();
			expect(lastNameError?.type).toBe("required");
			expect(lastNameError?.fixSuggestion).toContain("lastName");
		});

		it("should detect missing required email", () => {
			const result = Validator.validate({}, testSchemas.requiredEmail);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);

			const emailError = result.errors.find((e) => e.field === "email");
			expect(emailError).toBeDefined();
			expect(emailError?.type).toBe("required");
			expect(emailError?.message).toContain("email");
		});
	});

	describe("Invalid Payloads - Type Errors", () => {
		it("should detect wrong type", () => {
			const result = Validator.validate(invalidPayloads.wrongType, testSchemas.personSchema);
			expect(result.valid).toBe(false);

			const ageError = result.errors.find((e) => e.field === "age");
			expect(ageError).toBeDefined();
			expect(ageError?.type).toBe("type");
			expect(ageError?.expected).toBe("integer");
			expect(ageError?.fixSuggestion).toContain("integer");
		});

		it("should detect when string is expected but number provided", () => {
			const schema = {
				type: "object",
				properties: {
					name: { type: "string" },
				},
				required: ["name"],
			};

			const result = Validator.validate({ name: 123 }, schema);
			expect(result.valid).toBe(false);

			const error = result.errors.find((e) => e.field === "name");
			expect(error).toBeDefined();
			expect(error?.type).toBe("type");
			expect(error?.expected).toBe("string");
		});
	});

	describe("Invalid Payloads - Format Errors", () => {
		it("should detect invalid email format", () => {
			const result = Validator.validate(invalidPayloads.invalidFormat, testSchemas.requiredEmail);
			expect(result.valid).toBe(false);

			const emailError = result.errors.find((e) => e.field === "email");
			expect(emailError).toBeDefined();
			expect(emailError?.type).toBe("format");
			expect(emailError?.expected).toBe("email");
			expect(emailError?.fixSuggestion).toContain("email");
		});

		it("should validate custom SSN format", () => {
			const schema = {
				type: "object",
				properties: {
					ssn: { type: "string", format: "ssn" },
				},
			};

			// Valid SSN
			let result = Validator.validate({ ssn: "123-45-6789" }, schema);
			expect(result.valid).toBe(true);

			// Invalid SSN
			result = Validator.validate({ ssn: "123456789" }, schema);
			expect(result.valid).toBe(false);
		});

		it("should validate custom phone format", () => {
			const schema = {
				type: "object",
				properties: {
					phone: { type: "string", format: "phone" },
				},
			};

			// Valid phone
			let result = Validator.validate({ phone: "555-123-4567" }, schema);
			expect(result.valid).toBe(true);

			// Invalid phone
			result = Validator.validate({ phone: "5551234567" }, schema);
			expect(result.valid).toBe(false);
		});

		it("should validate date format", () => {
			const schema = {
				type: "object",
				properties: {
					date: { type: "string", format: "date" },
				},
			};

			// Valid date
			let result = Validator.validate({ date: "2024-01-15" }, schema);
			expect(result.valid).toBe(true);

			// Invalid date
			result = Validator.validate({ date: "01/15/2024" }, schema);
			expect(result.valid).toBe(false);
		});

		it("should validate uri format", () => {
			const schema = {
				type: "object",
				properties: {
					url: { type: "string", format: "uri" },
				},
			};

			// Valid URI
			let result = Validator.validate({ url: "https://example.com" }, schema);
			expect(result.valid).toBe(true);

			// Invalid URI
			result = Validator.validate({ url: "not-a-url" }, schema);
			expect(result.valid).toBe(false);
		});
	});

	describe("Invalid Payloads - Pattern Errors", () => {
		it("should detect pattern mismatch", () => {
			const result = Validator.validate(invalidPayloads.invalidPattern, testSchemas.personSchema);
			expect(result.valid).toBe(false);

			const ssnError = result.errors.find((e) => e.field === "ssn");
			expect(ssnError).toBeDefined();
			expect(ssnError?.type).toBe("pattern");
			expect(ssnError?.fixSuggestion).toBeDefined();
		});

		it("should validate state pattern", () => {
			const validAddress = { ...validPayloads.address };
			const result = Validator.validate(validAddress, testSchemas.addressSchema);
			expect(result.valid).toBe(true);

			// Invalid state (lowercase)
			const invalidAddress = { ...validPayloads.address, state: "il" };
			const invalidResult = Validator.validate(invalidAddress, testSchemas.addressSchema);
			expect(invalidResult.valid).toBe(false);
		});
	});

	describe("Invalid Payloads - Enum Errors", () => {
		it("should detect invalid enum value", () => {
			const result = Validator.validate(invalidPayloads.invalidEnum, testSchemas.personSchema);
			expect(result.valid).toBe(false);

			const statusError = result.errors.find((e) => e.field === "status");
			expect(statusError).toBeDefined();
			expect(statusError?.type).toBe("enum");
			expect(statusError?.expected).toEqual(["active", "inactive", "pending"]);
			expect(statusError?.message).toContain("active, inactive, pending");
		});

		it("should accept valid enum values", () => {
			const testPayload = { ...validPayloads.person, status: "inactive" };
			const result = Validator.validate(testPayload, testSchemas.personSchema);
			expect(result.valid).toBe(true);
		});
	});

	describe("Invalid Payloads - Length Constraints", () => {
		it("should detect string too short", () => {
			const schema = {
				type: "object",
				properties: {
					name: { type: "string", minLength: 5 },
				},
			};

			const result = Validator.validate({ name: "Bob" }, schema);
			expect(result.valid).toBe(false);

			const error = result.errors.find((e) => e.field === "name");
			expect(error).toBeDefined();
			expect(error?.type).toBe("minLength");
			expect(error?.expected).toBe(5);
		});

		it("should detect string too long", () => {
			const schema = {
				type: "object",
				properties: {
					name: { type: "string", maxLength: 5 },
				},
			};

			const result = Validator.validate({ name: "Jonathan" }, schema);
			expect(result.valid).toBe(false);

			const error = result.errors.find((e) => e.field === "name");
			expect(error).toBeDefined();
			expect(error?.type).toBe("maxLength");
			expect(error?.expected).toBe(5);
		});
	});

	describe("Invalid Payloads - Number Constraints", () => {
		it("should detect number too small", () => {
			const schema = {
				type: "object",
				properties: {
					age: { type: "integer", minimum: 18 },
				},
			};

			const result = Validator.validate({ age: 15 }, schema);
			expect(result.valid).toBe(false);

			const error = result.errors.find((e) => e.field === "age");
			expect(error).toBeDefined();
			expect(error?.type).toBe("minimum");
			expect(error?.expected).toBe(18);
		});

		it("should detect number too large", () => {
			const schema = {
				type: "object",
				properties: {
					age: { type: "integer", maximum: 150 },
				},
			};

			const result = Validator.validate({ age: 200 }, schema);
			expect(result.valid).toBe(false);

			const error = result.errors.find((e) => e.field === "age");
			expect(error).toBeDefined();
			expect(error?.type).toBe("maximum");
			expect(error?.expected).toBe(150);
		});
	});

	describe("Warnings for Optional Fields", () => {
		it("should not generate warnings for optional fields by default", () => {
			const minimalPerson = {
				firstName: "John",
				lastName: "Doe",
				ssn: "123-45-6789",
			};

			const result = Validator.validate(minimalPerson, testSchemas.personSchema);
			expect(result.valid).toBe(true);
			// Optional fields without special description don't generate warnings
			expect(result.warnings || []).toHaveLength(0);
		});

		it("should generate warnings for recommended optional fields", () => {
			const schema = {
				type: "object",
				required: ["name"],
				properties: {
					name: { type: "string" },
					email: {
						type: "string",
						description: "Email is recommended for contact purposes",
					},
				},
			};

			const result = Validator.validate({ name: "John" }, schema);
			expect(result.valid).toBe(true);
			expect(result.warnings).toBeDefined();
			expect(result.warnings!.length).toBeGreaterThan(0);

			const emailWarning = result.warnings!.find((w) => w.field === "email");
			expect(emailWarning).toBeDefined();
			expect(emailWarning?.type).toBe("optional");
		});
	});

	describe("Error Formatting", () => {
		it("should provide fix suggestions for required fields", () => {
			const result = Validator.validate({}, testSchemas.requiredEmail);
			expect(result.valid).toBe(false);

			const error = result.errors[0];
			expect(error.fixSuggestion).toBeDefined();
			expect(error.fixSuggestion).toContain("email");
		});

		it("should provide fix suggestions for format errors", () => {
			const result = Validator.validate(
				{ email: "invalid" },
				testSchemas.requiredEmail
			);
			expect(result.valid).toBe(false);

			const error = result.errors[0];
			expect(error.fixSuggestion).toBeDefined();
			expect(error.fixSuggestion).toContain("valid email");
		});

		it("should provide fix suggestions for pattern errors", () => {
			const schema = {
				type: "object",
				properties: {
					ssn: {
						type: "string",
						pattern: "^\\d{3}-\\d{2}-\\d{4}$",
					},
				},
			};

			const result = Validator.validate({ ssn: "123456789" }, schema);
			expect(result.valid).toBe(false);

			const error = result.errors[0];
			expect(error.fixSuggestion).toBeDefined();
			expect(error.fixSuggestion).toContain("XXX-XX-XXXX");
		});
	});

	describe("Edge Cases", () => {
		it("should handle null payload", () => {
			const schema = { type: "null" };
			const result = Validator.validate(null, schema);
			expect(result.valid).toBe(true);
		});

		it("should handle empty object", () => {
			const schema = { type: "object" };
			const result = Validator.validate({}, schema);
			expect(result.valid).toBe(true);
		});

		it("should handle empty array", () => {
			const schema = { type: "array", items: { type: "string" } };
			const result = Validator.validate([], schema);
			expect(result.valid).toBe(true);
		});

		it("should handle boolean values", () => {
			const schema = { type: "boolean" };
			let result = Validator.validate(true, schema);
			expect(result.valid).toBe(true);

			result = Validator.validate(false, schema);
			expect(result.valid).toBe(true);
		});

		it("should handle nested objects", () => {
			const schema = {
				type: "object",
				required: ["name", "address"],
				properties: {
					name: { type: "string" },
					address: {
						type: "object",
						required: ["city"],
						properties: {
							city: { type: "string" },
							zip: { type: "string" },
						},
					},
				},
			};

			// Valid nested object
			let result = Validator.validate(
				{ name: "John", address: { city: "Springfield" } },
				schema
			);
			expect(result.valid).toBe(true);

			// Missing nested required field
			result = Validator.validate({ name: "John", address: {} }, schema);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it("should handle invalid schema gracefully", () => {
			const invalidSchema = {
				type: "object",
				properties: {
					// Invalid schema structure that might cause issues
					field: {
						$ref: "#/definitions/nonexistent",
					},
				},
			};

			const result = Validator.validate({ field: "value" }, invalidSchema);
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0].field).toBe("schema");
		});
	});

	describe("Multiple Errors", () => {
		it("should return all validation errors", () => {
			const result = Validator.validate({}, testSchemas.personSchema);
			expect(result.valid).toBe(false);
			// Should have errors for firstName, lastName, and ssn
			expect(result.errors.length).toBeGreaterThanOrEqual(3);
			expect(result.summary).toContain("error");
		});

		it("should return multiple format errors", () => {
			const schema = {
				type: "object",
				properties: {
					email: { type: "string", format: "email" },
					url: { type: "string", format: "uri" },
					date: { type: "string", format: "date" },
				},
			};

			const result = Validator.validate(
				{
					email: "not-email",
					url: "not-url",
					date: "not-date",
				},
				schema
			);

			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThanOrEqual(3);
		});
	});

	describe("Enum Validation", () => {
		it("should detect invalid enum values in simple schema", () => {
			const schema = {
				type: "object",
				properties: {
					type: {
						type: "string",
						enum: ["compensation", "pension", "survivor"],
					},
				},
				required: ["type"],
			};

			const result = Validator.validate({ type: "invalid_value" }, schema);
			expect(result.valid).toBe(false);

			const enumError = result.errors.find((e) => e.type === "enum");
			expect(enumError).toBeDefined();
			expect(enumError?.expected).toEqual(["compensation", "pension", "survivor"]);
		});

		it("should accept valid enum values", () => {
			const schema = {
				type: "object",
				properties: {
					type: {
						type: "string",
						enum: ["compensation", "pension", "survivor"],
					},
				},
				required: ["type"],
			};

			const result = Validator.validate({ type: "compensation" }, schema);
			expect(result.valid).toBe(true);
		});

		it("should detect invalid enum values in nested objects", () => {
			const schema = {
				type: "object",
				properties: {
					data: {
						type: "object",
						properties: {
							type: {
								type: "string",
								enum: ["compensation", "pension", "survivor"],
							},
						},
						required: ["type"],
					},
				},
				required: ["data"],
			};

			const result = Validator.validate({ data: { type: "invalid_type" } }, schema);
			expect(result.valid).toBe(false);

			const enumError = result.errors.find((e) => e.type === "enum");
			expect(enumError).toBeDefined();
			expect(enumError?.field).toContain("type");
		});
	});

	describe("JSON Payload Handling", () => {
		it("should validate object payloads directly", () => {
			const schema = {
				type: "object",
				properties: {
					name: { type: "string" },
					age: { type: "integer" },
				},
				required: ["name"],
			};

			const payload = { name: "John", age: 30 };
			const result = Validator.validate(payload, schema);

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should handle object with nested properties", () => {
			const schema = {
				type: "object",
				properties: {
					data: {
						type: "object",
						properties: {
							type: { type: "string" },
						},
						required: ["type"],
					},
				},
				required: ["data"],
			};

			const payload = { data: { type: "intent_to_file" } };
			const result = Validator.validate(payload, schema);

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should detect invalid nested object structure", () => {
			const schema = {
				type: "object",
				properties: {
					data: {
						type: "object",
						properties: {
							type: { type: "string" },
						},
						required: ["type"],
					},
				},
				required: ["data"],
			};

			const payload = { data: {} }; // Missing required 'type'
			const result = Validator.validate(payload, schema);

			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
			const typeError = result.errors.find((e) => e.field.includes("type"));
			expect(typeError).toBeDefined();
		});

		it("should validate complex VA API payload structure", () => {
			const schema = {
				type: "object",
				properties: {
					data: {
						type: "object",
						properties: {
							type: {
								type: "string",
								enum: ["compensation", "pension", "survivor"],
							},
							attributes: {
								type: "object",
								properties: {
									claimDate: { type: "string", format: "date" },
								},
							},
						},
						required: ["type"],
					},
				},
				required: ["data"],
			};

			const validPayload = {
				data: {
					type: "compensation",
					attributes: {
						claimDate: "2024-01-15",
					},
				},
			};

			const result = Validator.validate(validPayload, schema);
			expect(result.valid).toBe(true);
		});

		it("should detect invalid enum value in nested structure", () => {
			const schema = {
				type: "object",
				properties: {
					data: {
						type: "object",
						properties: {
							type: {
								type: "string",
								enum: ["compensation", "pension", "survivor"],
							},
						},
						required: ["type"],
					},
				},
				required: ["data"],
			};

			const invalidPayload = {
				data: {
					type: "invalid_type",
				},
			};

			const result = Validator.validate(invalidPayload, schema);
			expect(result.valid).toBe(false);
			const enumError = result.errors.find((e) => e.type === "enum");
			expect(enumError).toBeDefined();
			expect(enumError?.expected).toContain("compensation");
		});
	});
});
