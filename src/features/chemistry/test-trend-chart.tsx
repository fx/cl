import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@fx/ui";
import {
	CartesianGrid,
	Line,
	LineChart,
	ReferenceArea,
	XAxis,
	YAxis,
} from "recharts";
import { calculateFcTarget } from "../../lib/chemistry/fc-cya";
import type { WaterTest } from "../../types";

interface TestTrendChartProps {
	tests: WaterTest[];
	cya: number | null;
}

const chartConfig: ChartConfig = {
	fc: { label: "FC (ppm)", color: "var(--color-blue-500)" },
	ph: { label: "pH", color: "var(--color-green-500)" },
};

export function TestTrendChart({ tests, cya }: TestTrendChartProps) {
	const chronological = [...tests]
		.filter((t) => t.fc != null || t.ph != null)
		.sort(
			(a, b) => new Date(a.testedAt).getTime() - new Date(b.testedAt).getTime(),
		);

	if (chronological.length < 2) return null;

	const targets = calculateFcTarget(cya ?? 0);

	const data = chronological.map((t) => ({
		date: new Date(t.testedAt).toLocaleDateString(),
		fc: t.fc ?? null,
		ph: t.ph ?? null,
	}));

	return (
		<div className="space-y-2">
			<h3 className="text-sm font-medium">FC Trend</h3>
			<ChartContainer config={chartConfig} className="h-48 w-full">
				<LineChart data={data}>
					<CartesianGrid strokeDasharray="3 3" />
					<XAxis dataKey="date" tick={{ fontSize: 10 }} />
					<YAxis domain={[0, "auto"]} tick={{ fontSize: 10 }} />
					<ChartTooltip content={<ChartTooltipContent />} />
					<ReferenceArea
						y1={targets.min}
						y2={targets.max}
						fill="var(--color-green-500)"
						fillOpacity={0.1}
						label={{ value: "Target", fontSize: 10 }}
					/>
					<Line
						type="monotone"
						dataKey="fc"
						stroke="var(--color-blue-500)"
						strokeWidth={2}
						dot={{ r: 3 }}
						connectNulls
					/>
				</LineChart>
			</ChartContainer>

			{chronological.some((t) => t.ph != null) && (
				<>
					<h3 className="text-sm font-medium">pH Trend</h3>
					<ChartContainer config={chartConfig} className="h-48 w-full">
						<LineChart data={data}>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis dataKey="date" tick={{ fontSize: 10 }} />
							<YAxis domain={[6.5, 8.5]} tick={{ fontSize: 10 }} />
							<ChartTooltip content={<ChartTooltipContent />} />
							<ReferenceArea
								y1={7.2}
								y2={7.6}
								fill="var(--color-green-500)"
								fillOpacity={0.1}
							/>
							<Line
								type="monotone"
								dataKey="ph"
								stroke="var(--color-green-500)"
								strokeWidth={2}
								dot={{ r: 3 }}
								connectNulls
							/>
						</LineChart>
					</ChartContainer>
				</>
			)}
		</div>
	);
}
