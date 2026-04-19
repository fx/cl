/**
 * Dose scheduler — walks forecast hours and inserts dose events
 * when FC approaches the minimum threshold.
 *
 * Doses are snapped to the next evening (6 PM local) for convenience.
 */

import type { ChlorineSource, DoseEvent, ForecastHour } from "../../types";
import { calculateDose } from "./dosing";

const DOSE_BUFFER_PPM = 1;
const EVENING_HOUR = 18; // 6 PM local

export interface SchedulerInput {
	hourly: ForecastHour[];
	minFc: number;
	targetFc: number;
	volumeGallons: number;
	chlorineSource: ChlorineSource;
	startTime: Date;
}

/**
 * Find the next evening (hour 18) at or after the given hour index.
 */
function snapToEvening(hourIndex: number, startTime: Date): number {
	const startHourOfDay = startTime.getHours();

	for (let h = hourIndex; h < 168; h++) {
		const hourOfDay = (startHourOfDay + h) % 24;
		if (hourOfDay === EVENING_HOUR) {
			return h;
		}
	}

	// If no evening found before end, use the trigger hour
	return hourIndex;
}

/**
 * Walk the forecast and find dose events.
 *
 * When FC drops within DOSE_BUFFER_PPM of minFc, schedule a dose
 * snapped to the next 6 PM. After dosing, FC jumps to targetFc
 * and simulation continues.
 */
export function findDoseEvents(input: SchedulerInput): DoseEvent[] {
	const { hourly, minFc, targetFc, volumeGallons, chlorineSource, startTime } =
		input;

	const threshold = minFc + DOSE_BUFFER_PPM;
	const events: DoseEvent[] = [];
	let lastDoseHour = -25; // Ensure first dose can fire

	for (let h = 0; h < hourly.length; h++) {
		const fc = hourly[h].predictedFc;

		// Check if FC is within buffer zone
		if (fc <= threshold && h - lastDoseHour >= 12) {
			// Snap to next evening
			const doseHour = snapToEvening(h, startTime);
			if (doseHour >= hourly.length) continue;

			const fcAtDose = hourly[doseHour].predictedFc;
			const ppmToAdd = targetFc - fcAtDose;

			if (ppmToAdd <= 0) continue;

			const dose = calculateDose(
				volumeGallons,
				fcAtDose,
				targetFc,
				chlorineSource,
			);

			const productAmount = dose?.formatted ?? "N/A";
			// Convert to ml: fl oz * 29.5735 or oz * 28.3495 (weight — approximate)
			const productAmountMl = dose
				? dose.unit === "fl oz"
					? Math.round(dose.amount * 29.5735)
					: Math.round(dose.amount * 28.3495)
				: 0;

			events.push({
				time: hourly[doseHour].time,
				fcBefore: Math.round(fcAtDose * 100) / 100,
				fcAfter: Math.round(targetFc * 100) / 100,
				ppmToAdd: Math.round(ppmToAdd * 100) / 100,
				productAmount,
				productAmountMl,
				cyaIncrease: dose?.cyaIncrease ?? 0,
			});

			lastDoseHour = doseHour;
		}
	}

	return events;
}

/**
 * Run the simulation with dose insertion.
 *
 * This re-walks the hourly array and inserts doses, recomputing FC
 * from each dose point forward. Returns updated hourly + dose events.
 */
export function simulateWithDoses(
	hourly: ForecastHour[],
	minFc: number,
	targetFc: number,
	volumeGallons: number,
	chlorineSource: ChlorineSource,
	startTime: Date,
): { hourly: ForecastHour[]; doseEvents: DoseEvent[] } {
	const threshold = minFc + DOSE_BUFFER_PPM;
	const doseEvents: DoseEvent[] = [];
	const updated = hourly.map((h) => ({ ...h }));
	let lastDoseHour = -25;

	for (let h = 0; h < updated.length; h++) {
		if (updated[h].predictedFc <= threshold && h - lastDoseHour >= 12) {
			const doseHour = snapToEvening(h, startTime);
			if (doseHour >= updated.length) continue;

			const fcAtDose = updated[doseHour].predictedFc;
			const ppmToAdd = targetFc - fcAtDose;
			if (ppmToAdd <= 0) continue;

			const dose = calculateDose(
				volumeGallons,
				fcAtDose,
				targetFc,
				chlorineSource,
			);

			const productAmount = dose?.formatted ?? "N/A";
			const productAmountMl = dose
				? dose.unit === "fl oz"
					? Math.round(dose.amount * 29.5735)
					: Math.round(dose.amount * 28.3495)
				: 0;

			doseEvents.push({
				time: updated[doseHour].time,
				fcBefore: Math.round(fcAtDose * 100) / 100,
				fcAfter: Math.round(targetFc * 100) / 100,
				ppmToAdd: Math.round(ppmToAdd * 100) / 100,
				productAmount,
				productAmountMl,
				cyaIncrease: dose?.cyaIncrease ?? 0,
			});

			// Apply dose and re-decay subsequent hours
			updated[doseHour] = {
				...updated[doseHour],
				predictedFc: Math.round(targetFc * 1000) / 1000,
			};

			let fc = targetFc;
			for (let j = doseHour + 1; j < updated.length; j++) {
				fc = fc * Math.exp(-updated[j].kTotal * 1);

				// Check if there's already a future dose event at this hour
				const existingDose = doseEvents.find((e) => e.time === updated[j].time);
				if (existingDose) break;

				updated[j] = {
					...updated[j],
					predictedFc: Math.round(fc * 1000) / 1000,
				};
			}

			lastDoseHour = doseHour;
		}
	}

	return { hourly: updated, doseEvents };
}
