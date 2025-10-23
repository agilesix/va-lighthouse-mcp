/**
 * Test utilities and helper functions
 */

/**
 * Wait for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a spy function that tracks calls
 */
export function createSpy<T extends (...args: any[]) => any>(): {
	fn: T;
	calls: Array<Parameters<T>>;
	results: Array<ReturnType<T>>;
	reset: () => void;
} {
	const calls: Array<Parameters<T>> = [];
	const results: Array<ReturnType<T>> = [];

	const fn = ((...args: Parameters<T>): ReturnType<T> => {
		calls.push(args);
		return undefined as ReturnType<T>;
	}) as T;

	return {
		fn,
		calls,
		results,
		reset: () => {
			calls.length = 0;
			results.length = 0;
		},
	};
}

/**
 * Assert that a value is defined (not null or undefined)
 */
export function assertDefined<T>(value: T | null | undefined, message?: string): asserts value is T {
	if (value === null || value === undefined) {
		throw new Error(message || "Expected value to be defined");
	}
}

/**
 * Mock global fetch for testing
 */
export class FetchMock {
	private mocks: Map<string, { response: Response; count: number }> = new Map();
	private originalFetch?: typeof fetch;

	/**
	 * Setup a mock for a specific URL
	 */
	mock(url: string, response: Response): void {
		this.mocks.set(url, { response, count: 0 });
	}

	/**
	 * Setup a mock that returns JSON
	 */
	mockJson(url: string, data: any, status = 200): void {
		const response = new Response(JSON.stringify(data), {
			status,
			headers: { "content-type": "application/json" },
		});
		this.mock(url, response);
	}

	/**
	 * Setup a mock that returns text
	 */
	mockText(url: string, text: string, status = 200, contentType = "text/plain"): void {
		const response = new Response(text, {
			status,
			headers: { "content-type": contentType },
		});
		this.mock(url, response);
	}

	/**
	 * Setup a mock that throws an error
	 */
	mockError(url: string, error: Error): void {
		const response = new Response(null, {
			status: 500,
			statusText: error.message,
		});
		this.mock(url, response);
	}

	/**
	 * Enable the fetch mock
	 */
	enable(): void {
		this.originalFetch = global.fetch;
		global.fetch = ((url: string | URL | Request, init?: RequestInit) => {
			const urlString = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;

			const mock = this.mocks.get(urlString);
			if (mock) {
				mock.count++;
				// Clone the response so it can be used multiple times
				return Promise.resolve(mock.response.clone());
			}

			// If no mock found, call original fetch
			if (this.originalFetch) {
				return this.originalFetch(url, init);
			}

			return Promise.reject(new Error(`No mock found for URL: ${urlString}`));
		}) as typeof fetch;
	}

	/**
	 * Disable the fetch mock and restore original
	 */
	disable(): void {
		if (this.originalFetch) {
			global.fetch = this.originalFetch;
			this.originalFetch = undefined;
		}
	}

	/**
	 * Reset all mocks
	 */
	reset(): void {
		this.mocks.clear();
	}

	/**
	 * Get the number of times a URL was fetched
	 */
	getCallCount(url: string): number {
		return this.mocks.get(url)?.count || 0;
	}

	/**
	 * Check if a URL was fetched
	 */
	wasCalled(url: string): boolean {
		return this.getCallCount(url) > 0;
	}
}

/**
 * Create a new FetchMock instance for a test
 */
export function createFetchMock(): FetchMock {
	return new FetchMock();
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj));
}

/**
 * Compare two objects for deep equality
 */
export function deepEqual(a: any, b: any): boolean {
	if (a === b) return true;

	if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
		return false;
	}

	const keysA = Object.keys(a);
	const keysB = Object.keys(b);

	if (keysA.length !== keysB.length) return false;

	for (const key of keysA) {
		if (!keysB.includes(key)) return false;
		if (!deepEqual(a[key], b[key])) return false;
	}

	return true;
}

/**
 * Create a mock Date that always returns a fixed time
 */
export function mockDate(fixedTime: number): { restore: () => void } {
	const OriginalDate = Date;
	const now = fixedTime;

	// @ts-ignore
	global.Date = class extends OriginalDate {
		constructor(...args: any[]) {
			if (args.length === 0) {
				super(now);
			} else {
				// @ts-ignore
				super(...args);
			}
		}

		static now() {
			return now;
		}
	};

	// @ts-ignore
	global.Date.UTC = OriginalDate.UTC;
	// @ts-ignore
	global.Date.parse = OriginalDate.parse;

	return {
		restore: () => {
			global.Date = OriginalDate;
		},
	};
}

/**
 * Assert that an async function throws an error
 */
export async function assertThrows(
	fn: () => Promise<any>,
	expectedError?: string | RegExp
): Promise<void> {
	let thrown = false;
	let error: Error | null = null;

	try {
		await fn();
	} catch (e) {
		thrown = true;
		error = e as Error;
	}

	if (!thrown) {
		throw new Error("Expected function to throw an error");
	}

	if (expectedError && error) {
		if (typeof expectedError === "string") {
			if (!error.message.includes(expectedError)) {
				throw new Error(
					`Expected error message to include "${expectedError}", but got "${error.message}"`
				);
			}
		} else {
			if (!expectedError.test(error.message)) {
				throw new Error(
					`Expected error message to match ${expectedError}, but got "${error.message}"`
				);
			}
		}
	}
}
