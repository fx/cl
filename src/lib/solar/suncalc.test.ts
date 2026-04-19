import { describe, expect, it } from "vitest";
import { getMaxSunAltitude, getSunAltitude, getSunTimes } from "./suncalc";

describe("getSunTimes", () => {
	it("returns sunrise, sunset, solarNoon, and daylightHours for Phoenix summer solstice", () => {
		const date = new Date("2026-06-21T12:00:00");
		const result = getSunTimes(date, 33.4484, -112.074);

		expect(result.sunrise).toBeInstanceOf(Date);
		expect(result.sunset).toBeInstanceOf(Date);
		expect(result.solarNoon).toBeInstanceOf(Date);
		expect(result.daylightHours).toBeGreaterThan(14);
		expect(result.daylightHours).toBeLessThan(15);
	});

	it("returns shorter daylight hours for Seattle winter solstice", () => {
		const date = new Date("2026-12-21T12:00:00");
		const result = getSunTimes(date, 47.6062, -122.3321);

		expect(result.daylightHours).toBeGreaterThan(8);
		expect(result.daylightHours).toBeLessThan(9);
	});

	it("returns longer daylight hours for Seattle summer solstice", () => {
		const date = new Date("2026-06-21T12:00:00");
		const result = getSunTimes(date, 47.6062, -122.3321);

		expect(result.daylightHours).toBeGreaterThan(15.5);
		expect(result.daylightHours).toBeLessThan(16.5);
	});

	it("sunrise is before sunset", () => {
		const date = new Date("2026-03-21T12:00:00");
		const result = getSunTimes(date, 33.4484, -112.074);

		expect(result.sunrise.getTime()).toBeLessThan(result.sunset.getTime());
	});

	it("solar noon is between sunrise and sunset", () => {
		const date = new Date("2026-06-21T12:00:00");
		const result = getSunTimes(date, 33.4484, -112.074);

		expect(result.solarNoon.getTime()).toBeGreaterThan(
			result.sunrise.getTime(),
		);
		expect(result.solarNoon.getTime()).toBeLessThan(result.sunset.getTime());
	});
});

describe("getSunAltitude", () => {
	it("returns positive altitude during daytime", () => {
		const noon = new Date("2026-06-21T19:00:00Z"); // ~noon in Phoenix
		const altitude = getSunAltitude(noon, 33.4484, -112.074);

		expect(altitude).toBeGreaterThan(0);
	});

	it("returns negative altitude at night", () => {
		const night = new Date("2026-06-21T05:00:00Z"); // ~10pm in Phoenix
		const altitude = getSunAltitude(night, 33.4484, -112.074);

		expect(altitude).toBeLessThan(0);
	});
});

describe("getMaxSunAltitude", () => {
	it("returns high altitude for Phoenix summer", () => {
		const date = new Date("2026-06-21T12:00:00");
		const maxAlt = getMaxSunAltitude(date, 33.4484, -112.074);

		expect(maxAlt).toBeGreaterThan(75);
		expect(maxAlt).toBeLessThan(90);
	});

	it("returns lower altitude for Seattle winter", () => {
		const date = new Date("2026-12-21T12:00:00");
		const maxAlt = getMaxSunAltitude(date, 47.6062, -122.3321);

		expect(maxAlt).toBeGreaterThan(15);
		expect(maxAlt).toBeLessThan(25);
	});

	it("returns higher altitude for equator", () => {
		const date = new Date("2026-03-21T12:00:00");
		const maxAlt = getMaxSunAltitude(date, 0, 0);

		expect(maxAlt).toBeGreaterThan(85);
	});
});
