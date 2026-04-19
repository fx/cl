import type { DailySunExposure } from "../../types";
import { getSunAltitude, getSunTimes, type SunTimes } from "./suncalc";

const AVERAGE_CLOUD_FACTOR = 0.75;

export function estimatePSH(sunTimes: SunTimes, lat: number, lng: number): number {
	const maxAltDeg = getSunAltitude(sunTimes.solarNoon, lat, lng);
	const maxAltRad = (maxAltDeg * Math.PI) / 180;
	const sinAlt = Math.sin(maxAltRad);
	if (sinAlt <= 0) return 0;

	const dayLengthFraction = sunTimes.daylightHours / 24;

	return 12 * sinAlt * dayLengthFraction * AVERAGE_CLOUD_FACTOR;
}

export function calculateCMF(cloudCoverPercent: number): number {
	return 1 - 0.6 * (cloudCoverPercent / 100);
}

export function buildFallbackDay(
	date: Date,
	lat: number,
	lng: number,
): DailySunExposure {
	const sunTimes = getSunTimes(date, lat, lng);
	const psh = estimatePSH(sunTimes, lat, lng);
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	const dateStr = `${y}-${m}-${d}`;

	return {
		date: dateStr,
		sunrise: sunTimes.sunrise.toISOString(),
		sunset: sunTimes.sunset.toISOString(),
		daylightHours: sunTimes.daylightHours,
		peakSunHours: psh,
		effectiveSunHours: psh,
		avgCloudCover: 25,
		maxUvIndex: 0,
		avgTemperatureC: 0,
		hourly: [],
	};
}
