/**
 * Forecast warnings — CYA creep, stale tests, pH, LSI.
 */

import type { DoseEvent, ForecastWarning, Pool, WaterTest } from "../../types";
import { calculateLsi } from "./lsi";

const STALE_TEST_HOURS = 72;
const VERY_STALE_TEST_HOURS = 168;
const CYA_WARNING_THRESHOLD = 60;
const CYA_HIGH_THRESHOLD = 80;
const PH_LOW = 7.2;
const PH_HIGH = 7.6;

/**
 * Generate warnings from pool state, tests, and forecast results.
 */
export function generateWarnings(
	pool: Pool,
	tests: WaterTest[],
	doseEvents: DoseEvent[],
	now: Date,
): ForecastWarning[] {
	const warnings: ForecastWarning[] = [];

	const sorted = [...tests].sort(
		(a, b) => new Date(b.testedAt).getTime() - new Date(a.testedAt).getTime(),
	);

	const latestFcTest = sorted.find((t) => t.fc != null);
	const latestPhTest = sorted.find((t) => t.ph != null);
	const latestCyaTest = sorted.find((t) => t.cya != null);

	// Stale test warning
	if (latestFcTest) {
		const hoursSince =
			(now.getTime() - new Date(latestFcTest.testedAt).getTime()) /
			(1000 * 60 * 60);

		if (hoursSince >= VERY_STALE_TEST_HOURS) {
			warnings.push({
				type: "stale_test",
				severity: "urgent",
				title: "Forecast unreliable",
				description: `Last FC test was ${Math.floor(hoursSince / 24)} days ago. Test your water for an accurate forecast.`,
			});
		} else if (hoursSince >= STALE_TEST_HOURS) {
			warnings.push({
				type: "stale_test",
				severity: "warning",
				title: "Test data getting stale",
				description: `Last FC test was ${Math.floor(hoursSince / 24)} days ago. Test your water soon.`,
			});
		}
	}

	// No CYA test warning
	if (!latestCyaTest) {
		warnings.push({
			type: "no_cya_test",
			severity: "warning",
			title: "CYA level unknown",
			description:
				"No CYA reading on file. Test cyanuric acid for accurate FC targeting.",
		});
	}

	// CYA accumulation for dichlor/trichlor
	const currentCya = latestCyaTest?.cya ?? 0;
	if (pool.chlorineSource === "dichlor" || pool.chlorineSource === "trichlor") {
		const totalCyaIncrease = doseEvents.reduce(
			(sum, e) => sum + e.cyaIncrease,
			0,
		);
		const projectedCya = currentCya + totalCyaIncrease;

		if (currentCya >= CYA_HIGH_THRESHOLD) {
			warnings.push({
				type: "cya_high",
				severity: "urgent",
				title: "CYA too high",
				description: `CYA is ${currentCya} ppm. Switch to liquid chlorine to stop CYA buildup.`,
			});
		} else if (projectedCya >= CYA_HIGH_THRESHOLD) {
			warnings.push({
				type: "cya_rising",
				severity: "warning",
				title: "CYA rising",
				description: `CYA projected to reach ${Math.round(projectedCya)} ppm. Consider switching to liquid chlorine.`,
			});
		} else if (currentCya >= CYA_WARNING_THRESHOLD) {
			warnings.push({
				type: "cya_rising",
				severity: "info",
				title: "Monitor CYA level",
				description: `CYA is ${currentCya} ppm. Watch for further increases with ${pool.chlorineSource} use.`,
			});
		}
	}

	// pH out of range
	if (latestPhTest?.ph != null) {
		const ph = latestPhTest.ph;
		if (ph < PH_LOW) {
			warnings.push({
				type: "ph_out_of_range",
				severity: "warning",
				title: "pH too low",
				description: `pH is ${ph}. Add soda ash to raise above ${PH_LOW}.`,
			});
		} else if (ph > PH_HIGH) {
			warnings.push({
				type: "ph_out_of_range",
				severity: "warning",
				title: "pH too high",
				description: `pH is ${ph}. Add muriatic acid to lower below ${PH_HIGH}.`,
			});
		}
	}

	// LSI warning
	const ta = findLatestValue(sorted, "ta");
	const ch = findLatestValue(sorted, "ch");
	const tempF = findLatestValue(sorted, "tempF");

	if (latestPhTest?.ph != null && ta != null && ch != null && tempF != null) {
		const lsiResult = calculateLsi(latestPhTest.ph, ta, ch, tempF);
		if (lsiResult && lsiResult.status !== "balanced") {
			warnings.push({
				type: "lsi_imbalanced",
				severity: "warning",
				title:
					lsiResult.status === "corrosive"
						? "Water is corrosive"
						: "Water is scale-forming",
				description: `LSI is ${lsiResult.lsi}. ${
					lsiResult.status === "corrosive"
						? "Raise pH or calcium hardness."
						: "Lower pH or calcium hardness."
				}`,
			});
		}
	}

	return warnings;
}

function findLatestValue(
	sortedTests: WaterTest[],
	key: keyof WaterTest,
): number | null {
	for (const test of sortedTests) {
		const val = test[key];
		if (val != null && typeof val === "number") return val;
	}
	return null;
}
