import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DoseEvent, ForecastHour } from "../../types";
import { ForecastChart } from "./forecast-chart";

// Mock recharts to avoid DOM measurement issues in jsdom
vi.mock("recharts", async (importOriginal) => {
	const actual = await importOriginal<typeof import("recharts")>();
	return {
		...actual,
		ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
			<div data-testid="responsive-container">{children}</div>
		),
	};
});

function makeHourly(hours: number, startFc: number): ForecastHour[] {
	const start = new Date("2026-04-19T12:00:00Z");
	return Array.from({ length: hours }, (_, i) => ({
		time: new Date(start.getTime() + i * 3600_000).toISOString(),
		predictedFc: Math.max(startFc - i * 0.05, 0.5),
		kTotal: 0.05,
		kUv: 0.03,
		kDemand: 0.02,
		effectiveGhi: i % 24 < 12 ? 500 : 0,
		temperatureC: 30,
		isDaytime: i % 24 >= 6 && i % 24 <= 18,
	}));
}

const mockDoseEvents: DoseEvent[] = [
	{
		time: "2026-04-21T18:00:00Z",
		fcBefore: 2.5,
		fcAfter: 6.0,
		ppmToAdd: 3.5,
		productAmount: "32 fl oz",
		productAmountMl: 946,
		cyaIncrease: 0,
	},
];

describe("ForecastChart", () => {
	it("renders chart container with test id", () => {
		const hourly = makeHourly(168, 6.0);
		render(
			<ForecastChart
				hourly={hourly}
				doseEvents={mockDoseEvents}
				minFc={3}
				targetMin={3}
				targetMax={7}
				now={new Date("2026-04-19T12:00:00Z")}
			/>,
		);
		expect(screen.getByTestId("forecast-chart")).toBeInTheDocument();
	});

	it("renders with empty dose events", () => {
		const hourly = makeHourly(168, 6.0);
		render(
			<ForecastChart
				hourly={hourly}
				doseEvents={[]}
				minFc={3}
				targetMin={3}
				targetMax={7}
				now={new Date("2026-04-19T12:00:00Z")}
			/>,
		);
		expect(screen.getByTestId("forecast-chart")).toBeInTheDocument();
	});

	it("renders with short hourly data", () => {
		const hourly = makeHourly(24, 5.0);
		render(
			<ForecastChart
				hourly={hourly}
				doseEvents={[]}
				minFc={3}
				targetMin={3}
				targetMax={7}
				now={new Date("2026-04-19T12:00:00Z")}
			/>,
		);
		expect(screen.getByTestId("forecast-chart")).toBeInTheDocument();
	});

	it("renders with multiple dose events", () => {
		const hourly = makeHourly(168, 6.0);
		const doses: DoseEvent[] = [
			...mockDoseEvents,
			{
				time: "2026-04-23T18:00:00Z",
				fcBefore: 2.8,
				fcAfter: 6.0,
				ppmToAdd: 3.2,
				productAmount: "28 fl oz",
				productAmountMl: 828,
				cyaIncrease: 0,
			},
		];
		render(
			<ForecastChart
				hourly={hourly}
				doseEvents={doses}
				minFc={3}
				targetMin={3}
				targetMax={7}
				now={new Date("2026-04-19T12:00:00Z")}
			/>,
		);
		expect(screen.getByTestId("forecast-chart")).toBeInTheDocument();
	});
});
