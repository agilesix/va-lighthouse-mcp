/**
 * Integration Test Configuration
 *
 * Project-specific configuration for the MCP test harness.
 *
 * Design: Project integration point
 */

import type { TestHarnessConfig } from "./harness/types/config.ts";
import { mergeConfig } from "./harness/types/config.ts";
import { MCPClientAdapter } from "./adapters/client-adapter.ts";

/**
 * Default server URL (can be overridden via environment variable)
 * Using /mcp endpoint instead of /sse for simpler request/response
 */
const DEFAULT_SERVER_URL =
	process.env.MCP_SERVER_URL || "http://localhost:8788/mcp";

/**
 * Test harness configuration for VA Lighthouse MCP Server
 */
export const testConfig: TestHarnessConfig = mergeConfig({
	serverUrl: DEFAULT_SERVER_URL,
	timeout: 5000,
	retries: 0,
	snapshotDir: "./test/integration/snapshots",
	contractDir: "./test/integration/contracts",

	// Factory function that creates the MCP client adapter
	clientFactory: (serverUrl: string) => new MCPClientAdapter(serverUrl),
});

/**
 * Create a configured test runner
 *
 * This is a convenience function for the project's specific setup.
 */
export async function createTestRunner() {
	const { TestRunner } = await import("./harness/runner.ts");
	const client = testConfig.clientFactory(testConfig.serverUrl);
	return new TestRunner(client);
}
