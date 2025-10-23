import { defineConfig } from "vitest/config";

/**
 * Vitest configuration for integration tests
 *
 * Integration tests run against a live MCP server instance
 * and test the complete end-to-end tool workflow.
 *
 * Prerequisites:
 * - Server must be running: npm run dev
 * - Server must be available on http://localhost:8788
 */
export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["test/integration/**/*.test.ts"],
		testTimeout: 30000, // 30s for network requests
		hookTimeout: 10000, // 10s for setup/teardown
		pool: "threads",
		poolOptions: {
			threads: {
				singleThread: false,
			},
		},
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			include: ["test/integration/**/*.ts"],
			exclude: [
				"**/node_modules/**",
				"**/test/**",
				"**/*.d.ts",
			],
		},
		reporters: ["default", "verbose"],
	},
});
