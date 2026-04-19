import { describe, expect, it } from "vitest";
import { calculateFcTarget } from "./fc-cya";

describe("calculateFcTarget", () => {
	it("returns correct values for CYA = 0", () => {
		const result = calculateFcTarget(0);
		expect(result.min).toBe(1);
		expect(result.target).toBe(2);
		expect(result.max).toBe(3);
		expect(result.slamLevel).toBe(10);
	});

	it("returns correct values for CYA = 20", () => {
		const result = calculateFcTarget(20);
		expect(result.min).toBe(2);
		expect(result.target).toBe(4);
		expect(result.max).toBe(5);
		expect(result.slamLevel).toBe(10);
	});

	it("returns correct values for CYA = 30", () => {
		const result = calculateFcTarget(30);
		expect(result.min).toBe(2);
		expect(result.target).toBe(5);
		expect(result.max).toBe(6);
		expect(result.slamLevel).toBe(12);
	});

	it("returns correct values for CYA = 40", () => {
		const result = calculateFcTarget(40);
		expect(result.min).toBe(3);
		expect(result.target).toBe(6);
		expect(result.max).toBe(7);
		expect(result.slamLevel).toBe(16);
	});

	it("returns correct values for CYA = 50", () => {
		const result = calculateFcTarget(50);
		expect(result.min).toBe(4);
		expect(result.target).toBe(7);
		expect(result.max).toBe(8);
		expect(result.slamLevel).toBe(20);
	});

	it("returns correct values for CYA = 60", () => {
		const result = calculateFcTarget(60);
		expect(result.min).toBe(5);
		expect(result.target).toBe(8);
		expect(result.max).toBe(9);
		expect(result.slamLevel).toBe(24);
	});

	it("returns correct values for CYA = 70", () => {
		const result = calculateFcTarget(70);
		expect(result.min).toBe(5);
		expect(result.target).toBe(9);
		expect(result.max).toBe(10);
		expect(result.slamLevel).toBe(28);
	});

	it("returns correct values for CYA = 80", () => {
		const result = calculateFcTarget(80);
		expect(result.min).toBe(6);
		expect(result.target).toBe(10);
		expect(result.max).toBe(11);
		expect(result.slamLevel).toBe(32); // ceil(80*0.39) = ceil(31.2) = 32
	});

	it("returns correct values for CYA = 100", () => {
		const result = calculateFcTarget(100);
		expect(result.min).toBe(8);
		expect(result.target).toBe(12);
		expect(result.max).toBe(13);
		expect(result.slamLevel).toBe(39);
	});

	it("interpolates between table values (CYA = 35)", () => {
		const result = calculateFcTarget(35);
		// Between CYA 30 (min=2, low=4, high=6) and CYA 40 (min=3, low=5, high=7)
		expect(result.min).toBe(3); // max(round(2.5), round(35*0.075=2.625)) = max(3,3)=3
		expect(result.max).toBe(7); // round(6.5)
		expect(result.slamLevel).toBe(14); // ceil(35*0.39)=ceil(13.65)=14
	});

	it("interpolates for CYA = 45", () => {
		const result = calculateFcTarget(45);
		expect(result.min).toBe(4); // max(round(3.5), round(45*0.075=3.375)) = max(4,3)=4
		expect(result.slamLevel).toBe(18); // ceil(45*0.39)=ceil(17.55)=18
	});

	it("uses minimum FC formula when it exceeds table value", () => {
		// For CYA = 100: table min = 8, formula min = 100*0.075 = 7.5 -> round=8
		// Both agree, so min = 8
		const result = calculateFcTarget(100);
		expect(result.min).toBe(8);
	});

	it("clamps minimum FC to at least 1.0 for CYA = 0", () => {
		const result = calculateFcTarget(0);
		// CYA*0.075 = 0, max(0, 1.0) = 1.0
		expect(result.min).toBe(1);
	});

	it("extrapolates for CYA above 100", () => {
		const result = calculateFcTarget(120);
		// Extrapolates linearly from CYA 80-100 range
		expect(result.min).toBeGreaterThanOrEqual(9);
		expect(result.slamLevel).toBe(47); // ceil(120*0.39)
	});

	it("handles negative CYA by clamping to 0", () => {
		const result = calculateFcTarget(-10);
		expect(result.min).toBe(1);
		expect(result.target).toBe(2);
		expect(result.max).toBe(3);
		expect(result.slamLevel).toBe(10);
	});

	it("SLAM level is always at least 10", () => {
		expect(calculateFcTarget(0).slamLevel).toBe(10);
		expect(calculateFcTarget(10).slamLevel).toBe(10);
		expect(calculateFcTarget(25).slamLevel).toBe(10);
	});

	it("SLAM level = ceil(CYA * 0.39) for CYA >= 26", () => {
		expect(calculateFcTarget(26).slamLevel).toBe(11); // ceil(26*0.39)=ceil(10.14)=11
		expect(calculateFcTarget(50).slamLevel).toBe(20); // ceil(50*0.39)=ceil(19.5)=20
	});
});
