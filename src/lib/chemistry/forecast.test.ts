import { describe, expect, it } from "vitest";
import type { DailySunExposure, HourlySunData } from "../../types";
import type { SimulationInput } from "./forecast";
import { simulateHourly } from "./forecast";

/** Build a minimal HourlySunData for testing */
function makeHour(overrides: Partial<HourlySunData> = {}): HourlySunData {
	return {
		hour: 0,
		ghiWm2: 0,
		uvIndex: 0,
		cloudCover: 0,
		temperatureC: 25,
		sunAltitudeDeg: 0,
		...overrides,
	};
}

/** Build a day with realistic sun pattern: sun up hours 6-18, GHI peaks at noon */
function makeSunnyDay(tempC = 30): DailySunExposure {
	const hourly: HourlySunData[] = [];
	for (let h = 0; h < 24; h++) {
		const isSunUp = h >= 6 && h < 18;
		// Simple bell curve peaking at hour 12
		const ghiFactor = isSunUp ? Math.sin(((h - 6) / 12) * Math.PI) : 0;
		hourly.push(
			makeHour({
				hour: h,
				ghiWm2: Math.round(ghiFactor * 800),
				uvIndex: isSunUp ? ghiFactor * 8 : 0,
				temperatureC: tempC,
				sunAltitudeDeg: isSunUp ? ghiFactor * 60 : -10,
			}),
		);
	}

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
		hourly,
	};
}

/** Build a night-only day (0 GHI everywhere) */
function makeDarkDay(tempC = 25): DailySunExposure {
	const hourly: HourlySunData[] = [];
	for (let h = 0; h < 24; h++) {
		hourly.push(
			makeHour({ hour: h, temperatureC: tempC, sunAltitudeDeg: -10 }),
		);
	}

	return {
		date: "2026-04-19",
		sunrise: "06:00",
		sunset: "18:00",
		daylightHours: 0,
		peakSunHours: 0,
		effectiveSunHours: 0,
		avgCloudCover: 100,
		maxUvIndex: 0,
		avgTemperatureC: tempC,
		hourly,
	};
}

function makeInput(overrides: Partial<SimulationInput> = {}): SimulationInput {
	return {
		startFc: 6.0,
		cya: 40,
		treeCoverPercent: 0,
		isIndoor: false,
		sunData: Array(7).fill(makeSunnyDay()),
		tests: [],
		...overrides,
	};
}

