/**
 * Learned decay rate — extract k from test pairs and blend with model.
 *
 * k_observed = -ln(FC_2 / FC_1) / delta_t
 * k_effective = alpha * k_observed_avg + (1 - alpha) * k_model
 *
 * alpha ramps from 0 (pure model) to 0.7 after ~5 paired tests.
 */

import type { WaterTest } from "../../types";

export interface LearnedRate {
	kObservedAvg: number | null;
	alpha: number;
	kEffective: number;
	observedRates: number[];
}

const MAX_PAIRS = 10;
const MAX_ALPHA = 0.7;
const MIN_PAIRS_FOR_LEARNING = 2;
const PAIRS_FOR_MAX_ALPHA = 5;

/**
 * Extract observed k values from consecutive FC test pairs.
 * Only uses pairs where both tests have FC > 0 and time gap is 1-48 hours.
 */
export function extractObservedRates(tests: WaterTest[]): number[] {
	const fcTests = tests
		.filter((t) => t.fc != null && t.fc > 0)
		.sort(
			(a, b) => new Date(a.testedAt).getTime() - new Date(b.testedAt).getTime(),
		);

	const rates: number[] = [];

	for (let i = 0; i < fcTests.length - 1; i++) {
		const t1 = fcTests[i];
		const t2 = fcTests[i + 1];
		// biome-ignore lint/style/noNonNullAssertion: filtered above
		const fc1 = t1.fc!;
		// biome-ignore lint/style/noNonNullAssertion: filtered above
		const fc2 = t2.fc!;

		if (fc2 >= fc1) continue; // Skip if FC increased (dosing happened between tests)

		const deltaHours =
			(new Date(t2.testedAt).getTime() - new Date(t1.testedAt).getTime()) /
			(1000 * 60 * 60);

		if (deltaHours < 1 || deltaHours > 48) continue;

		const kObserved = -Math.log(fc2 / fc1) / deltaHours;
		if (kObserved > 0 && kObserved < 5) {
			rates.push(kObserved);
		}
	}

	return rates.slice(-MAX_PAIRS);
}

/**
 * Compute the blended decay rate from test history and model prediction.
 * @param tests - All water tests for the pool
 * @param kModel - The theoretical model's decay rate
 */
export function learnDecayRate(
	tests: WaterTest[],
	kModel: number,
): LearnedRate {
	const observedRates = extractObservedRates(tests);

	if (observedRates.length < MIN_PAIRS_FOR_LEARNING) {
		return {
			kObservedAvg: null,
			alpha: 0,
			kEffective: kModel,
			observedRates,
		};
	}

	const kObservedAvg =
		observedRates.reduce((sum, r) => sum + r, 0) / observedRates.length;

	const alpha = Math.min(
		MAX_ALPHA,
		(MAX_ALPHA * observedRates.length) / PAIRS_FOR_MAX_ALPHA,
	);

	const kEffective = alpha * kObservedAvg + (1 - alpha) * kModel;

	return {
		kObservedAvg: Math.round(kObservedAvg * 10000) / 10000,
		alpha: Math.round(alpha * 100) / 100,
		kEffective: Math.round(kEffective * 10000) / 10000,
		observedRates,
	};
}
