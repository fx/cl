/**
 * FC/CYA relationship — lookup table, interpolation, and target calculation.
 */

export interface FcTarget {
	min: number;
	target: number;
	max: number;
	slamLevel: number;
}

/** FC/CYA table: [CYA, minFC, targetLow, targetHigh] */
const FC_CYA_TABLE: readonly [number, number, number, number][] = [
	[0, 1, 1, 3],
	[20, 2, 3, 5],
	[30, 2, 4, 6],
	[40, 3, 5, 7],
	[50, 4, 6, 8],
	[60, 5, 7, 9],
	[70, 5, 8, 10],
	[80, 6, 9, 11],
	[100, 8, 11, 13],
];

function interpolate(
	x: number,
	x0: number,
	x1: number,
	y0: number,
	y1: number,
): number {
	return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0);
}

function lookupInterpolated(cya: number): {
	min: number;
	targetLow: number;
	targetHigh: number;
} {
	if (cya <= FC_CYA_TABLE[0][0]) {
		return {
			min: FC_CYA_TABLE[0][1],
			targetLow: FC_CYA_TABLE[0][2],
			targetHigh: FC_CYA_TABLE[0][3],
		};
	}

	const lastEntry = FC_CYA_TABLE[FC_CYA_TABLE.length - 1];
	if (cya >= lastEntry[0]) {
		const prev = FC_CYA_TABLE[FC_CYA_TABLE.length - 2];
		return {
			min: interpolate(cya, prev[0], lastEntry[0], prev[1], lastEntry[1]),
			targetLow: interpolate(cya, prev[0], lastEntry[0], prev[2], lastEntry[2]),
			targetHigh: interpolate(
				cya,
				prev[0],
				lastEntry[0],
				prev[3],
				lastEntry[3],
			),
		};
	}

	for (let i = 0; i < FC_CYA_TABLE.length - 1; i++) {
		const [x0, min0, low0, high0] = FC_CYA_TABLE[i];
		const [x1, min1, low1, high1] = FC_CYA_TABLE[i + 1];
		if (cya >= x0 && cya <= x1) {
			return {
				min: interpolate(cya, x0, x1, min0, min1),
				targetLow: interpolate(cya, x0, x1, low0, low1),
				targetHigh: interpolate(cya, x0, x1, high0, high1),
			};
		}
	}

	return { min: 1, targetLow: 1, targetHigh: 3 };
}

export function calculateFcTarget(cya: number): FcTarget {
	const { min, targetLow, targetHigh } = lookupInterpolated(cya);
	const slamLevel = Math.max(Math.ceil(cya * 0.39), 10);
	const minimumFc = Math.max(cya * 0.075, 1.0);

	return {
		min: Math.max(Math.round(min), Math.round(minimumFc)),
		target: Math.round(((targetLow + targetHigh) / 2) * 10) / 10,
		max: Math.round(targetHigh),
		slamLevel,
	};
}
