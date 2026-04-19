import { describe, expect, it } from "vitest";
import type { WaterTest } from "../../types";
import { extractObservedRates, learnDecayRate } from "./learned-rate";

function makeTest(
	overrides: Partial<WaterTest> & { testedAt: string },
): WaterTest {
	return {
		id: crypto.randomUUID(),
		poolId: "pool-1",
		createdAt: overrides.testedAt,
		...overrides,
	};
}

describe("extractObservedRates", () => {
	it("extracts k from a decaying pair", () => {
		const tests = [
			makeTest({ testedAt: "2026-01-01T08:00:00Z", fc: 5.0 }),
			makeTest({ testedAt: "2026-01-01T12:00:00Z", fc: 3.5 }),
		];
		const rates = extractObservedRates(tests);
		expect(rates).toHaveLength(1);
		// k = -ln(3.5/5.0) / 4 = -ln(0.7) / 4 ≈ 0.357 / 4 ≈ 0.089
		expect(rates[0]).toBeCloseTo(0.089, 2);
	});

	it("skips pairs where FC increased (dosing happened)", () => {
		const tests = [
			makeTest({ testedAt: "2026-01-01T08:00:00Z", fc: 3.0 }),
			makeTest({ testedAt: "2026-01-01T12:00:00Z", fc: 6.0 }),
		];
		const rates = extractObservedRates(tests);
		expect(rates).toHaveLength(0);
	});

	it("skips pairs with less than 1 hour gap", () => {
		const tests = [
			makeTest({ testedAt: "2026-01-01T08:00:00Z", fc: 5.0 }),
			makeTest({ testedAt: "2026-01-01T08:30:00Z", fc: 4.5 }),
		];
		const rates = extractObservedRates(tests);
		expect(rates).toHaveLength(0);
	});

	it("skips pairs with more than 48 hour gap", () => {
		const tests = [
			makeTest({ testedAt: "2026-01-01T08:00:00Z", fc: 5.0 }),
			makeTest({ testedAt: "2026-01-04T08:00:00Z", fc: 2.0 }),
		];
		const rates = extractObservedRates(tests);
		expect(rates).toHaveLength(0);
	});

	it("skips tests without FC", () => {
		const tests = [
			makeTest({ testedAt: "2026-01-01T08:00:00Z", fc: 5.0 }),
			makeTest({ testedAt: "2026-01-01T12:00:00Z", ph: 7.4 }), // no FC
		];
		const rates = extractObservedRates(tests);
		expect(rates).toHaveLength(0);
	});

	it("handles unsorted tests", () => {
		const tests = [
			makeTest({ testedAt: "2026-01-01T12:00:00Z", fc: 3.5 }),
			makeTest({ testedAt: "2026-01-01T08:00:00Z", fc: 5.0 }),
		];
		const rates = extractObservedRates(tests);
		expect(rates).toHaveLength(1);
		expect(rates[0]).toBeCloseTo(0.089, 2);
	});

	it("extracts multiple rates from multiple pairs", () => {
		const tests = [
			makeTest({ testedAt: "2026-01-01T08:00:00Z", fc: 5.0 }),
			makeTest({ testedAt: "2026-01-01T12:00:00Z", fc: 3.5 }),
			makeTest({ testedAt: "2026-01-01T16:00:00Z", fc: 2.5 }),
		];
		const rates = extractObservedRates(tests);
		expect(rates).toHaveLength(2);
	});

	it("limits to last 10 pairs", () => {
		const tests: WaterTest[] = [];
		for (let i = 0; i < 15; i++) {
			const hour = i * 2;
			const fc = 10 * Math.exp(-0.1 * hour);
			tests.push(
				makeTest({
					testedAt: `2026-01-01T${String(hour).padStart(2, "0")}:00:00Z`,
					fc,
				}),
			);
		}
		const rates = extractObservedRates(tests);
		expect(rates.length).toBeLessThanOrEqual(10);
	});

	it("returns empty array for empty tests", () => {
		expect(extractObservedRates([])).toEqual([]);
	});

	it("returns empty array for single test", () => {
		const tests = [makeTest({ testedAt: "2026-01-01T08:00:00Z", fc: 5.0 })];
		expect(extractObservedRates(tests)).toEqual([]);
	});
});

describe("learnDecayRate", () => {
	it("returns pure model rate with fewer than 2 pairs", () => {
		const tests = [makeTest({ testedAt: "2026-01-01T08:00:00Z", fc: 5.0 })];
		const result = learnDecayRate(tests, 0.15);
		expect(result.kObservedAvg).toBeNull();
		expect(result.alpha).toBe(0);
		expect(result.kEffective).toBe(0.15);
	});

	it("blends with alpha for 2 pairs", () => {
		const tests = [
			makeTest({ testedAt: "2026-01-01T08:00:00Z", fc: 5.0 }),
			makeTest({ testedAt: "2026-01-01T12:00:00Z", fc: 3.5 }),
			makeTest({ testedAt: "2026-01-01T16:00:00Z", fc: 2.5 }),
		];
		const result = learnDecayRate(tests, 0.15);
		expect(result.kObservedAvg).not.toBeNull();
		// alpha for 2 pairs = 0.7 * 2/5 = 0.28
		expect(result.alpha).toBeCloseTo(0.28, 2);
		expect(result.kEffective).toBeGreaterThan(0);
	});

	it("reaches max alpha 0.7 with 5+ pairs", () => {
		const tests: WaterTest[] = [];
		const baseTime = new Date("2026-01-01T08:00:00Z").getTime();
		for (let i = 0; i < 7; i++) {
			const time = new Date(baseTime + i * 4 * 3600 * 1000).toISOString();
			tests.push(
				makeTest({
					testedAt: time,
					fc: 5.0 * Math.exp(-0.1 * i * 4),
				}),
			);
		}
		const result = learnDecayRate(tests, 0.15);
		// 7 tests -> 6 pairs, alpha = min(0.7, 0.7*6/5) = 0.7
		expect(result.alpha).toBe(0.7);
	});

	it("matches spec: 70% observed + 30% model at max alpha", () => {
		const tests: WaterTest[] = [];
		const baseTime = new Date("2026-01-01T08:00:00Z").getTime();
		for (let i = 0; i < 7; i++) {
			const time = new Date(baseTime + i * 4 * 3600 * 1000).toISOString();
			tests.push(
				makeTest({
					testedAt: time,
					fc: 5.0 * Math.exp(-0.1 * i * 4),
				}),
			);
		}
		const kModel = 0.15;
		const result = learnDecayRate(tests, kModel);
		// k_effective ≈ 0.7 * 0.10 + 0.3 * 0.15 = 0.07 + 0.045 = 0.115
		expect(result.kEffective).toBeCloseTo(0.115, 1);
	});

	it("returns empty tests with no data", () => {
		const result = learnDecayRate([], 0.15);
		expect(result.kEffective).toBe(0.15);
		expect(result.observedRates).toEqual([]);
	});
});
