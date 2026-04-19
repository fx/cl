import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenMeteoResponse } from "../types";
import {
	buildCacheKey,
	isCacheValid,
	useSolarCacheStore,
} from "./solar-cache-store";

const mockResponse: OpenMeteoResponse = {
	latitude: 33.45,
	longitude: -112.07,
	timezone: "America/Phoenix",
	hourly: {
		time: ["2026-06-21T00:00"],
		shortwave_radiation: [0],
		direct_radiation: [0],
		diffuse_radiation: [0],
		cloud_cover: [0],
		uv_index: [0],
		uv_index_clear_sky: [0],
		temperature_2m: [25],
	},
};

describe("buildCacheKey", () => {
	it("rounds to 2 decimal places", () => {
		expect(buildCacheKey(33.4484, -112.074)).toBe("33.45,-112.07");
	});

	it("pads short decimals", () => {
		expect(buildCacheKey(33.4, -112)).toBe("33.40,-112.00");
	});

	it("handles negative values", () => {
		expect(buildCacheKey(-33.8688, 151.2093)).toBe("-33.87,151.21");
	});

	it("normalizes -0 to 0", () => {
		expect(buildCacheKey(-0.001, 0.001)).toBe("0.00,0.00");
	});
});

describe("isCacheValid", () => {
	it("returns true for fresh entry", () => {
		const entry = { data: mockResponse, fetchedAt: Date.now() };
		expect(isCacheValid(entry, Date.now())).toBe(true);
	});

	it("returns false for expired entry (> 1 hour)", () => {
		const oneHourAgo = Date.now() - 61 * 60 * 1000;
		const entry = { data: mockResponse, fetchedAt: oneHourAgo };
		expect(isCacheValid(entry, Date.now())).toBe(false);
	});

	it("returns true for entry just under 1 hour", () => {
		const justUnder = Date.now() - 59 * 60 * 1000;
		const entry = { data: mockResponse, fetchedAt: justUnder };
		expect(isCacheValid(entry, Date.now())).toBe(true);
	});
});

describe("useSolarCacheStore", () => {
	beforeEach(() => {
		act(() => {
			useSolarCacheStore.getState().clearCache();
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns null for uncached coordinates", () => {
		const result = useSolarCacheStore.getState().getCachedData(33.45, -112.07);
		expect(result).toBeNull();
	});

	it("stores and retrieves cached data", () => {
		act(() => {
			useSolarCacheStore.getState().setCachedData(33.45, -112.07, mockResponse);
		});

		const result = useSolarCacheStore.getState().getCachedData(33.45, -112.07);
		expect(result).toEqual(mockResponse);
	});

	it("returns null for expired cache entries", () => {
		vi.spyOn(Date, "now").mockReturnValue(1000);
		act(() => {
			useSolarCacheStore.getState().setCachedData(33.45, -112.07, mockResponse);
		});

		vi.spyOn(Date, "now").mockReturnValue(1000 + 2 * 60 * 60 * 1000);
		const result = useSolarCacheStore.getState().getCachedData(33.45, -112.07);
		expect(result).toBeNull();
	});

	it("removes expired entries from cache on access", () => {
		vi.spyOn(Date, "now").mockReturnValue(1000);
		act(() => {
			useSolarCacheStore.getState().setCachedData(33.45, -112.07, mockResponse);
		});

		vi.spyOn(Date, "now").mockReturnValue(1000 + 2 * 60 * 60 * 1000);
		useSolarCacheStore.getState().getCachedData(33.45, -112.07);

		// Entry should be removed from the cache map
		expect(useSolarCacheStore.getState().cache).toEqual({});
	});

	it("matches coordinates rounded to 2 decimal places", () => {
		act(() => {
			useSolarCacheStore
				.getState()
				.setCachedData(33.4484, -112.074, mockResponse);
		});

		const result = useSolarCacheStore
			.getState()
			.getCachedData(33.449, -112.073);
		expect(result).toEqual(mockResponse);
	});

	it("clears all cache entries", () => {
		act(() => {
			useSolarCacheStore.getState().setCachedData(33.45, -112.07, mockResponse);
			useSolarCacheStore.getState().setCachedData(47.6, -122.33, mockResponse);
			useSolarCacheStore.getState().clearCache();
		});

		expect(
			useSolarCacheStore.getState().getCachedData(33.45, -112.07),
		).toBeNull();
		expect(
			useSolarCacheStore.getState().getCachedData(47.6, -122.33),
		).toBeNull();
	});

	it("stores entries for different coordinates independently", () => {
		const response2: OpenMeteoResponse = {
			...mockResponse,
			latitude: 47.6,
			longitude: -122.33,
		};

		act(() => {
			useSolarCacheStore.getState().setCachedData(33.45, -112.07, mockResponse);
			useSolarCacheStore.getState().setCachedData(47.6, -122.33, response2);
		});

		expect(
			useSolarCacheStore.getState().getCachedData(33.45, -112.07)?.latitude,
		).toBe(33.45);
		expect(
			useSolarCacheStore.getState().getCachedData(47.6, -122.33)?.latitude,
		).toBe(47.6);
	});

	describe("getCacheEntry", () => {
		it("returns null for uncached coordinates", () => {
			const result = useSolarCacheStore
				.getState()
				.getCacheEntry(33.45, -112.07);
			expect(result).toBeNull();
		});

		it("returns full entry with fetchedAt timestamp", () => {
			const timestamp = 1719000000000;
			vi.spyOn(Date, "now").mockReturnValue(timestamp);
			act(() => {
				useSolarCacheStore
					.getState()
					.setCachedData(33.45, -112.07, mockResponse);
			});

			const entry = useSolarCacheStore.getState().getCacheEntry(33.45, -112.07);
			expect(entry).not.toBeNull();
			expect(entry?.data).toEqual(mockResponse);
			expect(entry?.fetchedAt).toBe(timestamp);
		});

		it("returns null and cleans up expired entries", () => {
			vi.spyOn(Date, "now").mockReturnValue(1000);
			act(() => {
				useSolarCacheStore
					.getState()
					.setCachedData(33.45, -112.07, mockResponse);
			});

			vi.spyOn(Date, "now").mockReturnValue(1000 + 2 * 60 * 60 * 1000);
			const entry = useSolarCacheStore.getState().getCacheEntry(33.45, -112.07);
			expect(entry).toBeNull();
			expect(useSolarCacheStore.getState().cache).toEqual({});
		});
	});
});
