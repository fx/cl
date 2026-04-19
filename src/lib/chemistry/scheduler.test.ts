import { describe, expect, it } from "vitest";
import type { ForecastHour } from "../../types";
import { findDoseEvents, simulateWithDoses } from "./scheduler";

/** Build a mock ForecastHour */
function makeHourly(
	count: number,
	startFc: number,
	decayRate: number,
	startTime: Date,
): ForecastHour[] {
	const hours: ForecastHour[] = [];
	let fc = startFc;

	for (let h = 0; h < count; h++) {
		const time = new Date(startTime.getTime() + h * 3600_000);
		hours.push({
			time: time.toISOString(),
			predictedFc: Math.round(fc * 1000) / 1000,
			kTotal: decayRate,
			kUv: decayRate * 0.7,
			kDemand: decayRate * 0.3,
			effectiveGhi: h % 24 >= 6 && h % 24 < 18 ? 500 : 0,
			temperatureC: 30,
			isDaytime: h % 24 >= 6 && h % 24 < 18,
		});
		fc = fc * Math.exp(-decayRate);
	}

	return hours;
}

describe("findDoseEvents", () => {
	// Start at midnight so 6 PM is hour 18
	const startTime = new Date("2026-04-19T00:00:00Z");

	it("returns no doses when FC stays above threshold", () => {
		// Very slow decay: FC stays well above minimum
		const hourly = makeHourly(168, 10.0, 0.001, startTime);
		const events = findDoseEvents({
			hourly,
			minFc: 3,
			targetFc: 6,
			volumeGallons: 15000,
			chlorineSource: "liquid",
			startTime,
		});
		expect(events).toHaveLength(0);
	});

	it("schedules a dose when FC approaches minimum", () => {
		// Moderate decay: FC 6 → drops to ~4 after 24h
		const hourly = makeHourly(168, 6.0, 0.017, startTime);
		const events = findDoseEvents({
			hourly,
			minFc: 3,
			targetFc: 6,
			volumeGallons: 15000,
			chlorineSource: "liquid",
			startTime,
		});
		expect(events.length).toBeGreaterThanOrEqual(1);
	});

	it("snaps dose time to evening (6 PM)", () => {
		const hourly = makeHourly(168, 6.0, 0.02, startTime);
		const events = findDoseEvents({
			hourly,
			minFc: 3,
			targetFc: 6,
			volumeGallons: 15000,
			chlorineSource: "liquid",
			startTime,
		});

		if (events.length > 0) {
			const doseDate = new Date(events[0].time);
			expect(doseDate.getUTCHours()).toBe(18);
		}
	});

	it("calculates correct product amount", () => {
		const hourly = makeHourly(168, 6.0, 0.04, startTime);
		const events = findDoseEvents({
			hourly,
			minFc: 3,
			targetFc: 6,
			volumeGallons: 15000,
			chlorineSource: "liquid",
			startTime,
		});

		if (events.length > 0) {
			expect(events[0].ppmToAdd).toBeGreaterThan(0);
			expect(events[0].productAmount).toContain("liquid chlorine");
			expect(events[0].productAmountMl).toBeGreaterThan(0);
		}
	});

	it("dose fcBefore is less than fcAfter", () => {
		const hourly = makeHourly(168, 6.0, 0.04, startTime);
		const events = findDoseEvents({
			hourly,
			minFc: 3,
			targetFc: 6,
			volumeGallons: 15000,
			chlorineSource: "liquid",
			startTime,
		});

		for (const event of events) {
			expect(event.fcBefore).toBeLessThan(event.fcAfter);
		}
	});

	it("returns cyaIncrease=0 for liquid chlorine", () => {
		const hourly = makeHourly(168, 6.0, 0.04, startTime);
		const events = findDoseEvents({
			hourly,
			minFc: 3,
			targetFc: 6,
			volumeGallons: 15000,
			chlorineSource: "liquid",
			startTime,
		});

		for (const event of events) {
			expect(event.cyaIncrease).toBe(0);
		}
	});

	it("returns positive cyaIncrease for trichlor", () => {
		const hourly = makeHourly(168, 6.0, 0.04, startTime);
		const events = findDoseEvents({
			hourly,
			minFc: 3,
			targetFc: 6,
			volumeGallons: 15000,
			chlorineSource: "trichlor",
			startTime,
		});

		if (events.length > 0) {
			expect(events[0].cyaIncrease).toBeGreaterThan(0);
		}
	});

	it("handles dose near end of forecast (no evening available)", () => {
		// FC drops below threshold very late in the forecast
		const hourly = makeHourly(168, 10.0, 0.002, startTime);
		// Manually set FC at hour 166 to be in threshold zone
		hourly[166] = { ...hourly[166], predictedFc: 3.8 };
		const events = findDoseEvents({
			hourly,
			minFc: 3,
			targetFc: 6,
			volumeGallons: 15000,
			chlorineSource: "liquid",
			startTime,
		});
		// Should either find a dose or gracefully handle no evening available
		// The result should be valid regardless
		for (const event of events) {
			expect(event.ppmToAdd).toBeGreaterThan(0);
		}
	});

	it("handles SWG pool (returns no product amount)", () => {
		const hourly = makeHourly(168, 6.0, 0.04, startTime);
		const events = findDoseEvents({
			hourly,
			minFc: 3,
			targetFc: 6,
			volumeGallons: 15000,
			chlorineSource: "swg",
			startTime,
		});
		// SWG returns null from calculateDose, so productAmount = "N/A"
		for (const event of events) {
			expect(event.productAmount).toBe("N/A");
		}
	});

	it("handles weight-based products (cal_hypo)", () => {
		const hourly = makeHourly(168, 6.0, 0.04, startTime);
		const events = findDoseEvents({
			hourly,
			minFc: 3,
			targetFc: 6,
			volumeGallons: 15000,
			chlorineSource: "cal_hypo",
			startTime,
		});
		if (events.length > 0) {
			expect(events[0].productAmount).toContain("cal-hypo");
		}
	});

	it("spaces doses at least 12 hours apart", () => {
		// Fast decay to trigger multiple doses
		const hourly = makeHourly(168, 6.0, 0.08, startTime);
		const events = findDoseEvents({
			hourly,
			minFc: 3,
			targetFc: 6,
			volumeGallons: 15000,
			chlorineSource: "liquid",
			startTime,
		});

		for (let i = 1; i < events.length; i++) {
			const prev = new Date(events[i - 1].time).getTime();
			const curr = new Date(events[i].time).getTime();
			expect(curr - prev).toBeGreaterThanOrEqual(12 * 3600_000);
		}
	});
});

