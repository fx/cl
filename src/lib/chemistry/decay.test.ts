import { describe, expect, it } from "vitest";
import {
	calculateDecayRate,
	fahrenheitToKelvin,
	getKUvBase,
	predictFc,
	temperatureFactor,
} from "./decay";

describe("fahrenheitToKelvin", () => {
	it("converts 32F to 273.15K", () => {
		expect(fahrenheitToKelvin(32)).toBeCloseTo(273.15, 2);
	});

	it("converts 77F to 298.15K (25C)", () => {
		expect(fahrenheitToKelvin(77)).toBeCloseTo(298.15, 2);
	});

	it("converts 212F to 373.15K (100C)", () => {
		expect(fahrenheitToKelvin(212)).toBeCloseTo(373.15, 2);
	});

	it("converts 85F correctly", () => {
		expect(fahrenheitToKelvin(85)).toBeCloseTo(302.594, 1);
	});
});

describe("getKUvBase", () => {
	it("returns 1.2 for CYA = 0", () => {
		expect(getKUvBase(0)).toBe(1.2);
	});

	it("returns 0.5 for CYA = 10", () => {
		expect(getKUvBase(10)).toBe(0.5);
	});

	it("returns 0.14 for CYA = 30", () => {
		expect(getKUvBase(30)).toBe(0.14);
	});

	it("returns 0.09 for CYA = 50", () => {
		expect(getKUvBase(50)).toBe(0.09);
	});

	it("returns 0.07 for CYA = 80", () => {
		expect(getKUvBase(80)).toBe(0.07);
	});

	it("interpolates between CYA 0 and 10", () => {
		const result = getKUvBase(5);
		expect(result).toBeCloseTo(0.85, 2); // midpoint of 1.2 and 0.5
	});

	it("interpolates between CYA 10 and 30", () => {
		const result = getKUvBase(20);
		expect(result).toBeCloseTo(0.32, 2); // midpoint of 0.5 and 0.14
	});

	it("clamps at CYA = 0 for negative CYA", () => {
		expect(getKUvBase(-10)).toBe(1.2);
	});

	it("clamps at CYA = 80 for high CYA", () => {
		expect(getKUvBase(100)).toBe(0.07);
	});
});

describe("temperatureFactor", () => {
	it("returns 1.0 at reference temp 77F (25C)", () => {
		expect(temperatureFactor(77)).toBeCloseTo(1.0, 2);
	});

	it("returns ~0.5 at 65F (18C)", () => {
		expect(temperatureFactor(65)).toBeCloseTo(0.5, 0);
	});

	it("returns ~1.6 at 85F (29C)", () => {
		expect(temperatureFactor(85)).toBeCloseTo(1.6, 0);
	});

	it("returns ~2.8 at 95F (35C)", () => {
		expect(temperatureFactor(95)).toBeCloseTo(2.8, 0);
	});

	it("increases with temperature", () => {
		expect(temperatureFactor(90)).toBeGreaterThan(temperatureFactor(80));
	});
});

describe("calculateDecayRate", () => {
	it("computes daytime decay: CYA=30, 85F, GHI=800", () => {
		const result = calculateDecayRate(30, 85, 800 / 1000);
		// k_uv = 0.14 * 0.8 = 0.112
		expect(result.kUvBase).toBeCloseTo(0.112, 2);
		// k_demand = 0.02 * ~1.6 = ~0.032
		expect(result.kDemand).toBeCloseTo(0.032, 1);
		// k_effective = 0.112 + 0.032 = 0.144
		expect(result.kEffective).toBeCloseTo(0.144, 1);
		expect(result.kObservedAvg).toBeNull();
		expect(result.alpha).toBe(0);
	});

	it("computes nighttime decay: no sun", () => {
		const result = calculateDecayRate(50, 80, 0);
		expect(result.kUvBase).toBe(0);
		// k_demand only, ~0.025 at 80F
		expect(result.kDemand).toBeCloseTo(0.025, 1);
		expect(result.kEffective).toBeCloseTo(0.025, 1);
	});

	it("returns 0 UV component at night", () => {
		const result = calculateDecayRate(0, 77, 0);
		expect(result.kUvBase).toBe(0);
		expect(result.kDemand).toBeCloseTo(0.02, 3);
	});

	it("high CYA dramatically reduces UV decay", () => {
		const highCya = calculateDecayRate(80, 85, 1.0);
		const noCya = calculateDecayRate(0, 85, 1.0);
		// k_uv_base: 0.07 vs 1.2 — at least 10x difference
		expect(noCya.kUvBase / highCya.kUvBase).toBeGreaterThan(10);
	});
});

describe("predictFc", () => {
	it("returns initial FC at t=0", () => {
		expect(predictFc(5.0, 0.14, 0)).toBe(5.0);
	});

	it("decays FC correctly over 4 hours", () => {
		// FC(4) = 5.0 * exp(-0.144 * 4) = 5.0 * exp(-0.576) ≈ 2.81
		expect(predictFc(5.0, 0.144, 4)).toBeCloseTo(2.81, 1);
	});

	it("matches spec scenario: daytime decay", () => {
		// GIVEN FC=5.0, k=0.144 (CYA=30, 85F, GHI=800)
		// WHEN 4 hours
		// THEN FC ≈ 2.8
		expect(predictFc(5.0, 0.144, 4)).toBeCloseTo(2.8, 0);
	});

	it("matches spec scenario: overnight decay", () => {
		// GIVEN FC=4.0, k≈0.025 (CYA=50, 80F, no sun)
		// WHEN 10 hours
		// THEN FC ≈ 3.1
		expect(predictFc(4.0, 0.025, 10)).toBeCloseTo(3.1, 0);
	});

	it("returns 0 for k=0 (no decay)", () => {
		expect(predictFc(5.0, 0, 100)).toBe(5.0);
	});

	it("handles very long time periods", () => {
		const result = predictFc(5.0, 0.1, 100);
		expect(result).toBeGreaterThan(0);
		expect(result).toBeLessThan(0.01);
	});
});
