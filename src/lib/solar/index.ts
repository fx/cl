import { useSolarCacheStore } from "../../stores/solar-cache-store";
import type { Pool, SunExposureResult } from "../../types";
import { calculateEffectiveSunHours, calculateTreeFactor } from "./exposure";
import { buildFallbackDay } from "./fallback";
import { fetchSolarData, parseResponse } from "./open-meteo";

function applyTreeFactor(
	result: SunExposureResult,
	pool: Pool,
): SunExposureResult {
	if (pool.isIndoor) {
		return {
			...result,
			daily: result.daily.map((day) => ({
				...day,
				peakSunHours: 0,
				effectiveSunHours: 0,
			})),
		};
	}

	const treeFactor = calculateTreeFactor(pool.treeCoverPercent);

	return {
		...result,
		daily: result.daily.map((day) => ({
			...day,
			effectiveSunHours: calculateEffectiveSunHours(
				day.peakSunHours,
				treeFactor,
			),
		})),
	};
}

export async function computeSunExposure(
	pool: Pool,
): Promise<SunExposureResult> {
	const { latitude, longitude } = pool;
	const store = useSolarCacheStore.getState();
	const now = new Date().toISOString();

	// Check cache
	const cacheEntry = store.getCacheEntry(latitude, longitude);
	if (cacheEntry) {
		const daily = parseResponse(cacheEntry.data);
		return applyTreeFactor(
			{
				poolId: pool.id,
				fetchedAt: new Date(cacheEntry.fetchedAt).toISOString(),
				dataSource: "cached",
				daily,
			},
			pool,
		);
	}

	// Try API
	try {
		const response = await fetchSolarData(latitude, longitude);
		store.setCachedData(latitude, longitude, response);
		const daily = parseResponse(response);

		return applyTreeFactor(
			{
				poolId: pool.id,
				fetchedAt: now,
				dataSource: "api",
				daily,
			},
			pool,
		);
	} catch {
		// Fallback
		const today = new Date();
		const daily = Array.from({ length: 7 }, (_, i) => {
			const date = new Date(today);
			date.setDate(today.getDate() + i);
			return buildFallbackDay(date, latitude, longitude);
		});

		return applyTreeFactor(
			{
				poolId: pool.id,
				fetchedAt: now,
				dataSource: "fallback",
				daily,
			},
			pool,
		);
	}
}

export {
	calculateEffectiveSunHours,
	calculatePSH,
	calculateTreeFactor,
} from "./exposure";
export { buildFallbackDay, calculateCMF, estimatePSH } from "./fallback";
export {
	buildOpenMeteoUrl,
	fetchSolarData,
	parseHourlyData,
	parseResponse,
} from "./open-meteo";
export { getMaxSunAltitude, getSunAltitude, getSunTimes } from "./suncalc";