describe("simulateWithDoses", () => {
	const startTime = new Date("2026-04-19T00:00:00Z");

	it("raises FC at dose points", () => {
		const hourly = makeHourly(168, 6.0, 0.04, startTime);
		const { hourly: updated, doseEvents } = simulateWithDoses(
			hourly,
			3,
			6,
			15000,
			"liquid",
			startTime,
		);

		if (doseEvents.length > 0) {
			const doseIdx = updated.findIndex((h) => h.time === doseEvents[0].time);
			expect(updated[doseIdx].predictedFc).toBeCloseTo(6.0, 1);
		}
	});

	it("FC continues to decay after dose", () => {
		const hourly = makeHourly(168, 6.0, 0.04, startTime);
		const { hourly: updated, doseEvents } = simulateWithDoses(
			hourly,
			3,
			6,
			15000,
			"liquid",
			startTime,
		);

		if (doseEvents.length > 0) {
			const doseIdx = updated.findIndex((h) => h.time === doseEvents[0].time);
			if (doseIdx < updated.length - 1) {
				expect(updated[doseIdx + 1].predictedFc).toBeLessThan(
					updated[doseIdx].predictedFc,
				);
			}
		}
	});

	it("returns same length hourly array", () => {
		const hourly = makeHourly(168, 6.0, 0.04, startTime);
		const { hourly: updated } = simulateWithDoses(
			hourly,
			3,
			6,
			15000,
			"liquid",
			startTime,
		);
		expect(updated).toHaveLength(168);
	});

	it("keeps FC higher than raw simulation when doses applied", () => {
		const hourly = makeHourly(168, 6.0, 0.04, startTime);
		const { hourly: updated, doseEvents } = simulateWithDoses(
			hourly,
			3,
			6,
			15000,
			"liquid",
			startTime,
		);

		if (doseEvents.length > 0) {
			// At the end, FC should be higher due to doses
			const lastRaw = hourly[167].predictedFc;
			const lastDosed = updated[167].predictedFc;
			expect(lastDosed).toBeGreaterThan(lastRaw);
		}
	});
});
