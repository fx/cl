/**
 * Evaluate overall chemistry status and produce recommendations.
 */

import type {
	ChemistryStatus,
	Pool,
	Recommendation,
	WaterTest,
} from "../../types";
import { calculateDose } from "./dosing";
import { calculateFcTarget } from "./fc-cya";
import { calculateLsi } from "./lsi";

/**
 * Evaluate chemistry for a pool based on its most recent test results.
 * @param pool - The pool configuration
 * @param tests - All water tests for the pool (newest first or any order)
 */
export function evaluateChemistry(
	pool: Pool,
	tests: WaterTest[],
): ChemistryStatus {
	const sorted = [...tests].sort(
		(a, b) => new Date(b.testedAt).getTime() - new Date(a.testedAt).getTime(),
	);

	const latest = sorted[0] as WaterTest | undefined;

	const currentFc = latest?.fc ?? null;
	const currentPh = latest?.ph ?? null;
	const currentCya = findLatestValue(sorted, "cya");
	const currentCc = latest?.cc ?? null;
	const currentTa = findLatestValue(sorted, "ta");
	const currentCh = findLatestValue(sorted, "ch");
	const currentTempF = findLatestValue(sorted, "tempF");
	const currentTds = findLatestValue(sorted, "tds");

	const recommendations: Recommendation[] = [];

	// FC status
	const fcTargets = calculateFcTarget(currentCya ?? 0);
	let fcStatus: ChemistryStatus["fcStatus"] = "ok";

	if (currentFc != null) {
		if (currentFc < fcTargets.min * 0.5) {
			fcStatus = "critical";
		} else if (currentFc < fcTargets.min) {
			fcStatus = "low";
		} else if (currentFc > fcTargets.max) {
			fcStatus = "high";
		}

		if (fcStatus === "critical" || fcStatus === "low") {
			const targetFc = pool.targetFc ?? fcTargets.target;
			const dose = calculateDose(
				pool.volumeGallons,
				currentFc,
				targetFc,
				pool.chlorineSource,
			);
			recommendations.push({
				type: "dose",
				priority: fcStatus === "critical" ? "urgent" : "warning",
				title:
					fcStatus === "critical" ? "FC critically low" : "FC below minimum",
				description: `FC is ${currentFc} ppm, minimum is ${fcTargets.min} ppm for CYA ${currentCya ?? 0}.`,
				productAmount: dose?.formatted,
			});
		}
	} else {
		recommendations.push({
			type: "test",
			priority: "info",
			title: "Test free chlorine",
			description: "No FC reading available. Test your water.",
		});
	}

	// pH status
	let phStatus: ChemistryStatus["phStatus"] = "ok";
	if (currentPh != null) {
		if (currentPh < 7.2) {
			phStatus = "low";
			recommendations.push({
				type: "warning",
				priority: "warning",
				title: "pH too low",
				description: `pH is ${currentPh}. Add soda ash to raise pH above 7.2.`,
			});
		} else if (currentPh > 7.6) {
			phStatus = "high";
			recommendations.push({
				type: "warning",
				priority: "warning",
				title: "pH too high",
				description: `pH is ${currentPh}. Add muriatic acid to lower pH below 7.6.`,
			});
		}
	}

	// CC / shock check
	if (currentCc != null && currentCc > 0.5) {
		const slamTarget = Math.max(currentCc * 10, fcTargets.slamLevel);
		const doseNeeded = slamTarget - (currentFc ?? 0);
		const shockDose =
			doseNeeded > 0
				? calculateDose(
						pool.volumeGallons,
						currentFc ?? 0,
						slamTarget,
						pool.chlorineSource,
					)
				: null;
		recommendations.push({
			type: "shock",
			priority: "urgent",
			title: "Shock recommended",
			description: `CC is ${currentCc} ppm (above 0.5). Shock to ${slamTarget} ppm to break point chlorinate.`,
			productAmount: shockDose?.formatted,
		});
	}

	// CYA warning
	if (currentCya == null) {
		recommendations.push({
			type: "test",
			priority: "info",
			title: "Test CYA level",
			description:
				"No CYA reading. Test cyanuric acid to ensure proper FC targeting.",
		});
	}

	// CYA accumulation warning for dichlor/trichlor
	if (
		currentCya != null &&
		currentCya > 70 &&
		(pool.chlorineSource === "dichlor" || pool.chlorineSource === "trichlor")
	) {
		recommendations.push({
			type: "warning",
			priority: "warning",
			title: "CYA rising — switch chlorine source",
			description: `CYA is ${currentCya} ppm. Consider switching to liquid chlorine to prevent further CYA buildup.`,
		});
	}

	// LSI
	let lsi: number | null = null;
	let lsiStatus: ChemistryStatus["lsiStatus"] = null;
	if (
		currentPh != null &&
		currentTa != null &&
		currentCh != null &&
		currentTempF != null
	) {
		const lsiResult = calculateLsi(
			currentPh,
			currentTa,
			currentCh,
			currentTempF,
			currentTds ?? 1000,
		);
		lsi = lsiResult.lsi;
		lsiStatus = lsiResult.status;

		if (lsiResult.status === "corrosive") {
			recommendations.push({
				type: "warning",
				priority: "warning",
				title: "Water is corrosive",
				description: `LSI is ${lsi}. Raise pH or calcium hardness to protect surfaces.`,
			});
		} else if (lsiResult.status === "scaling") {
			recommendations.push({
				type: "warning",
				priority: "warning",
				title: "Water is scale-forming",
				description: `LSI is ${lsi}. Lower pH or calcium hardness to prevent scale.`,
			});
		}
	}

	const fcCyaRatio =
		currentFc != null && currentCya != null && currentCya > 0
			? Math.round((currentFc / currentCya) * 1000) / 1000
			: null;

	return {
		poolId: pool.id,
		computedAt: new Date().toISOString(),
		currentFc,
		currentPh,
		currentCya,
		fcStatus,
		phStatus,
		lsi,
		lsiStatus,
		fcCyaRatio,
		recommendations,
	};
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
