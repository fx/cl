/**
 * Dosing calculator — product amounts for a target FC increase.
 */

import type { ChlorineSource } from "../../types";

export interface DosingResult {
	amount: number;
	unit: string;
	formatted: string;
	cyaIncrease: number;
}

/**
 * Dosing constants: amount per +1 ppm per 10,000 gallons.
 * For liquid: fl oz; for solid: oz (weight).
 */
const DOSING_TABLE: Record<
	Exclude<ChlorineSource, "swg">,
	{ amountPer10k: number; unit: "fl oz" | "oz"; cyaPer10ppmCl: number }
> = {
	liquid: { amountPer10k: 10.7, unit: "fl oz", cyaPer10ppmCl: 0 },
	liquid_6: { amountPer10k: 22.3, unit: "fl oz", cyaPer10ppmCl: 0 },
	cal_hypo: { amountPer10k: 2.0, unit: "oz", cyaPer10ppmCl: 0 },
	dichlor: { amountPer10k: 2.4, unit: "oz", cyaPer10ppmCl: 9 },
	trichlor: { amountPer10k: 1.5, unit: "oz", cyaPer10ppmCl: 6 },
};

const SOURCE_LABELS: Record<Exclude<ChlorineSource, "swg">, string> = {
	liquid: "12.5% liquid chlorine",
	liquid_6: "6% liquid chlorine",
	cal_hypo: "cal-hypo (65%)",
	dichlor: "dichlor",
	trichlor: "trichlor",
};

function formatLiquidAmount(flOz: number): string {
	if (flOz >= 128) {
		const gallons = flOz / 128;
		return `${Math.round(gallons * 100) / 100} gal`;
	}
	return `${Math.round(flOz * 10) / 10} fl oz`;
}

function formatWeightAmount(oz: number): string {
	if (oz >= 16) {
		const lbs = oz / 16;
		return `${Math.round(lbs * 100) / 100} lbs`;
	}
	return `${Math.round(oz * 10) / 10} oz`;
}

/**
 * Calculate dose amount for a target FC increase.
 * @param volumeGallons - Pool volume in gallons
 * @param currentFc - Current FC (ppm)
 * @param targetFc - Desired FC (ppm)
 * @param source - Chlorine source type
 */
export function calculateDose(
	volumeGallons: number,
	currentFc: number,
	targetFc: number,
	source: ChlorineSource,
): DosingResult | null {
	if (source === "swg") return null;

	const ppmIncrease = targetFc - currentFc;
	if (ppmIncrease <= 0) {
		return {
			amount: 0,
			unit: "",
			formatted: "No chlorine needed",
			cyaIncrease: 0,
		};
	}

	const entry = DOSING_TABLE[source];
	const volumeFactor = volumeGallons / 10000;
	const totalAmount = entry.amountPer10k * volumeFactor * ppmIncrease;
	const cyaIncrease = (entry.cyaPer10ppmCl * ppmIncrease) / 10;

	const formatted =
		entry.unit === "fl oz"
			? formatLiquidAmount(totalAmount)
			: formatWeightAmount(totalAmount);

	return {
		amount: Math.round(totalAmount * 10) / 10,
		unit: entry.unit,
		formatted: `${formatted} of ${SOURCE_LABELS[source]}`,
		cyaIncrease: Math.round(cyaIncrease * 10) / 10,
	};
}
