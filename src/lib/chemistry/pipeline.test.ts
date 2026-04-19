import { describe, expect, it } from "vitest";
import type {
	DailySunExposure,
	HourlySunData,
	Pool,
	SunExposureResult,
	WaterTest,
} from "../../types";
import { generateForecast } from "./pipeline";

function makeHour(h: number, tempC = 30): HourlySunData {
	const isSunUp = h >= 6 && h < 18;
	const ghiFactor = isSunUp ? Math.sin(((h - 6) / 12) * Math.PI) : 0;
	return {
		hour: h,
		ghiWm2: Math.round(ghiFactor * 800),
		uvIndex: isSunUp ? ghiFactor * 8 : 0,
		cloudCover: 0,
		temperatureC: tempC,
		sunAltitudeDeg: isSunUp ? ghiFactor * 60 : -10,
	};
}

function makeSunDay(tempC = 30): DailySunExposure {
	return {
		date: "2026-04-19",
		sunrise: "06:00",
		sunset: "18:00",
		daylightHours: 12,
		peakSunHours: 5,
		effectiveSunHours: 5,
		avgCloudCover: 0,
		maxUvIndex: 8,
		avgTemperatureC: tempC,
		hourly: Array.from({ length: 24 }, (_, h) => makeHour(h, tempC)),
	};
}

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

function makeSunExposure(): SunExposureResult {
	return {
		poolId: "pool-1",
		fetchedAt: "2026-04-19T00:00:00Z",
		dataSource: "fallback",
		daily: Array.from({ length: 7 }, () => makeSunDay()),
	};
}

const now = new Date("2026-04-19T06:00:00Z");

