/**
 * MCP Client Helper for Integration Tests
 *
 * Provides a TypeScript client for testing the MCP server via HTTP/SSE
 */

export interface MCPRequest {
	jsonrpc: "2.0";
	id: number;
	method: string;
	params?: Record<string, any>;
}

export interface MCPResponse {
	jsonrpc: "2.0";
	id: number;
	result?: any;
	error?: {
		code: number;
		message: string;
		data?: any;
	};
}

export interface MCPToolCallResult {
	content: Array<{
		type: string;
		text: string;
	}>;
	isError?: boolean;
}

export class MCPClient {
	private serverUrl: string;
	private sessionId: string | null = null;
	private requestId = 1;

	constructor(serverUrl = "http://localhost:8788/sse") {
		this.serverUrl = serverUrl;
	}

	/**
	 * Make an MCP request to the server
	 */
	async request(method: string, params: Record<string, any> = {}): Promise<MCPResponse> {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			"Accept": "application/json, text/event-stream",
		};

		if (this.sessionId) {
			headers["Mcp-Session-Id"] = this.sessionId;
		}

		const body: MCPRequest = {
			jsonrpc: "2.0",
			id: this.requestId++,
			method,
			params,
		};

		const response = await fetch(this.serverUrl, {
			method: "POST",
			headers,
			body: JSON.stringify(body),
		});

		// Capture session ID from response headers
		const mcpSessionHeader = response.headers.get("mcp-session-id");
		if (mcpSessionHeader && !this.sessionId) {
			this.sessionId = mcpSessionHeader;
		}

		const text = await response.text();

		// Handle SSE format
		if (text.startsWith("event:")) {
			return this.parseSSEResponse(text);
		}

		// Handle regular JSON
		return JSON.parse(text);
	}

	/**
	 * Parse SSE (Server-Sent Events) response format
	 */
	private parseSSEResponse(text: string): MCPResponse {
		const lines = text.split("\n");
		const dataLine = lines.find((l) => l.startsWith("data: "));

		if (dataLine) {
			const jsonData = dataLine.substring(6); // Remove 'data: ' prefix
			return JSON.parse(jsonData);
		}

		throw new Error("Invalid SSE response format");
	}

	/**
	 * Call an MCP tool
	 */
	async callTool(toolName: string, args: Record<string, any> = {}): Promise<MCPToolCallResult> {
		const response = await this.request("tools/call", {
			name: toolName,
			arguments: args,
		});

		if (response.error) {
			throw new Error(`Tool call failed: ${response.error.message}`);
		}

		if (!response.result || !response.result.content) {
			throw new Error("Invalid tool call response: missing content");
		}

		return response.result;
	}

	/**
	 * Get text content from tool call result
	 */
	getTextContent(result: MCPToolCallResult): string {
		if (!result.content || result.content.length === 0) {
			return "";
		}

		return result.content[0].text || "";
	}

	/**
	 * List available tools
	 */
	async listTools(): Promise<any> {
		const response = await this.request("tools/list");

		if (response.error) {
			throw new Error(`Failed to list tools: ${response.error.message}`);
		}

		return response.result;
	}

	/**
	 * Initialize the MCP session
	 */
	async initialize(params = {}): Promise<any> {
		const response = await this.request("initialize", {
			protocolVersion: "2024-11-05",
			capabilities: {},
			clientInfo: {
				name: "vitest-integration-test",
				version: "1.0.0",
			},
			...params,
		});

		if (response.error) {
			throw new Error(`Initialization failed: ${response.error.message}`);
		}

		return response.result;
	}

	/**
	 * Check if server is available
	 */
	async isServerAvailable(): Promise<boolean> {
		try {
			// Try to make a simple request to the MCP endpoint
			const response = await fetch(this.serverUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Accept": "application/json, text/event-stream",
				},
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: 1,
					method: "initialize",
					params: {
						protocolVersion: "2024-11-05",
						capabilities: {},
						clientInfo: {
							name: "health-check",
							version: "1.0.0",
						},
					},
				}),
			});
			return response.ok || response.status < 500;
		} catch {
			return false;
		}
	}

	/**
	 * Get current session ID
	 */
	getSessionId(): string | null {
		return this.sessionId;
	}

	/**
	 * Reset session (for testing)
	 */
	resetSession(): void {
		this.sessionId = null;
		this.requestId = 1;
	}
}

/**
 * Create a new MCP client instance
 */
export function createMCPClient(serverUrl?: string): MCPClient {
	return new MCPClient(serverUrl);
}
