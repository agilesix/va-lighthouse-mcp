/**
 * JSON Schema validation using Zod
 * Converts JSON Schema to Zod schemas for validation
 */

import { z } from "zod";
import {
	jsonSchemaToZod,
	getZodErrorMessage,
} from "../utils/json-schema-to-zod.js";
import type {
	ValidationResult,
	ValidationError,
	ValidationWarning,
} from "../types/mcp-tools.js";

export class Validator {
	/**
	 * Validate a payload against a JSON schema
	 */
	static validate(payload: any, schema: any): ValidationResult {
		// Convert JSON Schema to Zod schema
		let zodSchema: z.ZodTypeAny;
		try {
			zodSchema = jsonSchemaToZod(schema);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);

			return {
				valid: false,
				errors: [
					{
						field: "schema",
						message: `Invalid schema: ${errorMessage}`,
						type: "custom",
						path: "$",
					},
				],
				summary: "Schema validation failed - invalid schema provided",
			};
		}

		// Validate payload
		const result = zodSchema.safeParse(payload);

		if (result.success) {
			// Check for optional fields and provide suggestions
			const warnings = this.generateWarnings(payload, schema);

			return {
				valid: true,
				errors: [],
				warnings,
				summary: "Payload is valid",
			};
		}

		// Format errors
		const errors = this.formatErrors(result.error.issues, schema);
		const summary = `Validation failed with ${errors.length} error${errors.length === 1 ? "" : "s"}`;

