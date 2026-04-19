import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@fx/ui";
import {
	Area,
	CartesianGrid,
	ComposedChart,
	Line,
	ReferenceLine,
	XAxis,
	YAxis,
} from "recharts";
import type { DoseEvent, ForecastHour } from "../../types";

interface ForecastChartProps {
	hourly: ForecastHour[];
	doseEvents: DoseEvent[];
	minFc: number;
	targetMin: number;
	targetMax: number;
	now: Date;
}

const chartConfig: ChartConfig = {
	predictedFc: { label: "FC (ppm)", color: "var(--color-blue-500)" },
	targetRange: { label: "Target Range", color: "var(--color-green-500)" },
};

interface ChartDataPoint {
	time: string;
	label: string;
	predictedFc: number;
	targetMin: number;
	targetMax: number;
	isDose: boolean;
	doseLabel: string | null;
}

function formatHourLabel(iso: string): string {
	const d = new Date(iso);
	return d.toLocaleTimeString(undefined, {
		hour: "numeric",
		minute: "2-digit",
	});
}

export function ForecastChart({
	hourly,
	doseEvents,
	minFc,
	targetMin,
	targetMax,
	now,
}: ForecastChartProps) {
	const doseTimeSet = new Set(doseEvents.map((d) => d.time));

	// Sample every 3 hours for readability
	const data: ChartDataPoint[] = hourly
		.filter((_, i) => i % 3 === 0 || doseTimeSet.has(hourly[i].time))
		.map((h) => {
			const dose = doseEvents.find((d) => d.time === h.time);
			return {
				time: h.time,
				label: formatHourLabel(h.time),
				predictedFc: Math.round(h.predictedFc * 10) / 10,
				targetMin,
				targetMax,
				isDose: dose != null,
				doseLabel: dose ? `+${dose.productAmount}` : null,
			};
		});

	// Find "now" position
	const nowIso = now.toISOString();
	const nowIndex = data.findIndex((d) => d.time >= nowIso);
	const nowLabel = nowIndex >= 0 ? data[nowIndex].label : null;

	// Build x-axis ticks — one per day
	const dayTicks: string[] = [];
	const seen = new Set<string>();
	for (const d of data) {
		const dayKey = d.time.slice(0, 10);
		if (!seen.has(dayKey)) {
			seen.add(dayKey);
			dayTicks.push(d.label);
		}
	}

	const yMax = Math.max(targetMax + 2, ...data.map((d) => d.predictedFc + 1));

	return (
		<div data-testid="forecast-chart">
			<ChartContainer config={chartConfig} className="h-64 w-full">
				<ComposedChart data={data}>
					<CartesianGrid strokeDasharray="3 3" />
					<XAxis
						dataKey="label"
						tick={{ fontSize: 10 }}
						interval={Math.floor(data.length / 7)}
					/>
					<YAxis domain={[0, Math.ceil(yMax)]} tick={{ fontSize: 10 }} />
					<ChartTooltip content={<ChartTooltipContent labelKey="time" />} />

					{/* Target range band */}
					<Area
						dataKey="targetMax"
						stroke="none"
						fill="var(--color-green-500)"
						fillOpacity={0.1}
						type="monotone"
						isAnimationActive={false}
					/>
					<Area
						dataKey="targetMin"
						stroke="none"
						fill="var(--color-background, #fff)"
						fillOpacity={1}
						type="monotone"
						isAnimationActive={false}
					/>

					{/* Minimum FC line */}
					<ReferenceLine
						y={minFc}
						stroke="var(--color-red-500)"
						strokeDasharray="4 4"
						label={{
							value: `Min ${minFc}`,
							fontSize: 10,
							fill: "var(--color-red-500)",
						}}
					/>

					{/* "Now" vertical indicator */}
					{nowLabel && (
						<ReferenceLine
							x={nowLabel}
							stroke="var(--color-blue-400)"
							strokeDasharray="2 2"
							label={{
								value: "Now",
								fontSize: 10,
								fill: "var(--color-blue-400)",
							}}
						/>
					)}

					{/* FC prediction line */}
					<Line
						type="monotone"
						dataKey="predictedFc"
						stroke="var(--color-blue-500)"
						strokeWidth={2}
						dot={(props: Record<string, unknown>) => {
							const payload = props.payload as ChartDataPoint | undefined;
							if (!payload?.isDose) return <g key={String(props.key)} />;
							return (
								<circle
									key={String(props.key)}
									cx={Number(props.cx)}
									cy={Number(props.cy)}
									r={5}
									fill="var(--color-orange-500)"
									stroke="white"
									strokeWidth={2}
								/>
							);
						}}
						isAnimationActive={false}
					/>
				</ComposedChart>
			</ChartContainer>
		</div>
	);
}
