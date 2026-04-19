import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Input,
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@fx/ui";
import { useState } from "react";
import { useParams } from "wouter";
import { calculateDose } from "../../lib/chemistry/dosing";
import { calculateFcTarget } from "../../lib/chemistry/fc-cya";
import { useAppStore } from "../../stores/app-store";
import {
	CHLORINE_SOURCE_LABELS,
	type ChlorineSource,
	type WaterTest,
} from "../../types";

const emptyTests: WaterTest[] = [];

export function DosingCalculator() {
	const { id } = useParams<{ id: string }>();
	const pool = useAppStore((s) => s.pools.find((p) => p.id === id));
	const testResults = useAppStore((s) => s.testResults);
	const tests = testResults[id ?? ""] ?? emptyTests;

	const latestFc = [...tests]
		.sort(
			(a, b) => new Date(b.testedAt).getTime() - new Date(a.testedAt).getTime(),
		)
		.find((t) => t.fc != null)?.fc;
	const latestCya = [...tests]
		.sort(
			(a, b) => new Date(b.testedAt).getTime() - new Date(a.testedAt).getTime(),
		)
		.find((t) => t.cya != null)?.cya;

	const [currentFc, setCurrentFc] = useState(latestFc?.toString() ?? "");
	const [targetFc, setTargetFc] = useState("");
	const [source, setSource] = useState<ChlorineSource>(
		pool?.chlorineSource ?? "liquid",
	);

	if (!pool) {
		return (
			<div className="py-8 text-center text-muted-foreground">
				Pool not found
			</div>
		);
	}

	const fcTargets = calculateFcTarget(latestCya ?? 0);
	const parsedCurrent = Number.parseFloat(currentFc);
	const parsedTarget = Number.parseFloat(targetFc);
	const hasValidInput =
		!Number.isNaN(parsedCurrent) &&
		!Number.isNaN(parsedTarget) &&
		parsedTarget > parsedCurrent;

	const result = hasValidInput
		? calculateDose(pool.volumeGallons, parsedCurrent, parsedTarget, source)
		: null;

	const sourceOptions = Object.entries(CHLORINE_SOURCE_LABELS).filter(
		([key]) => key !== "swg",
	) as [Exclude<ChlorineSource, "swg">, string][];

	return (
		<Card>
			<CardHeader>
				<CardTitle>Dosing Calculator</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-1">
						<Label htmlFor="dose-current">Current FC (ppm)</Label>
						<Input
							id="dose-current"
							type="number"
							step="0.1"
							value={currentFc}
							onChange={(e) => setCurrentFc(e.target.value)}
							placeholder={`e.g. ${latestFc ?? "2.0"}`}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="dose-target">Target FC (ppm)</Label>
						<Input
							id="dose-target"
							type="number"
							step="0.1"
							value={targetFc}
							onChange={(e) => setTargetFc(e.target.value)}
							placeholder={`e.g. ${fcTargets.target}`}
						/>
					</div>
				</div>

				<div className="space-y-1">
					<Label htmlFor="dose-source">Chlorine Source</Label>
					<Select
						value={source}
						onValueChange={(v) => setSource(v as ChlorineSource)}
					>
						<SelectTrigger id="dose-source">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{sourceOptions.map(([key, label]) => (
								<SelectItem key={key} value={key}>
									{label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{result && (
					<div className="rounded border bg-muted p-3 text-sm">
						<p className="font-medium">Add {result.formatted}</p>
						<p className="text-muted-foreground">
							Pool: {pool.volumeGallons.toLocaleString()} gal | +
							{(parsedTarget - parsedCurrent).toFixed(1)} ppm
						</p>
						{result.cyaIncrease > 0 && (
							<p className="mt-1 text-yellow-600 dark:text-yellow-400">
								This will add ~{result.cyaIncrease} ppm CYA
								{latestCya != null &&
									` (projected: ${latestCya + result.cyaIncrease} ppm)`}
								. Consider switching to liquid chlorine to avoid CYA buildup.
							</p>
						)}
					</div>
				)}

				{source === "swg" && (
					<p className="text-sm text-muted-foreground">
						SWG dosing depends on runtime hours. Use your SWG controller to
						adjust output.
					</p>
				)}

				<p className="text-xs text-muted-foreground">
					Target range for CYA {latestCya ?? 0}: FC {fcTargets.min}–
					{fcTargets.max} ppm (target: {fcTargets.target})
				</p>
			</CardContent>
		</Card>
	);
}
