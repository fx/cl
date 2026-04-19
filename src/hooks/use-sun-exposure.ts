import { useEffect, useState } from "react";
import { computeSunExposure } from "../lib/solar";
import type { Pool, SunExposureResult } from "../types";

/**
 * Fetch and cache sun exposure data for a pool.
 * Returns null while loading.
 */
export function useSunExposure(pool: Pool | null): SunExposureResult | null {
	const [data, setData] = useState<SunExposureResult | null>(null);

	useEffect(() => {
		if (!pool) {
			setData(null);
			return;
		}

		let cancelled = false;

		computeSunExposure(pool).then((result) => {
			if (!cancelled) setData(result);
		});

		return () => {
			cancelled = true;
		};
	}, [pool]);

	return data;
}
