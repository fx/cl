import { describe, expect, it } from "vitest";
import {
	calculateEffectiveSunHours,
	calculatePSH,
	calculateTreeFactor,
} from "./exposure";

describe("calculatePSH", () => {
	it("returns 7.5 for 7500 Wh/m² total GHI", () => {
		const hourly = Array(24).fill(0);
		for (let i = 6; i <= 18; i++) {
			hourly[i] = 7500 / 13;
		}
		const psh = calculatePSH(hourly);
		expect(psh).toBeCloseTo(7.5, 1);
	});

	it("returns 0 for all-zero radiation", () => {
		const hourly = Array(24).fill(0);
		expect(calculatePSH(hourly)).toBe(0);
	});

	it("returns 1 for exactly 1000 Wh/m² total", () => {
		const hourly = [1000];
		expect(calculatePSH(hourly)).toBe(1);
	});

	it("handles empty array", () => {
		expect(calculatePSH([])).toBe(0);
	});

	it("returns 7.2 for 7200 Wh/m² total GHI", () => {
		const hourly = Array(24).fill(300);
		expect(calculatePSH(hourly)).toBeCloseTo(7.2, 1);
	});
});

describe("calculateTreeFactor", () => {
	it("returns 1.0 for 0% canopy", () => {
		expect(calculateTreeFactor(0)).toBe(1);
	});

	it("returns 0.0 for 100% canopy", () => {
		expect(calculateTreeFactor(100)).toBe(0);
	});

	it("returns ~0.80 for 10% canopy", () => {
		expect(calculateTreeFactor(10)).toBeCloseTo(0.8, 1);
	});

	it("returns ~0.63 for 25% canopy", () => {
		expect(calculateTreeFactor(25)).toBeCloseTo(0.63, 1);
	});

	it("returns ~0.39 for 50% canopy", () => {
		expect(calculateTreeFactor(50)).toBeCloseTo(0.39, 1);
	});

	it("returns ~0.21 for 75% canopy", () => {
		expect(calculateTreeFactor(75)).toBeCloseTo(0.21, 1);
	});

	it("returns ~0.10 for 90% canopy", () => {
		expect(calculateTreeFactor(90)).toBeCloseTo(0.1, 1);
	});

	it("clamps to 1 for negative canopy percent", () => {
		expect(calculateTreeFactor(-10)).toBe(1);
	});

	it("clamps to 0 for canopy > 100%", () => {
		expect(calculateTreeFactor(150)).toBe(0);
	});
});

describe("calculateEffectiveSunHours", () => {
	it("returns PSH * treeFactor", () => {
		expect(calculateEffectiveSunHours(7.5, 0.63)).toBeCloseTo(4.725, 2);
	});

	it("returns 0 when tree factor is 0", () => {
		expect(calculateEffectiveSunHours(7.5, 0)).toBe(0);
	});

	it("returns full PSH when tree factor is 1", () => {
		expect(calculateEffectiveSunHours(7.5, 1)).toBe(7.5);
	});

	it("matches the spec scenario: PSH=7.5, tree=0.63 => ~4.7", () => {
		const treeFactor = calculateTreeFactor(25);
		const effective = calculateEffectiveSunHours(7.5, treeFactor);
		expect(effective).toBeCloseTo(4.7, 0);
	});
});
