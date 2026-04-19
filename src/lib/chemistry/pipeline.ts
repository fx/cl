/**
 * Forecast pipeline orchestrator — ties together simulation, scheduling,
 * next-action, and warnings into a single ForecastResult.
 *
 * All functions are pure; the useForecast hook handles memoization.
 */

import type {
	ForecastResult,
	Pool,
	SunExposureResult,
	WaterTest,
} from "../../types";
import { calculateFcTarget } from "./fc-cya";
import { simulateHourly } from "./forecast";
import { determineNextAction } from "./next-action";
import { simulateWithDoses } from "./scheduler";
import { generateWarnings } from "./warnings";

const CONFIDENCE_HIGH_HOURS = 24;
const CONFIDENCE_MODERATE_HOURS = 72;

function getConfidence(
	lastTestTime: Date | null,
	now: Date,
): "high" | "moderate" | "low" {
	if (!lastTestTime) return "low";
	const hours = (now.getTime() - lastTestTime.getTime()) / (1000 * 60 * 60);
	if (hours <= CONFIDENCE_HIGH_HOURS) return "high";
	if (hours <= CONFIDENCE_MODERATE_HOURS) return "moderate";
	return "low";
}

/**
 * Generate a complete forecast from pool, tests, and sun data.
 * This is the main entry point for the forecast pipeline.
 */
export function generateForecast(
	pool: Pool,
	tests: WaterTest[],
	sunExposure: SunExposureResult,
	now?: Date,
): ForecastResult {
	const currentTime = now ?? new Date();

	// Find latest FC test
	const sorted = [...tests].sort(
		(a, b) => new Date(b.testedAt).getTime() - new Date(a.testedAt).getTime(),
	);

	const latestFcTest = sorted.find((t) => t.fc != null);
	const latestCyaTest = sorted.find((t) => t.cya != null);

	const startFc = latestFcTest?.fc ?? 0;
	const cya = latestCyaTest?.cya ?? 0;
	const lastTestTime = latestFcTest ? new Date(latestFcTest.testedAt) : null;

	const fcTarget = calculateFcTarget(cya);
	const targetFc = pool.targetFc ?? fcTarget.target;
	const minFc = fcTarget.min;

	// Step 1: Run raw simulation (no doses)
	const rawHourly = simulateHourly(
		{
			startFc,
			cya,
			treeCoverPercent: pool.treeCoverPercent,
			isIndoor: pool.isIndoor,
			sunData: sunExposure.daily,
			tests,
		},
		currentTime,
	);

	// Step 2: Insert dose events and re-simulate
	const { hourly, doseEvents } = simulateWithDoses(
		rawHourly,
		minFc,
		targetFc,
		pool.volumeGallons,
		pool.chlorineSource,
		currentTime,
	);

	// Step 3: Determine next action
	const nextAction = determineNextAction(
		hourly,
		doseEvents,
		minFc,
		lastTestTime,
		currentTime,
	);

	// Step 4: Generate warnings
	const warnings = generateWarnings(pool, tests, doseEvents, currentTime);

	// Step 5: Determine confidence
	const confidence = getConfidence(lastTestTime, currentTime);

	return {
		poolId: pool.id,
		generatedAt: currentTime.toISOString(),
		startFc,
		startTime: currentTime.toISOString(),
		confidence,
		hourly,
		doseEvents,
		nextAction,
		warnings,
	};
}
