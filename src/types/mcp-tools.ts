/**
 * MCP tool response types
 */

export interface ValidationError {
	field: string;
	message: string;
	type: "required" | "type" | "format" | "pattern" | "enum" | "minLength" | "maxLength" | "minimum" | "maximum" | "custom";
	path: string;
	expected?: any;
	received?: any;
	fixSuggestion?: string;
}

export interface ValidationWarning {
	field: string;
	message: string;
	type: "optional" | "best-practice" | "deprecated";
	suggestion?: string;
}

export interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
	warnings?: ValidationWarning[];
	summary: string;
}

export interface EndpointInfo {
	path: string;
	method: string;
	operationId?: string;
	summary?: string;
	description?: string;
	tags?: string[];
	deprecated?: boolean;
}

export interface EndpointDetails extends EndpointInfo {
	parameters?: Array<{
		name: string;
		in: "query" | "header" | "path" | "cookie";
		required?: boolean;
		description?: string;
		schema: any;
		example?: any;
	}>;
	requestBody?: {
		required?: boolean;
		description?: string;
		contentType: string;
		schema: any;
		example?: any;
	};
	responses: Record<string, {
		description: string;
		contentType?: string;
		schema?: any;
		example?: any;
	}>;
	security?: Array<Record<string, string[]>>;
}

export interface ApiSummary {
	title: string;
	description?: string;
	version: string;
	baseUrl: string;
	authMethods?: string[];
	tags?: Array<{
		name: string;
		description?: string;
		endpointCount: number;
	}>;
	totalEndpoints: number;
	contact?: {
		name?: string;
		email?: string;
		url?: string;
	};
}

export interface SchemaInfo {
	name: string;
	type?: string;
	description?: string;
	properties?: string[];
	required?: string[];
	example?: any;
}

export interface VersionComparison {
	apiId: string;
	version1: string;
	version2: string;
	changes: {
		endpointsAdded: string[];
		endpointsRemoved: string[];
		endpointsModified: Array<{
			path: string;
			method: string;
			changes: string[];
		}>;
		schemasAdded: string[];
		schemasRemoved: string[];
		schemasModified: string[];
	};
	summary: string;
}
