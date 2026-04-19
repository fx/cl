/**
 * useForecast hook — orchestrates the forecast pipeline with memoization.
 *
 * Re-computes only when pool, tests, or sun exposure data change.
 */

import { useMemo } from "react";
import { generateForecast } from "../lib/chemistry/pipeline";
import type {
	ForecastResult,
	Pool,
	SunExposureResult,
	WaterTest,
} from "../types";

/**
 * Generate a memoized forecast for a pool.
 *
 * @param pool - Pool configuration (null if not loaded)
 * @param tests - Water tests for the pool
 * @param sunExposure - Sun exposure data (null if not loaded)
 * @param now - Current time (for testing; defaults to Date.now)
 */
export function useForecast(
	pool: Pool | null,
	tests: WaterTest[],
	sunExposure: SunExposureResult | null,
	now?: Date,
): ForecastResult | null {
	return useMemo(() => {
		if (!pool || !sunExposure) return null;

		return generateForecast(pool, tests, sunExposure, now);
	}, [pool, tests, sunExposure, now]);
}
