export interface HourlySunData {
	hour: number;
	ghiWm2: number;
	uvIndex: number;
	cloudCover: number;
	temperatureC: number;
	sunAltitudeDeg: number;
}

export interface DailySunExposure {
	date: string;
	sunrise: string;
	sunset: string;
	daylightHours: number;
	peakSunHours: number;
	effectiveSunHours: number;
	avgCloudCover: number;
	maxUvIndex: number;
	avgTemperatureC: number;
	hourly: HourlySunData[];
}

export interface SunExposureResult {
	poolId: string;
	fetchedAt: string;
	dataSource: "api" | "cached" | "fallback";
	daily: DailySunExposure[];
}

export interface OpenMeteoHourlyResponse {
	time: string[];
	shortwave_radiation: number[];
	direct_radiation: number[];
	diffuse_radiation: number[];
	cloud_cover: number[];
	uv_index: number[];
	uv_index_clear_sky: number[];
	temperature_2m: number[];
}

export interface OpenMeteoResponse {
	latitude: number;
	longitude: number;
	timezone: string;
	hourly: OpenMeteoHourlyResponse;
}

export interface SolarCacheEntry {
	data: OpenMeteoResponse;
	fetchedAt: number;
}
