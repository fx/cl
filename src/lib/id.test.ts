import { afterEach, describe, expect, it, vi } from "vitest";
import { generateId } from "./id";

const UUID_V4_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("generateId", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns a valid UUID v4 format string", () => {
		const id = generateId();
		expect(id).toMatch(UUID_V4_RE);
	});

	it("returns unique values on successive calls", () => {
		const ids = new Set(Array.from({ length: 50 }, () => generateId()));
		expect(ids.size).toBe(50);
	});

	it("falls back when crypto.randomUUID is undefined", () => {
		const originalCrypto = globalThis.crypto;
		const cryptoWithoutUUID = {
			getRandomValues: originalCrypto.getRandomValues.bind(originalCrypto),
		};
		vi.stubGlobal("crypto", cryptoWithoutUUID);

		const id = generateId();
		expect(id).toMatch(UUID_V4_RE);
	});
});
