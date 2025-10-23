declare module "cloudflare:test" {
	// ProvidedEnv controls the type of `import("cloudflare:test").env`
	interface ProvidedEnv extends Env {
		// Add any test-specific bindings here
		MCP_OBJECT: DurableObjectNamespace;
	}
}
