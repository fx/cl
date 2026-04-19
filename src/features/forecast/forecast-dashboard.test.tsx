import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
	ForecastResult,
	Pool,
	SunExposureResult,
	WaterTest,
} from "../../types";
import { ForecastDashboard } from "./forecast-dashboard";

vi.mock("wouter", () => ({
	Link: ({
		children,
		href,
		...props
	}: {
		children: React.ReactNode;
		href: string;
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

// Mock recharts to avoid DOM measurement issues in jsdom
vi.mock("recharts", async (importOriginal) => {
	const actual = await importOriginal<typeof import("recharts")>();
	return {
		...actual,
		ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
			<div>{children}</div>
		),
	};
});

const mockForecast: ForecastResult = {
	poolId: "pool-1",
	generatedAt: "2026-04-19T12:00:00Z",
	startFc: 5.0,
	startTime: "2026-04-19T12:00:00Z",
	confidence: "high",
	hourly: Array.from({ length: 168 }, (_, i) => ({
		time: new Date(
			new Date("2026-04-19T12:00:00Z").getTime() + i * 3600_000,
		).toISOString(),
		predictedFc: Math.max(5.0 - i * 0.03, 1),
		kTotal: 0.05,
		kUv: 0.03,
		kDemand: 0.02,
		effectiveGhi: 500,
		temperatureC: 30,
		isDaytime: i % 24 >= 6 && i % 24 <= 18,
	})),
	doseEvents: [
		{
			time: "2026-04-21T18:00:00Z",
			fcBefore: 2.5,
			fcAfter: 6.0,
			ppmToAdd: 3.5,
			productAmount: "32 fl oz",
			productAmountMl: 946,
			cyaIncrease: 0,
		},
	],
	nextAction: {
		type: "dose",
		priority: "warning",
		title: "Add chlorine by tomorrow",
		description: "FC will drop below 3.0 ppm.",
		doseEvent: {
			time: "2026-04-21T18:00:00Z",
			fcBefore: 2.5,
			fcAfter: 6.0,
			ppmToAdd: 3.5,
			productAmount: "32 fl oz",
			productAmountMl: 946,
			cyaIncrease: 0,
		},
	},
	warnings: [],
};

vi.mock("../../hooks/use-forecast", () => ({
	useForecast: () => mockForecast,
}));

const testPool: Pool = {
	id: "pool-1",
	name: "Test Pool",
	latitude: 33.4484,
	longitude: -112.074,
	volumeGallons: 15000,
	surfaceType: "plaster",
	chlorineSource: "liquid",
	treeCoverPercent: 10,
	isIndoor: false,
	targetFc: null,
	targetPh: 7.4,
	notes: "",
	createdAt: "2026-01-01T00:00:00Z",
	updatedAt: "2026-01-01T00:00:00Z",
};

const testTests: WaterTest[] = [
	{
		id: "t1",
		poolId: "pool-1",
		testedAt: "2026-04-19T10:00:00Z",
		createdAt: "2026-04-19T10:00:00Z",
		fc: 5.0,
		ph: 7.4,
		cya: 40,
	},
];

const mockSunExposure: SunExposureResult = {
	poolId: "pool-1",
	fetchedAt: "2026-04-19T12:00:00Z",
	dataSource: "fallback",
	daily: Array.from({ length: 7 }, (_, i) => ({
		date: `2026-04-${19 + i}`,
		sunrise: "06:00:00",
		sunset: "19:00:00",
		daylightHours: 13,
		peakSunHours: 7,
		effectiveSunHours: 6,
		avgCloudCover: 20,
		maxUvIndex: 8,
		avgTemperatureC: 30,
		hourly: Array.from({ length: 24 }, (_, h) => ({
			hour: h,
			ghiWm2: h >= 6 && h <= 18 ? 600 : 0,
			uvIndex: h >= 6 && h <= 18 ? 6 : 0,
			cloudCover: 20,
			temperatureC: 30,
			sunAltitudeDeg: h >= 6 && h <= 18 ? 45 : -10,
		})),
	})),
};

describe("ForecastDashboard", () => {
	it("renders prompt to log first test when no tests", () => {
		render(
			<ForecastDashboard
				pool={testPool}
				tests={[]}
				sunExposure={mockSunExposure}
			/>,
		);
		expect(screen.getByText(/Log your first water test/)).toBeInTheDocument();
		expect(screen.getByText("Log Test")).toBeInTheDocument();
	});

	it("renders prompt when tests have no FC values", () => {
		const testsNoPh: WaterTest[] = [
			{
				id: "t1",
				poolId: "pool-1",
				testedAt: "2026-04-19T10:00:00Z",
				createdAt: "2026-04-19T10:00:00Z",
				ph: 7.4,
			},
		];
		render(
			<ForecastDashboard
				pool={testPool}
				tests={testsNoPh}
				sunExposure={mockSunExposure}
			/>,
		);
		expect(screen.getByText(/Log your first water test/)).toBeInTheDocument();
	});

	it("renders loading state when sun exposure is null", () => {
		render(
			<ForecastDashboard
				pool={testPool}
				tests={testTests}
				sunExposure={null}
			/>,
		);
		expect(screen.getByText(/Loading forecast data/)).toBeInTheDocument();
	});

	it("renders full dashboard with forecast data", () => {
		render(
			<ForecastDashboard
				pool={testPool}
				tests={testTests}
				sunExposure={mockSunExposure}
			/>,
		);
		expect(screen.getByTestId("forecast-dashboard")).toBeInTheDocument();
		expect(screen.getByText("Add chlorine by tomorrow")).toBeInTheDocument();
		expect(screen.getByText("7-Day Forecast")).toBeInTheDocument();
		expect(screen.getByTestId("forecast-chart")).toBeInTheDocument();
	});

	it("renders dose schedule when dose events exist", () => {
		render(
			<ForecastDashboard
				pool={testPool}
				tests={testTests}
				sunExposure={mockSunExposure}
			/>,
		);
		expect(screen.getByText("Dose Schedule")).toBeInTheDocument();
	});

	it("renders quick action buttons", () => {
		render(
			<ForecastDashboard
				pool={testPool}
				tests={testTests}
				sunExposure={mockSunExposure}
			/>,
		);
		const logTestLinks = screen.getAllByText("Log Test");
		expect(logTestLinks.length).toBeGreaterThan(0);
		expect(screen.getByText("Calculate Dose")).toBeInTheDocument();
	});

	it("renders chemistry status bar", () => {
		render(
			<ForecastDashboard
				pool={testPool}
				tests={testTests}
				sunExposure={mockSunExposure}
			/>,
		);
		expect(screen.getByTestId("chemistry-status-bar")).toBeInTheDocument();
	});
});
