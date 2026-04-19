/**
 * Langelier Saturation Index (LSI) calculator.
 *
 * LSI = pH - pH_s
 * pH_s = (9.3 + A + B) - (C + D)
 *
 * A = (log10(TDS) - 1) / 10
 * B = -13.12 * log10(T_K) + 34.55
 * C = log10(CH) - 0.4
 * D = log10(TA)
 */

export interface LsiResult {
	lsi: number;
	phS: number;
	a: number;
	b: number;
	c: number;
	d: number;
	status: "corrosive" | "balanced" | "scaling";
}

function fahrenheitToKelvin(tempF: number): number {
	return ((tempF - 32) * 5) / 9 + 273.15;
}

/**
 * Calculate LSI.
 * @param ph - Measured pH
 * @param ta - Total alkalinity (ppm as CaCO3)
 * @param ch - Calcium hardness (ppm as CaCO3)
 * @param tempF - Water temperature (F)
 * @param tds - Total dissolved solids (ppm), defaults to 1000
 */
export function calculateLsi(
	ph: number,
	ta: number,
	ch: number,
	tempF: number,
	tds = 1000,
): LsiResult | null {
	if (tds <= 0 || ta <= 0 || ch <= 0 || !Number.isFinite(tempF)) {
		return null;
	}

	const tK = fahrenheitToKelvin(tempF);
	const a = (Math.log10(tds) - 1) / 10;
	const b = -13.12 * Math.log10(tK) + 34.55;
	const c = Math.log10(ch) - 0.4;
	const d = Math.log10(ta);
	const phS = 9.3 + a + b - (c + d);
	const lsi = ph - phS;

	let status: "corrosive" | "balanced" | "scaling";
	if (lsi < -0.3) {
		status = "corrosive";
	} else if (lsi > 0.3) {
		status = "scaling";
	} else {
		status = "balanced";
	}

	return {
		lsi: Math.round(lsi * 100) / 100,
		phS: Math.round(phS * 100) / 100,
		a: Math.round(a * 1000) / 1000,
		b: Math.round(b * 1000) / 1000,
		c: Math.round(c * 1000) / 1000,
		d: Math.round(d * 1000) / 1000,
		status,
	};
}
