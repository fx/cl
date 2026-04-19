import { describe, expect, it, vi } from "vitest";
import type { OpenMeteoResponse } from "../../types";
import {
	buildOpenMeteoUrl,
	fetchSolarData,
	parseHourlyData,
	parseResponse,
} from "./open-meteo";

function createMockResponse(days: number = 1): OpenMeteoResponse {
	const times: string[] = [];
	const shortwave: number[] = [];
	const direct: number[] = [];
	const diffuse: number[] = [];
	const cloudCover: number[] = [];
	const uvIndex: number[] = [];
	const uvIndexClearSky: number[] = [];
	const temperature: number[] = [];

	for (let d = 0; d < days; d++) {
		const dateStr = `2026-06-${String(21 + d).padStart(2, "0")}`;
		for (let h = 0; h < 24; h++) {
			times.push(`${dateStr}T${String(h).padStart(2, "0")}:00`);
			const isDaytime = h >= 6 && h <= 18;
			const ghi = isDaytime
				? 500 + 300 * Math.sin(((h - 6) / 12) * Math.PI)
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

describe("buildOpenMeteoUrl", () => {
	it("builds a valid URL with correct parameters", () => {
		const url = buildOpenMeteoUrl(33.4484, -112.074);

		expect(url).toContain("https://api.open-meteo.com/v1/forecast?");
		expect(url).toContain("latitude=33.4484");
		expect(url).toContain("longitude=-112.074");
		expect(url).toContain("shortwave_radiation");
		expect(url).toContain("direct_radiation");
		expect(url).toContain("diffuse_radiation");
		expect(url).toContain("cloud_cover");
		expect(url).toContain("uv_index");
		expect(url).toContain("uv_index_clear_sky");
		expect(url).toContain("temperature_2m");
		expect(url).toContain("forecast_days=7");
		expect(url).toContain("timezone=auto");
	});

	it("handles negative coordinates", () => {
		const url = buildOpenMeteoUrl(-33.8688, 151.2093);
		expect(url).toContain("latitude=-33.8688");
		expect(url).toContain("longitude=151.2093");
	});
});

describe("fetchSolarData", () => {
	it("calls fetch with the correct URL", async () => {
		const mockResponse = createMockResponse();
		const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify(mockResponse), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);

		const result = await fetchSolarData(33.4484, -112.074);

		expect(fetchSpy).toHaveBeenCalledOnce();
		const calledUrl = fetchSpy.mock.calls[0][0] as string;
		expect(calledUrl).toContain("latitude=33.4484");
		expect(result.latitude).toBe(33.45);

		fetchSpy.mockRestore();
	});

	it("throws on non-OK response", async () => {
		const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response("Server Error", {
				status: 500,
				statusText: "Internal Server Error",
			}),
		);

		await expect(fetchSolarData(33.4484, -112.074)).rejects.toThrow(
			"Open-Meteo API error: 500 Internal Server Error",
		);

		fetchSpy.mockRestore();
	});
});

describe("parseHourlyData", () => {
	it("parses hourly data with correct fields", () => {
		const times = ["2026-06-21T12:00", "2026-06-21T13:00"];
		const shortwave = [800, 750];
		const uv = [8, 7];
		const cloud = [10, 15];
		const temp = [35, 34];

		const result = parseHourlyData(
			times,
			shortwave,
			uv,
			cloud,
			temp,
			33.45,
			-112.07,
		);

		expect(result).toHaveLength(2);
		expect(result[0].hour).toBe(12);
		expect(result[0].ghiWm2).toBe(800);
		expect(result[0].uvIndex).toBe(8);
		expect(result[0].cloudCover).toBe(10);
		expect(result[0].temperatureC).toBe(35);
		expect(typeof result[0].sunAltitudeDeg).toBe("number");
	});

	it("handles missing values with defaults", () => {
		const times = ["2026-06-21T12:00"];
		// biome-ignore lint/suspicious/noExplicitAny: testing undefined fallback
		const shortwave = [undefined as any];
		// biome-ignore lint/suspicious/noExplicitAny: testing undefined fallback
		const uv = [undefined as any];
		// biome-ignore lint/suspicious/noExplicitAny: testing undefined fallback
		const cloud = [undefined as any];
		// biome-ignore lint/suspicious/noExplicitAny: testing undefined fallback
		const temp = [undefined as any];

		const result = parseHourlyData(
			times,
			shortwave,
			uv,
			cloud,
			temp,
			33.45,
			-112.07,
		);

		expect(result[0].ghiWm2).toBe(0);
		expect(result[0].uvIndex).toBe(0);
		expect(result[0].cloudCover).toBe(0);
		expect(result[0].temperatureC).toBe(0);
	});
});

describe("parseResponse", () => {
	it("parses a single day correctly", () => {
		const response = createMockResponse(1);
		const days = parseResponse(response);

		expect(days).toHaveLength(1);
		expect(days[0].date).toBe("2026-06-21");
		expect(days[0].hourly).toHaveLength(24);
		expect(days[0].peakSunHours).toBeGreaterThan(0);
		expect(days[0].sunrise).toBeDefined();
		expect(days[0].sunset).toBeDefined();
		expect(days[0].daylightHours).toBeGreaterThan(13);
	});

	it("parses multiple days", () => {
		const response = createMockResponse(3);
		const days = parseResponse(response);

		expect(days).toHaveLength(3);
		expect(days[0].date).toBe("2026-06-21");
		expect(days[1].date).toBe("2026-06-22");
		expect(days[2].date).toBe("2026-06-23");
	});

	it("calculates PSH from shortwave radiation", () => {
		const response = createMockResponse(1);
		const days = parseResponse(response);

		const totalGhi = response.hourly.shortwave_radiation.reduce(
			(sum, v) => sum + v,
			0,
		);
		expect(days[0].peakSunHours).toBeCloseTo(totalGhi / 1000, 1);
	});

	it("calculates average cloud cover", () => {
		const response = createMockResponse(1);
		const days = parseResponse(response);

		expect(days[0].avgCloudCover).toBeCloseTo(20, 0);
	});

	it("calculates max UV index", () => {
		const response = createMockResponse(1);
		const days = parseResponse(response);

		expect(days[0].maxUvIndex).toBe(6);
	});

	it("calculates average temperature", () => {
		const response = createMockResponse(1);
		const days = parseResponse(response);

		expect(days[0].avgTemperatureC).toBeGreaterThan(25);
		expect(days[0].avgTemperatureC).toBeLessThan(35);
	});

	it("handles undefined values in response arrays with fallback to 0", () => {
		const response = createMockResponse(1);
		// Set some values to undefined to test ?? 0 branches
		// biome-ignore lint/suspicious/noExplicitAny: testing undefined fallback in API response
		(response.hourly.shortwave_radiation as any[])[0] = undefined;
		// biome-ignore lint/suspicious/noExplicitAny: testing undefined fallback in API response
		(response.hourly.cloud_cover as any[])[0] = undefined;
		// biome-ignore lint/suspicious/noExplicitAny: testing undefined fallback in API response
		(response.hourly.uv_index as any[])[0] = undefined;
		// biome-ignore lint/suspicious/noExplicitAny: testing undefined fallback in API response
		(response.hourly.temperature_2m as any[])[0] = undefined;

		const days = parseResponse(response);

		expect(days).toHaveLength(1);
		// Should still produce valid output without throwing
		expect(days[0].peakSunHours).toBeGreaterThanOrEqual(0);
		expect(days[0].avgCloudCover).toBeGreaterThanOrEqual(0);
		expect(days[0].maxUvIndex).toBeGreaterThanOrEqual(0);
		expect(days[0].avgTemperatureC).toBeGreaterThanOrEqual(0);
	});

	it("sets effectiveSunHours equal to PSH (before tree factor)", () => {
		const response = createMockResponse(1);
		const days = parseResponse(response);

		expect(days[0].effectiveSunHours).toBe(days[0].peakSunHours);
	});
});
