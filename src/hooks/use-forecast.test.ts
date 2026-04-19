import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type {
	DailySunExposure,
	HourlySunData,
	Pool,
	SunExposureResult,
	WaterTest,
} from "../types";
import { useForecast } from "./use-forecast";

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

function makeSunDay(): DailySunExposure {
	return {
		date: "2026-04-19",
		sunrise: "06:00",
		sunset: "18:00",
		daylightHours: 12,
		peakSunHours: 5,
		effectiveSunHours: 5,
		avgCloudCover: 0,
		maxUvIndex: 8,
		avgTemperatureC: 30,
		hourly: Array.from({ length: 24 }, (_, h) => makeHour(h)),
	};
}

const pool: Pool = {
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
};

const sunExposure: SunExposureResult = {
	poolId: "pool-1",
	fetchedAt: "2026-04-19T00:00:00Z",
	dataSource: "fallback",
	daily: Array.from({ length: 7 }, () => makeSunDay()),
};

const now = new Date("2026-04-19T06:00:00Z");

describe("useForecast", () => {
	it("returns null when pool is null", () => {
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
		const { result } = renderHook(() =>
			useForecast(null, tests, sunExposure, now),
		);
		expect(result.current).toBeNull();
	});

	it("returns null when sunExposure is null", () => {
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
		const { result } = renderHook(() => useForecast(pool, tests, null, now));
		expect(result.current).toBeNull();
	});

	it("returns forecast with test-needed action when tests are empty", () => {
		const { result } = renderHook(() =>
			useForecast(pool, [], sunExposure, now),
		);
		expect(result.current).not.toBeNull();
		// biome-ignore lint/style/noNonNullAssertion: asserted not null above
		expect(result.current!.nextAction.type).toBe("test");
		// biome-ignore lint/style/noNonNullAssertion: asserted not null above
		expect(result.current!.nextAction.priority).toBe("urgent");
	});

	it("returns ForecastResult with valid data", () => {
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
		const { result } = renderHook(() =>
			useForecast(pool, tests, sunExposure, now),
		);

		expect(result.current).not.toBeNull();
		// biome-ignore lint/style/noNonNullAssertion: asserted not null above
		expect(result.current!.poolId).toBe("pool-1");
		// biome-ignore lint/style/noNonNullAssertion: asserted not null above
		expect(result.current!.hourly).toHaveLength(168);
		// biome-ignore lint/style/noNonNullAssertion: asserted not null above
		expect(result.current!.nextAction).toBeDefined();
	});

	it("memoizes result for same inputs", () => {
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
		const { result, rerender } = renderHook(() =>
			useForecast(pool, tests, sunExposure, now),
		);

		const first = result.current;
		rerender();
		expect(result.current).toBe(first);
	});
});
