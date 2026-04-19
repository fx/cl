import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@fx/ui";
import { Link } from "wouter";
import { useForecast } from "../../hooks/use-forecast";
import { evaluateChemistry } from "../../lib/chemistry/evaluate";
import { calculateFcTarget } from "../../lib/chemistry/fc-cya";
import type { Pool, SunExposureResult, WaterTest } from "../../types";
import { ChemistryStatusBar } from "./chemistry-status-bar";
import { DoseSchedule } from "./dose-schedule";
import { ForecastChart } from "./forecast-chart";
import { NextActionCard } from "./next-action-card";
import { ParameterAlerts } from "./parameter-alerts";
import { WarningBanner } from "./warning-banner";

interface ForecastDashboardProps {
	pool: Pool;
	tests: WaterTest[];
	sunExposure: SunExposureResult | null;
}

export function ForecastDashboard({
	pool,
	tests,
	sunExposure,
}: ForecastDashboardProps) {
	const forecast = useForecast(pool, tests, sunExposure);

	// No tests — prompt user to log first test
	if (tests.length === 0 || !tests.some((t) => t.fc != null)) {
		return (
			<Card data-testid="forecast-dashboard">
				<CardHeader>
					<CardTitle>Forecast</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						Log your first water test to see chlorine predictions.
					</p>
					{/* @ts-expect-error @fx/ui Button children type */}
					<Button asChild size="sm" className="mt-2">
						<Link href={`/pools/${pool.id}/test`}>Log Test</Link>
					</Button>
				</CardContent>
			</Card>
		);
	}

	// Sun exposure not loaded yet
	if (!sunExposure || !forecast) {
		return (
			<Card data-testid="forecast-dashboard">
				<CardHeader>
					<CardTitle>Forecast</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						Loading forecast data...
					</p>
				</CardContent>
			</Card>
		);
	}

	const latestCya =
		[...tests]
			.sort(
				(a, b) =>
					new Date(b.testedAt).getTime() - new Date(a.testedAt).getTime(),
			)
			.find((t) => t.cya != null)?.cya ?? 0;

	const fcTargets = calculateFcTarget(latestCya);
	const chemStatus = evaluateChemistry(pool, tests);
	const now = new Date();

	return (
		<div className="space-y-4" data-testid="forecast-dashboard">
			{/* Next Action — hero card */}
			<NextActionCard nextAction={forecast.nextAction} poolId={pool.id} />

			{/* Confidence badge */}
			{forecast.confidence !== "high" && (
				<div className="flex items-center gap-2">
					<Badge
						variant={forecast.confidence === "low" ? "destructive" : "outline"}
					>
						{forecast.confidence === "low"
							? "Low confidence"
							: "Moderate confidence"}
					</Badge>
					<span className="text-xs text-muted-foreground">
						{forecast.confidence === "low"
							? "Test your water for a more accurate forecast"
							: "Recent test data available"}
					</span>
				</div>
			)}

			{/* Warning banners */}
			<WarningBanner warnings={forecast.warnings} />

			{/* Chemistry status bar */}
			<ChemistryStatusBar
				fc={chemStatus.currentFc}
				ph={chemStatus.currentPh}
				cya={chemStatus.currentCya}
				fcStatus={chemStatus.fcStatus}
				phStatus={chemStatus.phStatus}
			/>

			{/* Forecast chart */}
			<Card>
				<CardHeader>
					<CardTitle>7-Day Forecast</CardTitle>
				</CardHeader>
				<CardContent>
					<ForecastChart
						hourly={forecast.hourly}
						doseEvents={forecast.doseEvents}
						minFc={fcTargets.min}
						targetMin={fcTargets.min}
						targetMax={fcTargets.max}
						now={now}
					/>
				</CardContent>
			</Card>

			{/* Dose schedule */}
			<DoseSchedule doseEvents={forecast.doseEvents} />

			{/* Quick actions */}
			<div className="flex gap-2">
				{/* @ts-expect-error @fx/ui Button children type */}
				<Button asChild size="sm">
					<Link href={`/pools/${pool.id}/test`}>Log Test</Link>
				</Button>
				{/* @ts-expect-error @fx/ui Button children type */}
				<Button asChild variant="outline" size="sm">
					<Link href={`/pools/${pool.id}/dose`}>Calculate Dose</Link>
				</Button>
			</div>

			{/* Parameter alerts */}
			<ParameterAlerts chemStatus={chemStatus} />
		</div>
	);
}
