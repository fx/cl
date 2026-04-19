/**
 * Chlorine decay model — UV decay, chemical demand, and FC prediction.
 *
 * FC(t) = FC_0 * exp(-k * t)
 * k = k_uv + k_demand
 */

import type { DecayParameters } from "../../types";

/** k_uv_base lookup table: [CYA (ppm), k_uv_base (h^-1)] */
const K_UV_TABLE: readonly [number, number][] = [
	[0, 1.2],
	[10, 0.5],
	[30, 0.14],
	[50, 0.09],
	[80, 0.07],
];

/** Arrhenius constants */
const E_A = 76000; // J/mol
const R = 8.314; // J/(mol*K)
const T_REF = 298.15; // K (25C / 77F)
const K_DEMAND_BASE = 0.02; // h^-1

function interpolateTable(
	x: number,
	table: readonly [number, number][],
): number {
	if (x <= table[0][0]) return table[0][1];
	const last = table[table.length - 1];
	if (x >= last[0]) return last[1];

	for (let i = 0; i < table.length - 1; i++) {
		const [x0, y0] = table[i];
		const [x1, y1] = table[i + 1];
		if (x >= x0 && x <= x1) {
			return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0);
		}
	}
	return last[1];
}

export function getKUvBase(cya: number): number {
	return interpolateTable(cya, K_UV_TABLE);
}

export function fahrenheitToKelvin(tempF: number): number {
	return ((tempF - 32) * 5) / 9 + 273.15;
}

export function temperatureFactor(tempF: number): number {
	const tK = fahrenheitToKelvin(tempF);
	return Math.exp((E_A / R) * (1 / T_REF - 1 / tK));
}

/**
 * Calculate the composite decay rate.
 * @param cya - CYA level in ppm
 * @param tempF - Water temperature in F
 * @param sunIntensityFactor - GHI ratio (current / 1000 W/m2), 0 at night
 */
export function calculateDecayRate(
	cya: number,
	tempF: number,
	sunIntensityFactor: number,
): DecayParameters {
	const kUvBase = getKUvBase(cya);
	const kUv = kUvBase * sunIntensityFactor;
	const tFactor = temperatureFactor(tempF);
	const kDemand = K_DEMAND_BASE * tFactor;

	return {
		kUvBase: kUv,
		kDemand,
		kObservedAvg: null,
		kEffective: kUv + kDemand,
		alpha: 0,
	};
}

/**
 * Predict FC at time t using first-order kinetics.
 * @param fc0 - Initial free chlorine (ppm)
 * @param k - Composite decay rate (h^-1)
 * @param hours - Time elapsed (hours)
 */
export function predictFc(fc0: number, k: number, hours: number): number {
	return fc0 * Math.exp(-k * hours);
}
