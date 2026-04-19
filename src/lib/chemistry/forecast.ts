/**
 * Hourly chlorine forecast simulation.
 *
 * Runs 168 one-hour steps, computing UV and demand decay each hour
 * using sun exposure data and the pool's CYA / temperature profile.
 */

import type {
	DailySunExposure,
	ForecastHour,
	HourlySunData,
	WaterTest,
} from "../../types";
import { calculateTreeFactor } from "../solar/exposure";
import { getKUvBase, predictFc } from "./decay";
import { learnDecayRate } from "./learned-rate";

const FORECAST_HOURS = 168;
const K_DEMAND_BASE = 0.02;

/** Arrhenius temperature factor (same as decay.ts) */
const E_A = 76000;
const R = 8.314;
const T_REF = 298.15;

function temperatureFactorC(tempC: number): number {
	const tK = tempC + 273.15;
	return Math.exp((E_A / R) * (1 / T_REF - 1 / tK));
}

export interface SimulationInput {
	startFc: number;
	cya: number;
	treeCoverPercent: number;
	isIndoor: boolean;
	sunData: DailySunExposure[];
	tests: WaterTest[];
	/** Pre-scheduled dose events: hour index → ppm to add */
	doseSchedule?: Map<number, number>;
}

/**
 * Look up sun data for a given hour index.
 * If we run past the available days, repeat the last available day's pattern.
 */
function getSunHour(
	sunData: DailySunExposure[],
	hourIndex: number,
): HourlySunData {
	const dayIndex = Math.floor(hourIndex / 24);
	const hourOfDay = hourIndex % 24;

	const day =
		dayIndex < sunData.length ? sunData[dayIndex] : sunData[sunData.length - 1];

	if (!day?.hourly?.length) {
		return {
			hour: hourOfDay,
			ghiWm2: 0,
			uvIndex: 0,
			cloudCover: 0,
			temperatureC: 25,
			sunAltitudeDeg: 0,
		};
	}

	return day.hourly[hourOfDay] ?? day.hourly[day.hourly.length - 1];
}

/**
 * Simulate hourly FC decay for 168 hours.
 *
 * For each hour:
 *   1. Get sun exposure data (GHI, temperature)
 *   2. Compute k_uv = k_uv_base(CYA) × (effectiveGHI / 1000)
 *   3. Compute k_demand = 0.02 × temperature_factor(tempC)
 *   4. Blend with learned rate if available
 *   5. FC(h+1) = FC(h) × exp(-k_effective × 1)
 *   6. If scheduled dose at hour h, add dose to FC
 *   7. Record ForecastHour
 */
export function simulateHourly(
	input: SimulationInput,
	startTime: Date,
): ForecastHour[] {
	const {
		startFc,
		cya,
		treeCoverPercent,
		isIndoor,
		sunData,
		tests,
		doseSchedule,
	} = input;

	const treeFactor = isIndoor ? 0 : calculateTreeFactor(treeCoverPercent);
	const kUvBase = getKUvBase(cya);

	// Pre-compute learned rate blending parameters
	// We use a representative k_model (midday sun, moderate temp) for learning
	const kModelRepresentative = kUvBase * 0.5 + K_DEMAND_BASE;
	const learned = learnDecayRate(tests, kModelRepresentative);

	const hourly: ForecastHour[] = [];
	let currentFc = startFc;

	for (let h = 0; h < FORECAST_HOURS; h++) {
		const sunHour = getSunHour(sunData, h);
		const effectiveGhi = isIndoor ? 0 : sunHour.ghiWm2 * treeFactor;
		const isDaytime = sunHour.sunAltitudeDeg > 0;

		// Compute hourly decay components
		const kUv = kUvBase * (effectiveGhi / 1000);
		const kDemand = K_DEMAND_BASE * temperatureFactorC(sunHour.temperatureC);
		const kModel = kUv + kDemand;

		// Blend with learned rate
		const kEffective =
			learned.alpha > 0
				? learned.alpha * (learned.kObservedAvg ?? kModel) +
					(1 - learned.alpha) * kModel
				: kModel;

		const time = new Date(startTime.getTime() + h * 3600_000);

		hourly.push({
			time: time.toISOString(),
			predictedFc: Math.round(currentFc * 1000) / 1000,
			kTotal: Math.round(kEffective * 10000) / 10000,
			kUv: Math.round(kUv * 10000) / 10000,
			kDemand: Math.round(kDemand * 10000) / 10000,
			effectiveGhi: Math.round(effectiveGhi * 10) / 10,
			temperatureC: sunHour.temperatureC,
			isDaytime,
		});

		// Apply decay: FC(h+1) = FC(h) * exp(-k * 1)
		currentFc = predictFc(currentFc, kEffective, 1);

		// Apply any scheduled dose
		const doseAmount = doseSchedule?.get(h);
		if (doseAmount != null) {
			currentFc += doseAmount;
		}
	}

	return hourly;
}