		return {
			valid: false,
			errors,
			summary,
		};
	}

	/**
	 * Format Zod errors into our ValidationError format
	 */
	private static formatErrors(
		zodIssues: z.ZodIssue[],
		schema: any,
	): ValidationError[] {
		return zodIssues.map((issue) => {
			// Convert path array to dot notation
			const field = issue.path.length > 0 ? issue.path.join(".") : "root";

			// Get the schema for this field to check for integer type
			const fieldSchema = this.getFieldSchema(schema, issue.path);

			let message = getZodErrorMessage(issue, schema);
			let type: ValidationError["type"] = "custom";
			let expected: any = undefined;
			let received: any = undefined;
			let fixSuggestion: string | undefined = undefined;

			// Map Zod error codes to our ValidationError types
			switch (issue.code) {
				case "invalid_type":
					if (
						issue.received === "undefined" &&
						issue.expected !== "undefined"
					) {
						// This is likely a missing required field
						type = "required";
						message = `Missing required field: ${field}`;
						fixSuggestion = `Add the required field "${field}" to the payload`;
					} else {
						type = "type";
						// Check if the field is actually an integer type
						if (
							issue.expected === "number" &&
							fieldSchema?.type === "integer"
						) {
							expected = "integer";
							message = "Invalid type: expected integer";
							fixSuggestion = "Change the field type to integer";
						} else {
							expected = issue.expected;
							received = issue.received;
							fixSuggestion = `Change the field type to ${issue.expected}`;
						}
					}
					break;

				case "invalid_string":
					if (issue.validation === "email") {
						type = "format";
						expected = "email";
						fixSuggestion = this.getFormatSuggestion("email");
					} else if (issue.validation === "url") {
						type = "format";
						expected = "uri";
						fixSuggestion = this.getFormatSuggestion("uri");
					} else if (issue.validation === "regex") {
						type = "pattern";
						expected = issue.validation;
						// Try to extract pattern from message
						fixSuggestion = this.getPatternSuggestionFromMessage(issue.message);
					} else {
						type = "format";
						expected = issue.validation;
						fixSuggestion = `Provide a valid ${issue.validation} format`;
					}
					break;

				case "too_small":
					if (issue.type === "string") {
						type = "minLength";
						expected = issue.minimum;
					} else if (issue.type === "number") {
						type = "minimum";
						expected = issue.minimum;
					} else if (issue.type === "array") {
						type = "minLength";
						expected = issue.minimum;
					}
					break;

				case "too_big":
					if (issue.type === "string") {
						type = "maxLength";
						expected = issue.maximum;
					} else if (issue.type === "number") {
						type = "maximum";
						expected = issue.maximum;
					} else if (issue.type === "array") {
						type = "maxLength";
						expected = issue.maximum;
					}
					break;

				case "invalid_enum_value":
					type = "enum";
					expected = issue.options;
					received = (issue as any).received;
					fixSuggestion = `Change the value to one of the allowed enum values: ${issue.options.join(", ")}`;
					message = `Invalid enum value. Allowed values: ${issue.options.join(", ")}`;
					break;

				case "custom":
					// Handle custom validators (formats)
					if (issue.message.includes("format")) {
						type = "format";
						// Extract format from message if possible
						const formatMatch = issue.message.match(/Invalid (\w+) format/);
						if (formatMatch) {
							expected = formatMatch[1];
							fixSuggestion = this.getFormatSuggestion(formatMatch[1]);
						}
					} else if (issue.message.includes("pattern")) {
						type = "pattern";
						fixSuggestion = this.getPatternSuggestionFromMessage(issue.message);
					}
					break;
			}

			return {
				field,
				message,
				type,
				path: "/" + issue.path.join("/"),
				expected,
				received,
				fixSuggestion,
			};
		});
	}

	/**
	 * Generate warnings for optional fields and best practices
	 */
	private static generateWarnings(
		payload: any,
		schema: any,
	): ValidationWarning[] {
		const warnings: ValidationWarning[] = [];

		// Check for optional fields that are commonly needed
		if (schema.properties) {
			const required = schema.required || [];

			for (const prop in schema.properties) {
				if (!required.includes(prop) && !payload[prop]) {
					const propSchema = schema.properties[prop];

					if (
						propSchema.description?.includes("recommended") ||
						propSchema.description?.includes("should")
					) {
						warnings.push({
							field: prop,
							message: `Optional field "${prop}" is not provided but may be useful`,
							type: "optional",
							suggestion: propSchema.description,
						});
					}
				}
			}
		}

		return warnings;
	}

	/**
	 * Get format-specific suggestions
	 */
	private static getFormatSuggestion(format: string): string {
		switch (format) {
			case "email":
				return 'Provide a valid email address (e.g., "user@example.com")';
			case "date":
				return 'Provide a valid date in ISO format (e.g., "2024-01-15")';
			case "date-time":
				return 'Provide a valid date-time in ISO format (e.g., "2024-01-15T10:30:00Z")';
			case "uri":
			case "url":
				return 'Provide a valid URI (e.g., "https://example.com")';
			case "uuid":
				return 'Provide a valid UUID (e.g., "123e4567-e89b-12d3-a456-426614174000")';
			case "ssn":
				return 'Provide a valid SSN in format "XXX-XX-XXXX"';
			case "phone":
				return 'Provide a valid phone number in format "XXX-XXX-XXXX"';
			default:
				return `Provide a valid ${format} format`;
		}
	}

	/**
	 * Get pattern-specific suggestions from error message
	 */
	private static getPatternSuggestionFromMessage(message: string): string {
		if (message.includes("\\d{3}-\\d{2}-\\d{4}")) {
			return 'Use format "XXX-XX-XXXX" (e.g., "123-45-6789")';
		}

		if (message.includes("\\d{3}-\\d{3}-\\d{4}")) {
			return 'Use format "XXX-XXX-XXXX" (e.g., "555-123-4567")';
		}

		// Extract pattern if present in message
		const patternMatch = message.match(/pattern: (.+)/);
		if (patternMatch) {
			return `Ensure the value matches the pattern: ${patternMatch[1]}`;
		}

		return "Ensure the value matches the required pattern";
	}

	/**
	 * Get pattern-specific suggestions
	 */
	private static getPatternSuggestion(pattern: string): string {
		if (pattern.includes("\\d{3}-\\d{2}-\\d{4}")) {
			return 'Use format "XXX-XX-XXXX" (e.g., "123-45-6789")';
		}

		if (pattern.includes("\\d{3}-\\d{3}-\\d{4}")) {
			return 'Use format "XXX-XXX-XXXX" (e.g., "555-123-4567")';
		}

		return `Ensure the value matches the pattern: ${pattern}`;
	}

	/**
	 * Get the schema for a specific field path
	 */
	private static getFieldSchema(schema: any, path: (string | number)[]): any {
		if (path.length === 0) {
			return schema;
		}

		let current = schema;

		for (const segment of path) {
			if (
				current.type === "object" &&
				current.properties &&
				current.properties[segment]
			) {
				current = current.properties[segment];
			} else if (current.type === "array" && current.items) {
				current = current.items;
			} else {
				return undefined;
			}
		}

		return current;
	}
}
