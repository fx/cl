import SunCalc from "suncalc";

export interface SunTimes {
	sunrise: Date;
	sunset: Date;
	solarNoon: Date;
	daylightHours: number;
}

export function getSunTimes(date: Date, lat: number, lng: number): SunTimes {
	const times = SunCalc.getTimes(date, lat, lng);
	const sunrise = times.sunrise;
	const sunset = times.sunset;
	const solarNoon = times.solarNoon;
	const daylightMs = sunset.getTime() - sunrise.getTime();
	const daylightHours = daylightMs / (1000 * 60 * 60);

	return {
		sunrise,
		sunset,
		solarNoon,
		daylightHours,
	};
}

export function getSunAltitude(date: Date, lat: number, lng: number): number {
	const position = SunCalc.getPosition(date, lat, lng);
	return (position.altitude * 180) / Math.PI;
}

export function getMaxSunAltitude(
	date: Date,
	lat: number,
	lng: number,
): number {
	const times = SunCalc.getTimes(date, lat, lng);
	return getSunAltitude(times.solarNoon, lat, lng);
}
