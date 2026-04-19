import type {
	DailySunExposure,
	HourlySunData,
	OpenMeteoResponse,
} from "../../types";
import { getSunAltitude, getSunTimes } from "./suncalc";

const HOURLY_PARAMS = [
	"shortwave_radiation",
	"direct_radiation",
	"diffuse_radiation",
	"cloud_cover",
	"uv_index",
	"uv_index_clear_sky",
	"temperature_2m",
].join(",");

export function buildOpenMeteoUrl(lat: number, lng: number): string {
	const params = new URLSearchParams({
		latitude: lat.toString(),
		longitude: lng.toString(),
		hourly: HOURLY_PARAMS,
		forecast_days: "7",
		timezone: "auto",
	});
	return `https://api.open-meteo.com/v1/forecast?${params}`;
}

export async function fetchSolarData(
	lat: number,
	lng: number,
): Promise<OpenMeteoResponse> {
	const url = buildOpenMeteoUrl(lat, lng);
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(
			`Open-Meteo API error: ${response.status} ${response.statusText}`,
		);
	}
	return response.json() as Promise<OpenMeteoResponse>;
}

export function parseHourlyData(
	times: string[],
	shortwave: number[],
	uvIndex: number[],
	cloudCover: number[],
	temperature: number[],
	lat: number,
	lng: number,
): HourlySunData[] {
	return times.map((time, i) => {
		const date = new Date(time);
		return {
			hour: date.getHours(),
			ghiWm2: shortwave[i] ?? 0,
			uvIndex: uvIndex[i] ?? 0,
			cloudCover: cloudCover[i] ?? 0,
			temperatureC: temperature[i] ?? 0,
			sunAltitudeDeg: getSunAltitude(date, lat, lng),
		};
	});
}

function groupByDate(times: string[]): Map<string, number[]> {
	const groups = new Map<string, number[]>();
	for (let i = 0; i < times.length; i++) {
		const dateStr = times[i].slice(0, 10);
		const indices = groups.get(dateStr);
		if (indices) {
			indices.push(i);
		} else {
			groups.set(dateStr, [i]);
		}
	}
	return groups;
}

export function parseResponse(response: OpenMeteoResponse): DailySunExposure[] {
	const { hourly, latitude, longitude } = response;
	const groups = groupByDate(hourly.time);
	const days: DailySunExposure[] = [];

	for (const [dateStr, indices] of groups) {
		const date = new Date(`${dateStr}T12:00:00`);
		const sunTimes = getSunTimes(date, latitude, longitude);

		const hourlyData = parseHourlyData(
			indices.map((i) => hourly.time[i]),
			indices.map((i) => hourly.shortwave_radiation[i]),
			indices.map((i) => hourly.uv_index[i]),
			indices.map((i) => hourly.cloud_cover[i]),
			indices.map((i) => hourly.temperature_2m[i]),
			latitude,
			longitude,
		);

		const totalGhi = indices.reduce(
			(sum, i) => sum + (hourly.shortwave_radiation[i] ?? 0),
			0,
		);
		const psh = totalGhi / 1000;

		const cloudValues = indices.map((i) => hourly.cloud_cover[i] ?? 0);
		const avgCloud =
			cloudValues.reduce((sum, v) => sum + v, 0) / cloudValues.length;

		const uvValues = indices.map((i) => hourly.uv_index[i] ?? 0);
		const maxUv = Math.max(...uvValues);

		const tempValues = indices.map((i) => hourly.temperature_2m[i] ?? 0);
		const avgTemp =
			tempValues.reduce((sum, v) => sum + v, 0) / tempValues.length;

		days.push({
			date: dateStr,
			sunrise: sunTimes.sunrise.toISOString(),
			sunset: sunTimes.sunset.toISOString(),
			daylightHours: sunTimes.daylightHours,
			peakSunHours: psh,
			effectiveSunHours: psh,
			avgCloudCover: avgCloud,
			maxUvIndex: maxUv,
			avgTemperatureC: avgTemp,
			hourly: hourlyData,
		});
	}

	return days;
}
