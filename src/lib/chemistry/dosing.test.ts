import { describe, expect, it } from "vitest";
import { calculateDose } from "./dosing";

describe("calculateDose", () => {
	describe("liquid 12.5%", () => {
		it("matches spec scenario: 15K gal, +3 ppm", () => {
			const result = calculateDose(15000, 2.0, 5.0, "liquid");
			expect(result).not.toBeNull();
			// 10.7 * 1.5 * 3 = 48.15 fl oz
			expect(result?.amount).toBeCloseTo(48.2, 0);
			expect(result?.unit).toBe("fl oz");
			expect(result?.cyaIncrease).toBe(0);
		});

		it("calculates for 10K gal, +1 ppm", () => {
			const result = calculateDose(10000, 0, 1, "liquid");
			expect(result).not.toBeNull();
			expect(result?.amount).toBeCloseTo(10.7, 1);
		});

		it("formats large amounts as gallons", () => {
			// 20K gal, +10 ppm = 10.7 * 2 * 10 = 214 fl oz = 1.67 gal
			const result = calculateDose(20000, 0, 10, "liquid");
			expect(result).not.toBeNull();
			expect(result?.formatted).toContain("gal");
		});

		it("formats small amounts as fl oz", () => {
			const result = calculateDose(10000, 4, 5, "liquid");
			expect(result).not.toBeNull();
			expect(result?.formatted).toContain("fl oz");
		});
	});

	describe("liquid 6%", () => {
		it("calculates for 10K gal, +1 ppm", () => {
			const result = calculateDose(10000, 0, 1, "liquid_6");
			expect(result).not.toBeNull();
			expect(result?.amount).toBeCloseTo(22.3, 1);
			expect(result?.unit).toBe("fl oz");
			expect(result?.cyaIncrease).toBe(0);
		});
	});

	describe("cal-hypo", () => {
		it("calculates for 10K gal, +1 ppm", () => {
			const result = calculateDose(10000, 0, 1, "cal_hypo");
			expect(result).not.toBeNull();
			expect(result?.amount).toBeCloseTo(2.0, 1);
			expect(result?.unit).toBe("oz");
			expect(result?.cyaIncrease).toBe(0);
		});

		it("formats large amounts as lbs", () => {
			// 20K gal, +10 ppm = 2.0 * 2 * 10 = 40 oz = 2.5 lbs
			const result = calculateDose(20000, 0, 10, "cal_hypo");
			expect(result).not.toBeNull();
			expect(result?.formatted).toContain("lbs");
		});
	});

	describe("dichlor", () => {
		it("calculates dose and CYA increase for 10K gal, +5 ppm", () => {
			const result = calculateDose(10000, 0, 5, "dichlor");
			expect(result).not.toBeNull();
			expect(result?.amount).toBeCloseTo(12, 0); // 2.4 * 1 * 5
			expect(result?.unit).toBe("oz");
			// CYA increase: 9 ppm per 10 ppm Cl = 9 * 5/10 = 4.5
			expect(result?.cyaIncrease).toBeCloseTo(4.5, 1);
		});
	});

	describe("trichlor", () => {
		it("calculates dose and CYA increase for 10K gal, +5 ppm", () => {
			const result = calculateDose(10000, 0, 5, "trichlor");
			expect(result).not.toBeNull();
			expect(result?.amount).toBeCloseTo(7.5, 1); // 1.5 * 1 * 5
			expect(result?.unit).toBe("oz");
			// CYA increase: 6 ppm per 10 ppm Cl = 6 * 5/10 = 3
			expect(result?.cyaIncrease).toBeCloseTo(3, 1);
		});
	});

	describe("SWG", () => {
		it("returns null for SWG source", () => {
			expect(calculateDose(10000, 0, 5, "swg")).toBeNull();
		});
	});

	describe("edge cases", () => {
		it("returns 0 amount when target <= current", () => {
			const result = calculateDose(10000, 5, 3, "liquid");
			expect(result).not.toBeNull();
			expect(result?.amount).toBe(0);
		});

		it("returns 0 amount when target equals current", () => {
			const result = calculateDose(10000, 5, 5, "liquid");
			expect(result).not.toBeNull();
			expect(result?.amount).toBe(0);
		});

		it("scales correctly with pool volume", () => {
			const small = calculateDose(5000, 0, 1, "liquid");
			const large = calculateDose(20000, 0, 1, "liquid");
			expect(small).not.toBeNull();
			expect(large).not.toBeNull();
			expect((large?.amount ?? 0) / (small?.amount ?? 1)).toBeCloseTo(4, 1);
		});
	});
});
