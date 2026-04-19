import { describe, expect, it } from "vitest";
import type { Pool, WaterTest } from "../../types";
import { evaluateChemistry } from "./evaluate";

const testPool: Pool = {
	id: "pool-1",
	name: "Test Pool",
	volumeGallons: 15000,
	latitude: 33,
	longitude: -112,
	surfaceType: "plaster",
	chlorineSource: "liquid",
	treeCoverPercent: 0,
	isIndoor: false,
	targetFc: null,
	targetPh: 7.4,
	notes: "",
	createdAt: "2026-01-01T00:00:00Z",
	updatedAt: "2026-01-01T00:00:00Z",
};

function makeTest(overrides: Partial<WaterTest>): WaterTest {
	return {
		id: crypto.randomUUID(),
		poolId: "pool-1",
		testedAt: "2026-01-01T12:00:00Z",
		createdAt: "2026-01-01T12:00:00Z",
		...overrides,
	};
}

describe("evaluateChemistry", () => {
	it("returns ok status for balanced water", () => {
		const tests = [makeTest({ fc: 5, ph: 7.4, cya: 40 })];
		const result = evaluateChemistry(testPool, tests);
		expect(result.fcStatus).toBe("ok");
		expect(result.phStatus).toBe("ok");
		expect(result.currentFc).toBe(5);
		expect(result.currentPh).toBe(7.4);
		expect(result.currentCya).toBe(40);
	});

	it("detects low FC", () => {
		// CYA=50 -> min FC=4
		const tests = [makeTest({ fc: 3, cya: 50 })];
		const result = evaluateChemistry(testPool, tests);
		expect(result.fcStatus).toBe("low");
		expect(result.recommendations.some((r) => r.type === "dose")).toBe(true);
	});

	it("detects critically low FC", () => {
		// CYA=50 -> min FC=4, critical threshold = 4*0.5 = 2
		const tests = [makeTest({ fc: 1.5, cya: 50 })];
		const result = evaluateChemistry(testPool, tests);
		expect(result.fcStatus).toBe("critical");
		expect(result.recommendations.some((r) => r.priority === "urgent")).toBe(
			true,
		);
	});

	it("detects high FC", () => {
		// CYA=40 -> max FC=7
		const tests = [makeTest({ fc: 10, cya: 40 })];
		const result = evaluateChemistry(testPool, tests);
		expect(result.fcStatus).toBe("high");
	});

	it("detects low pH", () => {
		const tests = [makeTest({ fc: 5, ph: 6.8 })];
		const result = evaluateChemistry(testPool, tests);
		expect(result.phStatus).toBe("low");
		expect(
			result.recommendations.some((r) => r.title.includes("pH too low")),
		).toBe(true);
	});

	it("detects high pH", () => {
		const tests = [makeTest({ fc: 5, ph: 7.9 })];
		const result = evaluateChemistry(testPool, tests);
		expect(result.phStatus).toBe("high");
		expect(
			result.recommendations.some((r) => r.title.includes("pH too high")),
		).toBe(true);
	});

	it("recommends shock when CC > 0.5", () => {
		const tests = [makeTest({ fc: 3, cc: 1.0, cya: 40 })];
		const result = evaluateChemistry(testPool, tests);
		expect(result.recommendations.some((r) => r.type === "shock")).toBe(true);
	});

	it("recommends testing when no FC available", () => {
		const tests = [makeTest({ ph: 7.4 })];
		const result = evaluateChemistry(testPool, tests);
		expect(
			result.recommendations.some(
				(r) => r.type === "test" && r.title.includes("chlorine"),
			),
		).toBe(true);
	});

	it("recommends testing CYA when not available", () => {
		const tests = [makeTest({ fc: 5, ph: 7.4 })];
		const result = evaluateChemistry(testPool, tests);
		expect(
			result.recommendations.some(
				(r) => r.type === "test" && r.title.includes("CYA"),
			),
		).toBe(true);
	});

	it("warns about CYA buildup with dichlor", () => {
		const pool = { ...testPool, chlorineSource: "dichlor" as const };
		const tests = [makeTest({ fc: 5, cya: 75 })];
		const result = evaluateChemistry(pool, tests);
		expect(
			result.recommendations.some((r) => r.title.includes("CYA rising")),
		).toBe(true);
	});

	it("warns about CYA buildup with trichlor", () => {
		const pool = { ...testPool, chlorineSource: "trichlor" as const };
		const tests = [makeTest({ fc: 5, cya: 80 })];
		const result = evaluateChemistry(pool, tests);
		expect(
			result.recommendations.some((r) => r.title.includes("CYA rising")),
		).toBe(true);
	});

	it("does not warn about CYA with liquid chlorine", () => {
		const tests = [makeTest({ fc: 5, cya: 80 })];
		const result = evaluateChemistry(testPool, tests);
		expect(
			result.recommendations.some((r) => r.title.includes("CYA rising")),
		).toBe(false);
	});

	it("computes LSI when all params available", () => {
		const tests = [
			makeTest({
				fc: 5,
				ph: 7.4,
				ta: 100,
				ch: 300,
				tempF: 82,
				tds: 1000,
				cya: 40,
			}),
		];
		const result = evaluateChemistry(testPool, tests);
		expect(result.lsi).not.toBeNull();
		expect(result.lsiStatus).toBe("balanced");
	});

	it("returns null LSI when params missing", () => {
		const tests = [makeTest({ fc: 5, ph: 7.4 })];
		const result = evaluateChemistry(testPool, tests);
		expect(result.lsi).toBeNull();
		expect(result.lsiStatus).toBeNull();
	});

	it("computes FC/CYA ratio", () => {
		const tests = [makeTest({ fc: 4, cya: 50 })];
		const result = evaluateChemistry(testPool, tests);
		expect(result.fcCyaRatio).toBeCloseTo(0.08, 2);
	});

	it("returns null FC/CYA ratio when CYA = 0", () => {
		const tests = [makeTest({ fc: 4, cya: 0 })];
		const result = evaluateChemistry(testPool, tests);
		expect(result.fcCyaRatio).toBeNull();
	});

	it("handles empty test array", () => {
		const result = evaluateChemistry(testPool, []);
		expect(result.currentFc).toBeNull();
		expect(result.currentPh).toBeNull();
		expect(result.fcStatus).toBe("ok");
	});

	it("uses latest test for FC/pH", () => {
		const tests = [
			makeTest({ testedAt: "2026-01-01T08:00:00Z", fc: 3.0, ph: 7.0 }),
			makeTest({ testedAt: "2026-01-02T08:00:00Z", fc: 5.0, ph: 7.4 }),
		];
		const result = evaluateChemistry(testPool, tests);
		expect(result.currentFc).toBe(5.0);
		expect(result.currentPh).toBe(7.4);
	});

	it("finds CYA from older test if latest lacks it", () => {
		const tests = [
			makeTest({ testedAt: "2026-01-01T08:00:00Z", fc: 3.0, cya: 40 }),
			makeTest({ testedAt: "2026-01-02T08:00:00Z", fc: 5.0 }),
		];
		const result = evaluateChemistry(testPool, tests);
		expect(result.currentCya).toBe(40);
	});

	it("includes dosing product amount in recommendations", () => {
		const tests = [makeTest({ fc: 1, cya: 40 })];
		const result = evaluateChemistry(testPool, tests);
		const doseRec = result.recommendations.find((r) => r.type === "dose");
		expect(doseRec?.productAmount).toBeDefined();
		expect(doseRec?.productAmount).toContain("liquid chlorine");
	});
});
