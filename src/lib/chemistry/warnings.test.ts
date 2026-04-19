import { describe, expect, it } from "vitest";
import type { DoseEvent, Pool, WaterTest } from "../../types";
import { generateWarnings } from "./warnings";

function makePool(overrides: Partial<Pool> = {}): Pool {
	return {
		id: "pool-1",
		name: "Test Pool",
		latitude: 33.45,
		longitude: -112.07,
		volumeGallons: 15000,
		surfaceType: "plaster",
		chlorineSource: "liquid",
		treeCoverPercent: 10,
		isIndoor: false,
		targetFc: null,
		targetPh: 7.4,
		notes: "",
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
		...overrides,
	};
}

function makeTest(overrides: Partial<WaterTest> = {}): WaterTest {
	return {
		id: "test-1",
		poolId: "pool-1",
		testedAt: new Date().toISOString(),
		createdAt: new Date().toISOString(),
		...overrides,
	};
}

const now = new Date("2026-04-19T10:00:00Z");

describe("generateWarnings", () => {
	describe("stale test warnings", () => {
		it("generates no stale warning for recent test", () => {
			const tests = [
				makeTest({
					testedAt: new Date(now.getTime() - 6 * 3600_000).toISOString(),
					fc: 5.0,
				}),
			];
			const warnings = generateWarnings(makePool(), tests, [], now);
			const stale = warnings.filter((w) => w.type === "stale_test");
			expect(stale).toHaveLength(0);
		});

		it("generates warning for 4-day-old test", () => {
			const tests = [
				makeTest({
					testedAt: new Date(now.getTime() - 4 * 24 * 3600_000).toISOString(),
					fc: 5.0,
				}),
			];
			const warnings = generateWarnings(makePool(), tests, [], now);
			const stale = warnings.filter((w) => w.type === "stale_test");
			expect(stale).toHaveLength(1);
			expect(stale[0].severity).toBe("warning");
		});

		it("generates urgent warning for 8-day-old test", () => {
			const tests = [
				makeTest({
					testedAt: new Date(now.getTime() - 8 * 24 * 3600_000).toISOString(),
					fc: 5.0,
				}),
			];
			const warnings = generateWarnings(makePool(), tests, [], now);
			const stale = warnings.filter((w) => w.type === "stale_test");
			expect(stale).toHaveLength(1);
			expect(stale[0].severity).toBe("urgent");
		});
	});

	describe("CYA warnings", () => {
		it("generates no CYA warning for liquid chlorine", () => {
			const tests = [makeTest({ cya: 80, fc: 5.0 })];
			const warnings = generateWarnings(makePool(), tests, [], now);
			const cya = warnings.filter(
				(w) => w.type === "cya_high" || w.type === "cya_rising",
			);
			expect(cya).toHaveLength(0);
		});

		it("generates cya_high for trichlor with CYA >= 80", () => {
			const pool = makePool({ chlorineSource: "trichlor" });
			const tests = [makeTest({ cya: 85, fc: 5.0 })];
			const warnings = generateWarnings(pool, tests, [], now);
			const cya = warnings.filter((w) => w.type === "cya_high");
			expect(cya).toHaveLength(1);
			expect(cya[0].severity).toBe("urgent");
		});

		it("generates cya_rising when projected CYA will exceed 80", () => {
			const pool = makePool({ chlorineSource: "trichlor" });
			const tests = [makeTest({ cya: 70, fc: 5.0 })];
			// 70 + 12 = 82 > 80, triggers cya_rising
			const bigDoses: DoseEvent[] = Array.from({ length: 8 }, () => ({
				time: now.toISOString(),
				fcBefore: 3.5,
				fcAfter: 6.0,
				ppmToAdd: 2.5,
				productAmount: "3.8 oz of trichlor",
				productAmountMl: 108,
				cyaIncrease: 1.5,
			}));
			const warnings = generateWarnings(pool, tests, bigDoses, now);
			const rising = warnings.filter((w) => w.type === "cya_rising");
			expect(rising).toHaveLength(1);
			expect(rising[0].severity).toBe("warning");
		});

		it("generates info-level CYA monitor for CYA 60-79 with trichlor", () => {
			const pool = makePool({ chlorineSource: "dichlor" });
			const tests = [makeTest({ cya: 65, fc: 5.0 })];
			const warnings = generateWarnings(pool, tests, [], now);
			const cya = warnings.filter((w) => w.type === "cya_rising");
			expect(cya).toHaveLength(1);
			expect(cya[0].severity).toBe("info");
		});
	});

	describe("no CYA test", () => {
		it("warns when no CYA test exists", () => {
			const tests = [makeTest({ fc: 5.0, ph: 7.4 })];
			const warnings = generateWarnings(makePool(), tests, [], now);
			const noCya = warnings.filter((w) => w.type === "no_cya_test");
			expect(noCya).toHaveLength(1);
		});

		it("does not warn when CYA test exists", () => {
			const tests = [makeTest({ fc: 5.0, cya: 40 })];
			const warnings = generateWarnings(makePool(), tests, [], now);
			const noCya = warnings.filter((w) => w.type === "no_cya_test");
			expect(noCya).toHaveLength(0);
		});
	});

	describe("pH warnings", () => {
		it("warns when pH is too low", () => {
			const tests = [makeTest({ fc: 5.0, ph: 7.0 })];
			const warnings = generateWarnings(makePool(), tests, [], now);
			const ph = warnings.filter((w) => w.type === "ph_out_of_range");
			expect(ph).toHaveLength(1);
			expect(ph[0].title).toContain("low");
		});

		it("warns when pH is too high", () => {
			const tests = [makeTest({ fc: 5.0, ph: 7.8 })];
			const warnings = generateWarnings(makePool(), tests, [], now);
			const ph = warnings.filter((w) => w.type === "ph_out_of_range");
			expect(ph).toHaveLength(1);
			expect(ph[0].title).toContain("high");
		});

		it("no warning for normal pH", () => {
			const tests = [makeTest({ fc: 5.0, ph: 7.4 })];
			const warnings = generateWarnings(makePool(), tests, [], now);
			const ph = warnings.filter((w) => w.type === "ph_out_of_range");
			expect(ph).toHaveLength(0);
		});
	});

	describe("LSI warnings", () => {
		it("warns when LSI is corrosive", () => {
			const tests = [
				makeTest({
					fc: 5.0,
					ph: 7.0,
					ta: 60,
					ch: 100,
					tempF: 70,
				}),
			];
			const warnings = generateWarnings(makePool(), tests, [], now);
			const lsi = warnings.filter((w) => w.type === "lsi_imbalanced");
			expect(lsi).toHaveLength(1);
			expect(lsi[0].title).toContain("corrosive");
		});

		it("warns when LSI is scaling", () => {
			const tests = [
				makeTest({
					fc: 5.0,
					ph: 8.2,
					ta: 200,
					ch: 500,
					tempF: 90,
				}),
			];
			const warnings = generateWarnings(makePool(), tests, [], now);
			const lsi = warnings.filter((w) => w.type === "lsi_imbalanced");
			expect(lsi).toHaveLength(1);
			expect(lsi[0].title).toContain("scale");
		});

		it("no LSI warning when balanced", () => {
			const tests = [
				makeTest({
					fc: 5.0,
					ph: 7.4,
					ta: 100,
					ch: 300,
					tempF: 80,
				}),
			];
			const warnings = generateWarnings(makePool(), tests, [], now);
			const lsi = warnings.filter((w) => w.type === "lsi_imbalanced");
			expect(lsi).toHaveLength(0);
		});

		it("no LSI warning when data incomplete", () => {
			const tests = [makeTest({ fc: 5.0, ph: 7.4 })];
			const warnings = generateWarnings(makePool(), tests, [], now);
			const lsi = warnings.filter((w) => w.type === "lsi_imbalanced");
			expect(lsi).toHaveLength(0);
		});
	});
});
