import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSolarCacheStore } from "../../stores/solar-cache-store";
import type { OpenMeteoResponse, Pool } from "../../types";
import { computeSunExposure } from "./index";

function createMockPool(overrides: Partial<Pool> = {}): Pool {
	return {
		id: "pool-1",
		name: "Test Pool",
		latitude: 33.4484,
		longitude: -112.074,
		volumeGallons: 15000,
		surfaceType: "plaster",
		chlorineSource: "liquid",
		treeCoverPercent: 0,
		isIndoor: false,
		targetFc: null,
		targetPh: 7.4,
		notes: "",
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
		...overrides,
	};
}

function createMockApiResponse(): OpenMeteoResponse {
	const times: string[] = [];
	const shortwave: number[] = [];
	const direct: number[] = [];
	const diffuse: number[] = [];
	const cloudCover: number[] = [];
	const uvIndex: number[] = [];
	const uvIndexClearSky: number[] = [];
	const temperature: number[] = [];

	for (let d = 0; d < 7; d++) {
		const dateStr = `2026-06-${String(21 + d).padStart(2, "0")}`;
		for (let h = 0; h < 24; h++) {
			times.push(`${dateStr}T${String(h).padStart(2, "0")}:00`);
			const isDaytime = h >= 6 && h <= 18;
			const ghi = isDaytime
				? 500 + 100 * Math.sin(((h - 6) / 12) * Math.PI)
				: 0;
			shortwave.push(ghi);
			direct.push(ghi * 0.7);
			diffuse.push(ghi * 0.3);
			cloudCover.push(20);
			uvIndex.push(isDaytime ? 6 : 0);
			uvIndexClearSky.push(isDaytime ? 8 : 0);
			temperature.push(isDaytime ? 35 : 25);
		}
	}

	return {
		latitude: 33.45,
		longitude: -112.07,
		timezone: "America/Phoenix",
		hourly: {
			time: times,
			shortwave_radiation: shortwave,
			direct_radiation: direct,
			diffuse_radiation: diffuse,
			cloud_cover: cloudCover,
			uv_index: uvIndex,
			uv_index_clear_sky: uvIndexClearSky,
			temperature_2m: temperature,
		},
	};
}

describe("computeSunExposure", () => {
	beforeEach(() => {
		act(() => {
			useSolarCacheStore.getState().clearCache();
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns API data source on successful fetch", async () => {
		const mockResponse = createMockApiResponse();
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify(mockResponse), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);

		const pool = createMockPool();
		const result = await computeSunExposure(pool);

		expect(result.dataSource).toBe("api");
		expect(result.poolId).toBe("pool-1");
		expect(result.daily).toHaveLength(7);
		expect(result.fetchedAt).toBeDefined();
	});

	it("returns 7 daily entries with correct structure", async () => {
		const mockResponse = createMockApiResponse();
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify(mockResponse), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);

		const pool = createMockPool();
		const result = await computeSunExposure(pool);

		for (const day of result.daily) {
			expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			expect(day.sunrise).toBeDefined();
			expect(day.sunset).toBeDefined();
			expect(day.daylightHours).toBeGreaterThan(0);
			expect(day.peakSunHours).toBeGreaterThan(0);
			expect(day.effectiveSunHours).toBeGreaterThanOrEqual(0);
			expect(day.hourly).toHaveLength(24);
		}
	});

	it("applies tree factor to effective sun hours", async () => {
		const mockResponse = createMockApiResponse();
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify(mockResponse), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);

		const pool = createMockPool({ treeCoverPercent: 25 });
		const result = await computeSunExposure(pool);

		for (const day of result.daily) {
			// tree_factor for 25% ≈ 0.63
			expect(day.effectiveSunHours).toBeLessThan(day.peakSunHours);
			expect(day.effectiveSunHours).toBeCloseTo(
				day.peakSunHours * (1 - 0.25 ** 0.7),
				1,
			);
		}
	});

	it("sets all sun exposure to 0 for indoor pools", async () => {
		const mockResponse = createMockApiResponse();
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify(mockResponse), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);

		const pool = createMockPool({ isIndoor: true });
		const result = await computeSunExposure(pool);

		for (const day of result.daily) {
			expect(day.peakSunHours).toBe(0);
			expect(day.effectiveSunHours).toBe(0);
		}
	});

	it("returns cached data when available", async () => {
		const mockResponse = createMockApiResponse();
		act(() => {
			useSolarCacheStore
				.getState()
				.setCachedData(33.4484, -112.074, mockResponse);
		});

		const fetchSpy = vi.spyOn(globalThis, "fetch");
		const pool = createMockPool();
		const result = await computeSunExposure(pool);

		expect(result.dataSource).toBe("cached");
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it("falls back when API fails", async () => {
		vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

		const pool = createMockPool();
		const result = await computeSunExposure(pool);

		expect(result.dataSource).toBe("fallback");
		expect(result.daily).toHaveLength(7);
		for (const day of result.daily) {
			expect(day.peakSunHours).toBeGreaterThan(0);
			expect(day.hourly).toEqual([]);
		}
	});

	it("applies tree factor in fallback mode", async () => {
		vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

		const pool = createMockPool({ treeCoverPercent: 50 });
		const result = await computeSunExposure(pool);

		for (const day of result.daily) {
			expect(day.effectiveSunHours).toBeLessThan(day.peakSunHours);
		}
	});

	it("returns 0 effective sun hours for indoor pool in fallback mode", async () => {
		vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

		const pool = createMockPool({ isIndoor: true });
		const result = await computeSunExposure(pool);

		for (const day of result.daily) {
			expect(day.effectiveSunHours).toBe(0);
		}
	});

	it("caches API response after successful fetch", async () => {
		const mockResponse = createMockApiResponse();
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify(mockResponse), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);

		const pool = createMockPool();
		await computeSunExposure(pool);

		const cached = useSolarCacheStore
			.getState()
			.getCachedData(33.4484, -112.074);
		expect(cached).not.toBeNull();
	});
});
