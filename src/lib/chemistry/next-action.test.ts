import { describe, expect, it } from "vitest";
import type { DoseEvent, ForecastHour } from "../../types";
import { determineNextAction } from "./next-action";

function makeForecastHour(
	h: number,
	fc: number,
	startTime: Date,
): ForecastHour {
	return {
		time: new Date(startTime.getTime() + h * 3600_000).toISOString(),
		predictedFc: fc,
		kTotal: 0.02,
		kUv: 0.01,
		kDemand: 0.01,
		effectiveGhi: 0,
		temperatureC: 25,
		isDaytime: h % 24 >= 6 && h % 24 < 18,
	};
}

function makeDoseEvent(hoursFromNow: number, now: Date): DoseEvent {
	return {
		time: new Date(now.getTime() + hoursFromNow * 3600_000).toISOString(),
		fcBefore: 3.5,
		fcAfter: 6.0,
		ppmToAdd: 2.5,
		productAmount: "40.1 fl oz of 12.5% liquid chlorine",
		productAmountMl: 1186,
		cyaIncrease: 0,
	};
}

const now = new Date("2026-04-19T10:00:00Z");

describe("determineNextAction", () => {
	describe("test needed", () => {
		it("returns test/urgent when no test exists", () => {
			const hourly = Array.from({ length: 168 }, (_, h) =>
				makeForecastHour(h, 6.0, now),
			);
			const result = determineNextAction(hourly, [], 3, null, now);
			expect(result.type).toBe("test");
			expect(result.priority).toBe("urgent");
			expect(result.title).toContain("first water test");
		});

		it("returns test/urgent when last test is > 7 days old", () => {
			const hourly = Array.from({ length: 168 }, (_, h) =>
				makeForecastHour(h, 6.0, now),
			);
			const lastTest = new Date(now.getTime() - 8 * 24 * 3600_000);
			const result = determineNextAction(hourly, [], 3, lastTest, now);
			expect(result.type).toBe("test");
			expect(result.priority).toBe("urgent");
		});

		it("returns test/warning when last test is 3-7 days old", () => {
			const hourly = Array.from({ length: 168 }, (_, h) =>
				makeForecastHour(h, 6.0, now),
			);
			const lastTest = new Date(now.getTime() - 4 * 24 * 3600_000);
			const result = determineNextAction(hourly, [], 3, lastTest, now);
			expect(result.type).toBe("test");
			expect(result.priority).toBe("warning");
		});
	});

	describe("dose needed", () => {
		it("returns dose/urgent when dose within 24h", () => {
			const hourly = Array.from({ length: 168 }, (_, h) =>
				makeForecastHour(h, 6.0 - h * 0.1, now),
			);
			const lastTest = new Date(now.getTime() - 6 * 3600_000);
			const dose = makeDoseEvent(8, now);
			const result = determineNextAction(hourly, [dose], 3, lastTest, now);
			expect(result.type).toBe("dose");
			expect(result.priority).toBe("urgent");
			expect(result.doseEvent).toBeDefined();
		});

		it("returns dose/warning when dose > 24h away", () => {
			const hourly = Array.from({ length: 168 }, (_, h) =>
				makeForecastHour(h, 6.0, now),
			);
			const lastTest = new Date(now.getTime() - 6 * 3600_000);
			const dose = makeDoseEvent(48, now);
			const result = determineNextAction(hourly, [dose], 3, lastTest, now);
			expect(result.type).toBe("dose");
			expect(result.priority).toBe("warning");
			expect(result.title).toContain("Add chlorine");
		});

		it("uses the first dose event", () => {
			const hourly = Array.from({ length: 168 }, (_, h) =>
				makeForecastHour(h, 6.0, now),
			);
			const lastTest = new Date(now.getTime() - 6 * 3600_000);
			const dose1 = makeDoseEvent(30, now);
			const dose2 = makeDoseEvent(72, now);
			const result = determineNextAction(
				hourly,
				[dose1, dose2],
				3,
				lastTest,
				now,
			);
			expect(result.doseEvent?.time).toBe(dose1.time);
		});
	});

	describe("all good", () => {
		it("returns ok/info when FC stays in range for 7 days", () => {
			const hourly = Array.from({ length: 168 }, (_, h) =>
				makeForecastHour(h, 6.0, now),
			);
			const lastTest = new Date(now.getTime() - 6 * 3600_000);
			const result = determineNextAction(hourly, [], 3, lastTest, now);
			expect(result.type).toBe("ok");
			expect(result.priority).toBe("info");
			expect(result.title).toContain("look good");
		});

		it("mentions days in range when < 7 days", () => {
			// FC drops below 3 at hour 96 (4 days)
			const hourly = Array.from({ length: 168 }, (_, h) =>
				makeForecastHour(h, h < 96 ? 4.0 : 2.5, now),
			);
			const lastTest = new Date(now.getTime() - 6 * 3600_000);
			const result = determineNextAction(hourly, [], 3, lastTest, now);
			expect(result.type).toBe("ok");
			expect(result.description).toContain("4");
		});
	});

	describe("time formatting edge cases", () => {
		it("says 'now' when dose is in the past", () => {
			const hourly = Array.from({ length: 168 }, (_, h) =>
				makeForecastHour(h, 6.0, now),
			);
			const lastTest = new Date(now.getTime() - 6 * 3600_000);
			const dose = makeDoseEvent(-1, now); // 1 hour in the past
			const result = determineNextAction(hourly, [dose], 3, lastTest, now);
			expect(result.type).toBe("dose");
			expect(result.title).toContain("now");
		});

		it("says 'within the hour' for dose < 1h away", () => {
			const hourly = Array.from({ length: 168 }, (_, h) =>
				makeForecastHour(h, 6.0, now),
			);
			const lastTest = new Date(now.getTime() - 6 * 3600_000);
			const dose = makeDoseEvent(0.5, now);
			const result = determineNextAction(hourly, [dose], 3, lastTest, now);
			expect(result.type).toBe("dose");
			expect(result.title).toContain("within the hour");
		});

		it("says 'by tomorrow' for dose 24-48h away", () => {
			const hourly = Array.from({ length: 168 }, (_, h) =>
				makeForecastHour(h, 6.0, now),
			);
			const lastTest = new Date(now.getTime() - 6 * 3600_000);
			const dose = makeDoseEvent(36, now);
			const result = determineNextAction(hourly, [dose], 3, lastTest, now);
			expect(result.type).toBe("dose");
			expect(result.title).toContain("by tomorrow");
		});

		it("says 'in N days' for dose > 48h away", () => {
			const hourly = Array.from({ length: 168 }, (_, h) =>
				makeForecastHour(h, 6.0, now),
			);
			const lastTest = new Date(now.getTime() - 6 * 3600_000);
			const dose = makeDoseEvent(96, now);
			const result = determineNextAction(hourly, [dose], 3, lastTest, now);
			expect(result.type).toBe("dose");
			expect(result.title).toContain("in 4 days");
		});
	});

	describe("priority ordering", () => {
		it("test priority overrides dose when test is very stale", () => {
			const hourly = Array.from({ length: 168 }, (_, h) =>
				makeForecastHour(h, 6.0 - h * 0.1, now),
			);
			const lastTest = new Date(now.getTime() - 8 * 24 * 3600_000);
			const dose = makeDoseEvent(8, now);
			const result = determineNextAction(hourly, [dose], 3, lastTest, now);
			expect(result.type).toBe("test");
		});
	});
});
