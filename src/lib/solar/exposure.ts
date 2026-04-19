export function calculatePSH(hourlyGhiWm2: number[]): number {
	const totalWh = hourlyGhiWm2.reduce((sum, ghi) => sum + ghi, 0);
	return totalWh / 1000;
}

export function calculateTreeFactor(canopyPercent: number): number {
	if (canopyPercent <= 0) return 1;
	if (canopyPercent >= 100) return 0;
	return 1 - (canopyPercent / 100) ** 0.7;
}

export function calculateEffectiveSunHours(
	psh: number,
	treeFactor: number,
): number {
	return psh * treeFactor;
}
