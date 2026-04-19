/**
 * NextAction determination — analyze forecast to produce a single
 * actionable recommendation: dose, test, or ok.
 */

import type { DoseEvent, ForecastHour, NextAction } from "../../types";

const STALE_TEST_HOURS = 72; // 3 days
const VERY_STALE_TEST_HOURS = 168; // 7 days
const URGENT_HOURS = 24; // dose within 24h = urgent

/**
 * Determine the next action based on forecast state and test freshness.
 *
 * Priority logic:
 *   1. If last test is > 3 days old → type="test"
 *   2. If a dose event exists → type="dose" (urgent if within 24h)
 *   3. Otherwise → type="ok"
 */
export function determineNextAction(
	hourly: ForecastHour[],
	doseEvents: DoseEvent[],
	minFc: number,
	lastTestTime: Date | null,
	now: Date,
): NextAction {
	// Check test freshness first
	if (lastTestTime) {
		const hoursSinceTest =
			(now.getTime() - lastTestTime.getTime()) / (1000 * 60 * 60);

		if (hoursSinceTest >= VERY_STALE_TEST_HOURS) {
			return {
				type: "test",
				priority: "urgent",
				title: "Test your water",
				description: `Last test was ${Math.floor(hoursSinceTest / 24)} days ago. Test to update your forecast.`,
			};
		}

		if (hoursSinceTest >= STALE_TEST_HOURS) {
			return {
				type: "test",
				priority: "warning",
				title: "Test your water",
				description: `Last test was ${Math.floor(hoursSinceTest / 24)} days ago. Test to update your forecast.`,
			};
		}
	} else {
		return {
			type: "test",
			priority: "urgent",
			title: "Log your first water test",
			description:
				"No test data available. Log a water test to generate a forecast.",
		};
	}

	// Check dose events
	if (doseEvents.length > 0) {
		const nextDose = doseEvents[0];
		const doseTime = new Date(nextDose.time);
		const hoursUntilDose =
			(doseTime.getTime() - now.getTime()) / (1000 * 60 * 60);

		const isUrgent = hoursUntilDose <= URGENT_HOURS;
		const timeDescription = formatTimeUntil(hoursUntilDose);

		return {
			type: "dose",
			priority: isUrgent ? "urgent" : "warning",
			title: `Add chlorine ${timeDescription}`,
			description: `FC will drop below ${minFc} ppm. Add ${nextDose.productAmount} to restore to ${nextDose.fcAfter} ppm.`,
			doseEvent: nextDose,
		};
	}

	// All good — find how long FC stays in range
	const hoursInRange = hourly.findIndex((h) => h.predictedFc < minFc);
	const daysInRange = hoursInRange === -1 ? 7 : Math.floor(hoursInRange / 24);

	return {
		type: "ok",
		priority: "info",
		title: "Chlorine levels look good",
		description:
			daysInRange >= 7
				? "FC stays in range for the full 7-day forecast."
				: `FC stays in range for ${daysInRange}+ days.`,
	};
}

function formatTimeUntil(hours: number): string {
	if (hours <= 0) return "now";
	if (hours < 1) return "within the hour";
	if (hours < 24) return "today";
	if (hours < 48) return "by tomorrow";
	const days = Math.floor(hours / 24);
	return `in ${days} days`;
}
