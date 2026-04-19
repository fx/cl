import { describe, expect, it } from "vitest";
import { calculateLsi } from "./lsi";

describe("calculateLsi", () => {
	it("matches spec scenario: balanced water", () => {
		// pH=7.4, TA=100, CH=300, temp=82F, TDS=1000
		const result = calculateLsi(7.4, 100, 300, 82);
		expect(result).not.toBeNull();
		expect(result?.lsi).toBeCloseTo(0.0, 0);
		expect(result?.status).toBe("balanced");
	});

	it("returns intermediate values", () => {
		const result = calculateLsi(7.4, 100, 300, 82, 1000);
		expect(result).not.toBeNull();
		expect(result?.a).toBeDefined();
		expect(result?.b).toBeDefined();
		expect(result?.c).toBeDefined();
		expect(result?.d).toBeDefined();
		expect(result?.phS).toBeDefined();
	});

	it("detects corrosive water", () => {
		// Low pH, low CH
		const result = calculateLsi(6.8, 60, 100, 70, 500);
		expect(result).not.toBeNull();
		expect(result?.lsi).toBeLessThan(-0.3);
		expect(result?.status).toBe("corrosive");
	});

	it("detects scale-forming water", () => {
		// High pH, high CH, high TA
		const result = calculateLsi(8.0, 200, 500, 90, 2000);
		expect(result).not.toBeNull();
		expect(result?.lsi).toBeGreaterThan(0.3);
		expect(result?.status).toBe("scaling");
	});

	it("uses default TDS of 1000 when not provided", () => {
		const withDefault = calculateLsi(7.4, 100, 300, 82);
		const withExplicit = calculateLsi(7.4, 100, 300, 82, 1000);
		expect(withDefault?.lsi).toBe(withExplicit?.lsi);
	});

	it("higher temperature shifts LSI up", () => {
		const cold = calculateLsi(7.4, 100, 300, 60);
		const hot = calculateLsi(7.4, 100, 300, 95);
		expect(hot?.lsi).toBeGreaterThan(cold?.lsi ?? 0);
	});

	it("higher pH shifts LSI up", () => {
		const low = calculateLsi(7.0, 100, 300, 82);
		const high = calculateLsi(8.0, 100, 300, 82);
		expect(high?.lsi).toBeGreaterThan(low?.lsi ?? 0);
	});

	it("higher calcium hardness shifts LSI up", () => {
		const low = calculateLsi(7.4, 100, 100, 82);
		const high = calculateLsi(7.4, 100, 600, 82);
		expect(high?.lsi).toBeGreaterThan(low?.lsi ?? 0);
	});

	it("higher alkalinity shifts LSI up", () => {
		const low = calculateLsi(7.4, 50, 300, 82);
		const high = calculateLsi(7.4, 200, 300, 82);
		expect(high?.lsi).toBeGreaterThan(low?.lsi ?? 0);
	});

	it("rounds LSI to 2 decimal places", () => {
		const result = calculateLsi(7.4, 100, 300, 82);
		expect(result).not.toBeNull();
		const decimalPlaces = (result?.lsi.toString().split(".")[1] ?? "").length;
		expect(decimalPlaces).toBeLessThanOrEqual(2);
	});

	it("returns null for zero TA", () => {
		expect(calculateLsi(7.4, 0, 300, 82)).toBeNull();
	});

	it("returns null for zero CH", () => {
		expect(calculateLsi(7.4, 100, 0, 82)).toBeNull();
	});

	it("returns null for zero TDS", () => {
		expect(calculateLsi(7.4, 100, 300, 82, 0)).toBeNull();
	});

	it("returns null for negative inputs", () => {
		expect(calculateLsi(7.4, -50, 300, 82)).toBeNull();
	});

	it("returns null for non-finite temperature", () => {
		expect(calculateLsi(7.4, 100, 300, Number.NaN)).toBeNull();
	});
});