describe("simulateHourly", () => {
	const startTime = new Date("2026-04-19T06:00:00Z");

	it("returns 168 hours", () => {
		const result = simulateHourly(makeInput(), startTime);
		expect(result).toHaveLength(168);
	});

	it("starts with the initial FC", () => {
		const result = simulateHourly(makeInput({ startFc: 5.5 }), startTime);
		expect(result[0].predictedFc).toBe(5.5);
	});

	it("FC declines over time", () => {
		const result = simulateHourly(makeInput(), startTime);
		expect(result[24].predictedFc).toBeLessThan(result[0].predictedFc);
		expect(result[48].predictedFc).toBeLessThan(result[24].predictedFc);
	});

	it("FC never goes negative", () => {
		const result = simulateHourly(makeInput({ startFc: 1.0 }), startTime);
		for (const hour of result) {
			expect(hour.predictedFc).toBeGreaterThanOrEqual(0);
		}
	});

	it("daytime decay is faster than nighttime", () => {
		const result = simulateHourly(makeInput(), startTime);
		// Compare decay at hour 6 (noon GHI peak) vs hour 18 (night)
		// kTotal during day should be higher
		const dayHour = result.find((h) => h.effectiveGhi > 500);
		const nightHour = result.find((h) => h.effectiveGhi === 0);
		expect(dayHour).toBeDefined();
		expect(nightHour).toBeDefined();
		// biome-ignore lint/style/noNonNullAssertion: asserted defined above
		expect(dayHour!.kTotal).toBeGreaterThan(
			// biome-ignore lint/style/noNonNullAssertion: asserted defined above
			nightHour!.kTotal,
		);
	});

	it("indoor pools have zero UV decay", () => {
		const result = simulateHourly(makeInput({ isIndoor: true }), startTime);
		for (const hour of result) {
			expect(hour.kUv).toBe(0);
			expect(hour.effectiveGhi).toBe(0);
		}
	});

	it("tree cover reduces effective GHI", () => {
		const noTreeResult = simulateHourly(
			makeInput({ treeCoverPercent: 0 }),
			startTime,
		);
		const treeResult = simulateHourly(
			makeInput({ treeCoverPercent: 50 }),
			startTime,
		);

		// Find a daytime hour with significant GHI to compare (noon = hour 12 in sun pattern)
		const dayIdx = 12;
		expect(noTreeResult[dayIdx].effectiveGhi).toBeGreaterThan(0);
		expect(treeResult[dayIdx].effectiveGhi).toBeLessThan(
			noTreeResult[dayIdx].effectiveGhi,
		);
	});

	it("high CYA slows UV decay", () => {
		const lowCya = simulateHourly(makeInput({ cya: 0 }), startTime);
		const highCya = simulateHourly(makeInput({ cya: 80 }), startTime);

		// After 24 hours, high CYA pool should have more FC
		expect(highCya[24].predictedFc).toBeGreaterThan(lowCya[24].predictedFc);
	});

	it("night-only scenario: slow demand-only decay", () => {
		const result = simulateHourly(
			makeInput({ sunData: Array(7).fill(makeDarkDay(25)) }),
			startTime,
		);

		// At 25C (77F), k_demand ≈ 0.02. After 24h: 6 * exp(-0.02*24) ≈ 3.7
		expect(result[24].predictedFc).toBeCloseTo(3.7, 0);
	});

	it("timestamps are sequential hourly", () => {
		const result = simulateHourly(makeInput(), startTime);
		for (let i = 1; i < result.length; i++) {
			const prev = new Date(result[i - 1].time).getTime();
			const curr = new Date(result[i].time).getTime();
			expect(curr - prev).toBe(3600_000);
		}
	});

	it("applies scheduled doses", () => {
		const schedule = new Map([[12, 3.0]]);
		const result = simulateHourly(
			makeInput({ doseSchedule: schedule }),
			startTime,
		);

		// FC at hour 13 should be higher than hour 11 due to dose at 12
		expect(result[13].predictedFc).toBeGreaterThan(result[11].predictedFc);
	});

	it("repeats last day pattern when sun data runs out", () => {
		// Only provide 3 days of data, but simulation runs 7
		const result = simulateHourly(
			makeInput({ sunData: [makeSunnyDay(), makeSunnyDay(), makeSunnyDay()] }),
			startTime,
		);
		expect(result).toHaveLength(168);
		// Day 6 data should still work (uses last available day's pattern)
		expect(result[144].temperatureC).toBe(30);
	});

	it("falls back to last hour when hourOfDay exceeds hourly length", () => {
		// Create a day with only 12 hours of data
		const shortDay: DailySunExposure = {
			date: "2026-04-19",
			sunrise: "06:00",
			sunset: "18:00",
			daylightHours: 12,
			peakSunHours: 5,
			effectiveSunHours: 5,
			avgCloudCover: 0,
			maxUvIndex: 8,
			avgTemperatureC: 30,
			hourly: Array.from({ length: 12 }, (_, h) =>
				makeHour({
					hour: h,
					temperatureC: 28,
					ghiWm2: 500,
					sunAltitudeDeg: 30,
				}),
			),
		};
		const result = simulateHourly(
			makeInput({ sunData: Array(7).fill(shortDay) }),
			startTime,
		);
		expect(result).toHaveLength(168);
		// Hour 20 (8 PM) would exceed the 12-hour data — should use last available
		expect(result[20].temperatureC).toBe(28);
	});

	it("blends with learned rate when tests provide observed rates", () => {
		const now = new Date("2026-04-19T06:00:00Z");
		const tests = [
			{
				id: "t1",
				poolId: "p1",
				testedAt: new Date(now.getTime() - 4 * 3600_000).toISOString(),
				createdAt: new Date(now.getTime() - 4 * 3600_000).toISOString(),
				fc: 5.0,
			},
			{
				id: "t2",
				poolId: "p1",
				testedAt: new Date(now.getTime() - 2 * 3600_000).toISOString(),
				createdAt: new Date(now.getTime() - 2 * 3600_000).toISOString(),
				fc: 4.5,
			},
			{
				id: "t3",
				poolId: "p1",
				testedAt: new Date(now.getTime() - 28 * 3600_000).toISOString(),
				createdAt: new Date(now.getTime() - 28 * 3600_000).toISOString(),
				fc: 6.0,
			},
			{
				id: "t4",
				poolId: "p1",
				testedAt: new Date(now.getTime() - 24 * 3600_000).toISOString(),
				createdAt: new Date(now.getTime() - 24 * 3600_000).toISOString(),
				fc: 5.0,
			},
		];
		const result = simulateHourly(makeInput({ tests }), startTime);
		// Should still produce valid forecast
		expect(result).toHaveLength(168);
		expect(result[0].predictedFc).toBe(6.0);
	});

	it("handles sun data with empty hourly arrays", () => {
		const emptyDay: DailySunExposure = {
			date: "2026-04-19",
			sunrise: "06:00",
			sunset: "18:00",
			daylightHours: 0,
			peakSunHours: 0,
			effectiveSunHours: 0,
			avgCloudCover: 0,
			maxUvIndex: 0,
			avgTemperatureC: 25,
			hourly: [],
		};
		const result = simulateHourly(
			makeInput({ sunData: Array(7).fill(emptyDay) }),
			startTime,
		);
		expect(result).toHaveLength(168);
		// Should use fallback temperature of 25C
		expect(result[0].temperatureC).toBe(25);
		expect(result[0].effectiveGhi).toBe(0);
	});

	it("records isDaytime correctly", () => {
		const result = simulateHourly(makeInput(), startTime);
		// At the start (hour 0 = 6 AM with sun data starting at h=0 which is midnight of day pattern)
		// sunAltitudeDeg > 0 for hours 6-17 in our pattern
		const dayHours = result.filter((h) => h.isDaytime);
		const nightHours = result.filter((h) => !h.isDaytime);
		expect(dayHours.length).toBeGreaterThan(0);
		expect(nightHours.length).toBeGreaterThan(0);
	});
});
