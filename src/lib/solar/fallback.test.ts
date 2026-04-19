import { describe, expect, it } from "vitest";
import { getSunTimes } from "./suncalc";
import { buildFallbackDay, calculateCMF, estimatePSH } from "./fallback";

describe("estimatePSH", () => {
	it("returns a reasonable PSH for Phoenix summer", () => {
		const date = new Date("2026-06-21T12:00:00");
		const sunTimes = getSunTimes(date, 33.4484, -112.074);
		const psh = estimatePSH(sunTimes, 33.4484, -112.074);

		expect(psh).toBeGreaterThan(4);
		expect(psh).toBeLessThan(9);
	});

	it("returns lower PSH for Seattle winter", () => {
		const date = new Date("2026-12-21T12:00:00");
		const sunTimes = getSunTimes(date, 47.6062, -122.3321);
		const psh = estimatePSH(sunTimes, 47.6062, -122.3321);

		expect(psh).toBeGreaterThan(0.5);
		expect(psh).toBeLessThan(4);
	});

	it("returns higher PSH for equator equinox", () => {
		const date = new Date("2026-03-21T12:00:00");
		const sunTimes = getSunTimes(date, 0, 0);
		const psh = estimatePSH(sunTimes, 0, 0);

		expect(psh).toBeGreaterThan(3);
		expect(psh).toBeLessThan(6);
	});

	it("returns 0 when sun never rises (polar night)", () => {
		const date = new Date("2026-12-21T12:00:00");
		const sunTimes = getSunTimes(date, 75, 0);
		const psh = estimatePSH(sunTimes, 75, 0);

		expect(psh).toBe(0);
	});
});

describe("calculateCMF", () => {
	it("returns 1.0 for 0% cloud cover", () => {
		expect(calculateCMF(0)).toBe(1);
	});

	it("returns 0.4 for 100% cloud cover", () => {
		expect(calculateCMF(100)).toBeCloseTo(0.4, 2);
	});

	it("returns 0.52 for 80% cloud cover (spec scenario)", () => {
		expect(calculateCMF(80)).toBeCloseTo(0.52, 2);
	});

	it("returns 0.7 for 50% cloud cover", () => {
		expect(calculateCMF(50)).toBeCloseTo(0.7, 2);
	});
});

describe("buildFallbackDay", () => {
	it("returns a valid DailySunExposure", () => {
		const date = new Date("2026-06-21T12:00:00");
		const day = buildFallbackDay(date, 33.4484, -112.074);

		expect(day.date).toBe("2026-06-21");
		expect(day.sunrise).toBeDefined();
		expect(day.sunset).toBeDefined();
		expect(day.daylightHours).toBeGreaterThan(14);
		expect(day.peakSunHours).toBeGreaterThan(0);
		expect(day.effectiveSunHours).toBe(day.peakSunHours);
		expect(day.avgCloudCover).toBe(25);
		expect(day.maxUvIndex).toBe(0);
		expect(day.avgTemperatureC).toBe(0);
		expect(day.hourly).toEqual([]);
	});

	it("returns sunrise/sunset as ISO strings", () => {
		const date = new Date("2026-06-21T12:00:00");
		const day = buildFallbackDay(date, 33.4484, -112.074);

		expect(() => new Date(day.sunrise)).not.toThrow();
		expect(() => new Date(day.sunset)).not.toThrow();
	});

	it("returns lower PSH for winter days", () => {
		const summer = buildFallbackDay(
			new Date("2026-06-21T12:00:00"),
			33.4484,
			-112.074,
		);
		const winter = buildFallbackDay(
			new Date("2026-12-21T12:00:00"),
			33.4484,
			-112.074,
		);

		expect(summer.peakSunHours).toBeGreaterThan(winter.peakSunHours);
	});
});