describe("generateForecast (integration)", () => {
	it("returns complete ForecastResult with all fields", () => {
		const pool = makePool();
		const tests: WaterTest[] = [
			{
				id: "t1",
				poolId: "pool-1",
				testedAt: new Date(now.getTime() - 6 * 3600_000).toISOString(),
				createdAt: new Date(now.getTime() - 6 * 3600_000).toISOString(),
				fc: 6.0,
				cya: 40,
			},
		];
		const sun = makeSunExposure();

		const result = generateForecast(pool, tests, sun, now);

		expect(result.poolId).toBe("pool-1");
		expect(result.startFc).toBe(6.0);
		expect(result.hourly).toHaveLength(168);
		expect(result.confidence).toBe("high");
		expect(result.nextAction).toBeDefined();
		expect(result.warnings).toBeDefined();
		expect(result.generatedAt).toBe(now.toISOString());
	});

	it("produces sawtooth FC pattern with day/night cycles", () => {
		const pool = makePool();
		const tests: WaterTest[] = [
			{
				id: "t1",
				poolId: "pool-1",
				testedAt: now.toISOString(),
				createdAt: now.toISOString(),
				fc: 6.0,
				cya: 40,
			},
		];
		const sun = makeSunExposure();
		const result = generateForecast(pool, tests, sun, now);

		// FC should decline over time
		expect(result.hourly[24].predictedFc).toBeLessThan(
			result.hourly[0].predictedFc,
		);

		// With doses, FC should show jumps (sawtooth)
		if (result.doseEvents.length > 0) {
			const doseTime = result.doseEvents[0].time;
			const doseIdx = result.hourly.findIndex((h) => h.time === doseTime);
			if (doseIdx > 0) {
				// FC at dose point should be higher than preceding hours
				expect(result.hourly[doseIdx].predictedFc).toBeGreaterThan(
					result.hourly[doseIdx - 1].predictedFc,
				);
			}
		}
	});

	it("schedules doses when FC approaches minimum", () => {
		const pool = makePool();
		const tests: WaterTest[] = [
			{
				id: "t1",
				poolId: "pool-1",
				testedAt: now.toISOString(),
				createdAt: now.toISOString(),
				fc: 6.0,
				cya: 40,
			},
		];
		const sun = makeSunExposure();
		const result = generateForecast(pool, tests, sun, now);

		// With CYA=40, min FC=3, FC starting at 6, doses should be scheduled
		expect(result.doseEvents.length).toBeGreaterThanOrEqual(1);
	});

	it("handles low confidence for old tests", () => {
		const pool = makePool();
		const tests: WaterTest[] = [
			{
				id: "t1",
				poolId: "pool-1",
				testedAt: new Date(now.getTime() - 5 * 24 * 3600_000).toISOString(),
				createdAt: new Date(now.getTime() - 5 * 24 * 3600_000).toISOString(),
				fc: 6.0,
				cya: 40,
			},
		];
		const sun = makeSunExposure();
		const result = generateForecast(pool, tests, sun, now);

		expect(result.confidence).toBe("low");
	});

	it("moderate confidence for 2-day-old test", () => {
		const pool = makePool();
		const tests: WaterTest[] = [
			{
				id: "t1",
				poolId: "pool-1",
				testedAt: new Date(now.getTime() - 48 * 3600_000).toISOString(),
				createdAt: new Date(now.getTime() - 48 * 3600_000).toISOString(),
				fc: 6.0,
				cya: 40,
			},
		];
		const sun = makeSunExposure();
		const result = generateForecast(pool, tests, sun, now);

		expect(result.confidence).toBe("moderate");
	});

	it("produces CYA warnings for trichlor pools", () => {
		const pool = makePool({ chlorineSource: "trichlor" });
		const tests: WaterTest[] = [
			{
				id: "t1",
				poolId: "pool-1",
				testedAt: now.toISOString(),
				createdAt: now.toISOString(),
				fc: 6.0,
				cya: 85,
			},
		];
		const sun = makeSunExposure();
		const result = generateForecast(pool, tests, sun, now);

		const cyaWarnings = result.warnings.filter(
			(w) => w.type === "cya_high" || w.type === "cya_rising",
		);
		expect(cyaWarnings.length).toBeGreaterThanOrEqual(1);
	});

	it("produces stale test warning for old tests", () => {
		const pool = makePool();
		const tests: WaterTest[] = [
			{
				id: "t1",
				poolId: "pool-1",
				testedAt: new Date(now.getTime() - 5 * 24 * 3600_000).toISOString(),
				createdAt: new Date(now.getTime() - 5 * 24 * 3600_000).toISOString(),
				fc: 6.0,
				cya: 40,
			},
		];
		const sun = makeSunExposure();
		const result = generateForecast(pool, tests, sun, now);

		const staleWarnings = result.warnings.filter(
			(w) => w.type === "stale_test",
		);
		expect(staleWarnings.length).toBeGreaterThanOrEqual(1);
	});

	it("nextAction reflects test needed when stale", () => {
		const pool = makePool();
		const tests: WaterTest[] = [
			{
				id: "t1",
				poolId: "pool-1",
				testedAt: new Date(now.getTime() - 4 * 24 * 3600_000).toISOString(),
				createdAt: new Date(now.getTime() - 4 * 24 * 3600_000).toISOString(),
				fc: 6.0,
				cya: 40,
			},
		];
		const sun = makeSunExposure();
		const result = generateForecast(pool, tests, sun, now);

		expect(result.nextAction.type).toBe("test");
	});

	it("returns low confidence when no FC test exists", () => {
		const pool = makePool();
		const tests: WaterTest[] = [
			{
				id: "t1",
				poolId: "pool-1",
				testedAt: now.toISOString(),
				createdAt: now.toISOString(),
				cya: 40,
				// no fc
			},
		];
		const sun = makeSunExposure();
		// Pool has no FC test, so startFc=0 and confidence=low
		const result = generateForecast(pool, tests, sun, now);
		expect(result.confidence).toBe("low");
		expect(result.startFc).toBe(0);
	});

	it("indoor pool has no UV decay", () => {
		const pool = makePool({ isIndoor: true });
		const tests: WaterTest[] = [
			{
				id: "t1",
				poolId: "pool-1",
				testedAt: now.toISOString(),
				createdAt: now.toISOString(),
				fc: 6.0,
				cya: 40,
			},
		];
		const sun = makeSunExposure();
		const result = generateForecast(pool, tests, sun, now);

		// All hours should have kUv = 0
		for (const hour of result.hourly) {
			expect(hour.kUv).toBe(0);
		}
	});

	it("handles pool with no CYA test (defaults to 0)", () => {
		const pool = makePool();
		const tests: WaterTest[] = [
			{
				id: "t1",
				poolId: "pool-1",
				testedAt: now.toISOString(),
				createdAt: now.toISOString(),
				fc: 5.0,
			},
		];
		const sun = makeSunExposure();
		const result = generateForecast(pool, tests, sun, now);

		expect(result.hourly).toHaveLength(168);
		// With CYA=0, decay is very fast (k_uv_base=1.2)
		expect(result.hourly[12].predictedFc).toBeLessThanOrEqual(2);
	});

	it("dose events have valid product amounts", () => {
		const pool = makePool();
		const tests: WaterTest[] = [
			{
				id: "t1",
				poolId: "pool-1",
				testedAt: now.toISOString(),
				createdAt: now.toISOString(),
				fc: 6.0,
				cya: 40,
			},
		];
		const sun = makeSunExposure();
		const result = generateForecast(pool, tests, sun, now);

		for (const dose of result.doseEvents) {
			expect(dose.ppmToAdd).toBeGreaterThan(0);
			expect(dose.fcAfter).toBeGreaterThan(dose.fcBefore);
			expect(dose.productAmount).toBeTruthy();
			expect(dose.productAmountMl).toBeGreaterThan(0);
		}
	});
});
