/**
 * Tests for Error Formatter
 */

import { describe, it, expect } from "vitest";
import { ErrorFormatter } from "../../../src/utils/error-formatter.js";
import {
	mockValidationErrors,
	mockValidationWarnings,
} from "../../helpers/mock-data.js";
import type {
	ValidationError,
	ValidationWarning,
} from "../../../src/types/mcp-tools.js";

describe("ErrorFormatter", () => {
	describe("formatErrors()", () => {
		it("should format empty error array", () => {
			const result = ErrorFormatter.formatErrors([]);
			expect(result).toBe("No errors");
		});

		it("should format single error", () => {
			const errors: ValidationError[] = [mockValidationErrors.requiredField];
			const result = ErrorFormatter.formatErrors(errors);

			expect(result).toContain("1 validation error");
			expect(result).toContain("Field: email");
			expect(result).toContain("Error: Missing required field: email");
			expect(result).toContain("Fix: Add the required field");
		});

		it("should format multiple errors", () => {
			const errors: ValidationError[] = [
				mockValidationErrors.requiredField,
				mockValidationErrors.typeError,
			];
			const result = ErrorFormatter.formatErrors(errors);

			expect(result).toContain("2 validation errors");
			expect(result).toContain("1. Field: email");
			expect(result).toContain("2. Field: age");
		});

		it("should include expected values when present", () => {
			const errors: ValidationError[] = [mockValidationErrors.typeError];
			const result = ErrorFormatter.formatErrors(errors);

			expect(result).toContain('Expected: "integer"');
		});

		it("should include received values when present", () => {
			const error: ValidationError = {
				...mockValidationErrors.typeError,
				received: "thirty-five",
			};
			const result = ErrorFormatter.formatErrors([error]);

			expect(result).toContain('Received: "thirty-five"');
		});

		it("should include fix suggestions when present", () => {
			const errors: ValidationError[] = [mockValidationErrors.formatError];
			const result = ErrorFormatter.formatErrors(errors);

			expect(result).toContain("Fix:");
			expect(result).toContain("email");
		});

		it("should format enum errors", () => {
			const errors: ValidationError[] = [mockValidationErrors.enumError];
			const result = ErrorFormatter.formatErrors(errors);

			expect(result).toContain("Field: status");
			expect(result).toContain("active, inactive, pending");
		});

		it("should format pattern errors", () => {
			const errors: ValidationError[] = [mockValidationErrors.patternError];
			const result = ErrorFormatter.formatErrors(errors);

			expect(result).toContain("Field: ssn");
			expect(result).toContain("pattern");
			expect(result).toContain("XXX-XX-XXXX");
		});
	});

	describe("formatWarnings()", () => {
		it("should return empty string for no warnings", () => {
			const result = ErrorFormatter.formatWarnings([]);
			expect(result).toBe("");
		});

		it("should format single warning", () => {
			const warnings: ValidationWarning[] = [
				mockValidationWarnings.optionalField,
			];
			const result = ErrorFormatter.formatWarnings(warnings);

			expect(result).toContain("1 warning");
			expect(result).toContain("Field: phone");
			expect(result).toContain("Optional field");
		});

		it("should format multiple warnings", () => {
			const warnings: ValidationWarning[] = [
				mockValidationWarnings.optionalField,
				{
					field: "address",
					message: 'Optional field "address" is not provided',
					type: "optional",
					suggestion: "Address helps with delivery",
				},
			];
			const result = ErrorFormatter.formatWarnings(warnings);

			expect(result).toContain("2 warnings");
			expect(result).toContain("1. Field: phone");
			expect(result).toContain("2. Field: address");
		});

		it("should include suggestions when present", () => {
			const warnings: ValidationWarning[] = [
				mockValidationWarnings.optionalField,
			];
			const result = ErrorFormatter.formatWarnings(warnings);

			expect(result).toContain("Suggestion:");
			expect(result).toContain("Phone number");
		});
	});

	describe("formatValidationResult()", () => {
		it("should format valid result without warnings", () => {
			const result = ErrorFormatter.formatValidationResult({
				valid: true,
				errors: [],
			});

			expect(result).toContain("✓");
			expect(result).toContain("Payload is valid");
			expect(result).not.toContain("warning");
		});

		it("should format valid result with warnings", () => {
			const validationResult = {
				valid: true,
				errors: [],
				warnings: [mockValidationWarnings.optionalField],
			};
			const result = ErrorFormatter.formatValidationResult(validationResult);

			expect(result).toContain("✓");
			expect(result).toContain("Payload is valid");
			expect(result).toContain("warning");
			expect(result).toContain("phone");
		});

		it("should format invalid result", () => {
			const validationResult = {
				valid: false,
				errors: [
					mockValidationErrors.requiredField,
					mockValidationErrors.typeError,
				],
			};
			const result = ErrorFormatter.formatValidationResult(validationResult);

			expect(result).toContain("✗");
			expect(result).toContain("validation failed");
			expect(result).toContain("email");
			expect(result).toContain("age");
		});

		it("should format invalid result with single error", () => {
			const validationResult = {
				valid: false,
				errors: [mockValidationErrors.requiredField],
			};
			const result = ErrorFormatter.formatValidationResult(validationResult);

			expect(result).toContain("✗");
			expect(result).toContain("1 validation error");
			expect(result).not.toContain("2 validation errors");
		});
	});

	describe("Edge Cases", () => {
		it("should handle errors with minimal information", () => {
			const minimalError: ValidationError = {
				field: "test",
				message: "Something went wrong",
				type: "custom",
				path: "/test",
			};
			const result = ErrorFormatter.formatErrors([minimalError]);

			expect(result).toContain("Field: test");
			expect(result).toContain("Something went wrong");
			expect(result).not.toContain("Expected:");
			expect(result).not.toContain("Received:");
			expect(result).not.toContain("Fix:");
		});

		it("should handle warnings with minimal information", () => {
			const minimalWarning: ValidationWarning = {
				field: "test",
				message: "Warning message",
				type: "optional",
			};
			const result = ErrorFormatter.formatWarnings([minimalWarning]);

			expect(result).toContain("Field: test");
			expect(result).toContain("Warning message");
			expect(result).not.toContain("Suggestion:");
		});

		it("should handle long error messages", () => {
			const longError: ValidationError = {
				field: "verylongfieldnamethatexceedsnormalexpectations",
				message:
					"This is a very long error message that contains a lot of information about what went wrong and how to fix it",
				type: "custom",
				path: "/path/to/very/deeply/nested/field/in/object",
			};
			const result = ErrorFormatter.formatErrors([longError]);

			expect(result).toContain(longError.field);
			expect(result).toContain(longError.message);
		});

		it("should handle special characters in messages", () => {
			const specialError: ValidationError = {
				field: "data",
				message:
					"Invalid format: expected <type> but got 'value' with \"quotes\"",
				type: "custom",
				path: "/",
			};
			const result = ErrorFormatter.formatErrors([specialError]);

			expect(result).toContain(specialError.message);
		});

		it("should handle arrays as expected values", () => {
			const error: ValidationError = {
				field: "status",
				message: "Invalid enum",
				type: "enum",
				path: "/status",
				expected: ["option1", "option2", "option3"],
			};
			const result = ErrorFormatter.formatErrors([error]);

			expect(result).toContain("Expected:");
			expect(result).toContain("option1");
		});

		it("should handle numbers as expected/received values", () => {
			const error: ValidationError = {
				field: "age",
				message: "Too small",
				type: "minimum",
				path: "/age",
				expected: 18,
				received: 15,
			};
			const result = ErrorFormatter.formatErrors([error]);

			expect(result).toContain("Expected: 18");
			expect(result).toContain("Received: 15");
		});
	});
});
