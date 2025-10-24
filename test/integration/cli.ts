#!/usr/bin/env tsx
/**
 * Integration Test CLI
 *
 * Command-line interface for running MCP integration tests.
 *
 * Usage:
 *   npm run integration:run [options] [spec-files...]
 *   npm run integration:list
 *   npm run integration:generate <tool-name> [options]
 */

import { glob } from "glob";
import { basename } from "node:path";
import { testConfig } from "./config.ts";
import { loadTestSpec } from "./harness/spec-loader.ts";
import { TestRunner } from "./harness/runner.ts";
import { printConsole, printSimple } from "./harness/reporters/console.ts";
import { printJSON } from "./harness/reporters/json.ts";

const args = process.argv.slice(2);
const command = args[0] || "run";

/**
 * Run command - execute test specifications
 */
async function runCommand(): Promise<void> {
	const flags = {
		json: args.includes("--json"),
		simple: args.includes("--simple"),
		verbose: args.includes("--verbose"),
	};

	// Get spec files to run
	const specArgs = args.filter((arg) => !arg.startsWith("--") && arg !== "run");

	let specFiles: string[];

	if (specArgs.length > 0) {
		// Run specific specs provided as arguments
		specFiles = [];
		for (const pattern of specArgs) {
			const matches = await glob(pattern, {
				cwd: process.cwd(),
				absolute: true,
			});
			specFiles.push(...matches);
		}
	} else {
		// Run all specs in specs directory
		specFiles = await glob("test/integration/specs/**/*.{yaml,yml,json}", {
			cwd: process.cwd(),
			absolute: true,
		});
	}

	if (specFiles.length === 0) {
		console.error("No test specs found");
		process.exit(1);
	}

	// Load all specs
	const specs = [];
	for (const file of specFiles) {
		try {
			const spec = await loadTestSpec(file);
			specs.push(spec);
		} catch (error) {
			console.error(
				`Error loading ${file}:`,
				error instanceof Error ? error.message : error,
			);
			process.exit(1);
		}
	}

	// Create and configure runner
	const client = testConfig.clientFactory(testConfig.serverUrl);
	const runner = new TestRunner(client);

	try {
		// Connect to server
		if (flags.verbose) {
			console.log(`Connecting to ${testConfig.serverUrl}...`);
		}

		await runner.connect();

		// Run tests
		const results = await runner.runTests(specs, testConfig.serverUrl);

		// Disconnect
		await runner.disconnect();

		// Output results
		if (flags.json) {
			printJSON(results);
		} else if (flags.simple) {
			printSimple(results);
		} else {
			printConsole(results);
		}

		// Exit with appropriate code
		process.exit(results.summary.failed > 0 ? 1 : 0);
	} catch (error) {
		console.error(
			"Error running tests:",
			error instanceof Error ? error.message : error,
		);
		await runner.disconnect();
		process.exit(1);
	}
}

/**
 * List command - list all available test specs
 */
async function listCommand(): Promise<void> {
	const specFiles = await glob("test/integration/specs/**/*.{yaml,yml,json}", {
		cwd: process.cwd(),
		absolute: false,
	});

	if (specFiles.length === 0) {
		console.log("No test specs found");
		return;
	}

	console.log(`Found ${specFiles.length} test spec(s):\n`);

	for (const file of specFiles) {
		try {
			const spec = await loadTestSpec(file);
			console.log(`  ${file}`);
			console.log(`    Name: ${spec.name}`);
			if (spec.description) {
				console.log(`    Description: ${spec.description}`);
			}
			console.log(`    Tool: ${spec.tool}`);
			console.log(`    Assertions: ${spec.assertions.length}`);
			console.log("");
		} catch (error) {
			console.log(`  ${file} (ERROR: invalid spec)`);
			console.log("");
		}
	}
}

/**
 * Generate command - generate a test template
 */
async function generateCommand(): Promise<void> {
	const toolName = args[1];

	if (!toolName) {
		console.error(
			"Usage: npm run integration:generate <tool-name> [--args '<json>'] [--output <file>]",
		);
		process.exit(1);
	}

	// Parse options
	const argsIndex = args.indexOf("--args");
	const outputIndex = args.indexOf("--output");
	const descIndex = args.indexOf("--description");

	const toolArgs =
		argsIndex >= 0 && args[argsIndex + 1]
			? JSON.parse(args[argsIndex + 1])
			: {};

	const outputFile =
		outputIndex >= 0 && args[outputIndex + 1]
			? args[outputIndex + 1]
			: `test/integration/specs/${toolName}.yaml`;

	const description =
		descIndex >= 0 && args[descIndex + 1]
			? args[descIndex + 1]
			: `Test for ${toolName}`;

	// Generate template
	const { serializeTestSpecToYAML } = await import("./harness/spec-loader.ts");

	const template = {
		name: `Test ${toolName}`,
		description,
		tool: toolName,
		arguments: toolArgs,
		assertions: [
			{ type: "success" as const },
			{ type: "response_time_ms" as const, max: 5000 },
		],
	};

	const yaml = serializeTestSpecToYAML(template);

	// Output
	if (args.includes("--stdout")) {
		console.log(yaml);
	} else {
		const { writeFile, mkdir } = await import("node:fs/promises");
		const { dirname } = await import("node:path");

		await mkdir(dirname(outputFile), { recursive: true });
		await writeFile(outputFile, yaml, "utf-8");

		console.log(`Generated test spec: ${outputFile}`);
		console.log("");
		console.log("Edit the file to add specific assertions, then run:");
		console.log(`  npm run integration:run -- ${outputFile}`);
	}
}

/**
 * Help command
 */
function helpCommand(): void {
	console.log(`
MCP Integration Test CLI

Usage:
  npm run integration:run [options] [spec-files...]
  npm run integration:list
  npm run integration:generate <tool-name> [options]

Commands:
  run        Run test specifications (default)
  list       List all available test specs
  generate   Generate a test template
  help       Show this help message

Options for 'run':
  --json       Output results as JSON
  --simple     Output simple pass/fail message
  --verbose    Show verbose output

Options for 'generate':
  --args <json>          Tool arguments as JSON string
  --description <text>   Test description
  --output <file>        Output file path
  --stdout               Print to stdout instead of file

Examples:
  # Run all tests
  npm run integration:run

  # Run specific test
  npm run integration:run -- test/integration/specs/list-apis.yaml

  # Run tests with JSON output
  npm run integration:run -- --json

  # List all tests
  npm run integration:list

  # Generate test template
  npm run integration:generate -- list_lighthouse_apis --args '{"includeDeprecated": false}'
`);
}

// Main CLI router
async function main() {
	switch (command) {
		case "run":
			await runCommand();
			break;
		case "list":
			await listCommand();
			break;
		case "generate":
			await generateCommand();
			break;
		case "help":
		case "--help":
		case "-h":
			helpCommand();
			break;
		default:
			console.error(`Unknown command: ${command}`);
			helpCommand();
			process.exit(1);
	}
}

main().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
