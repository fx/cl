import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@fx/ui";
import { Link, useParams } from "wouter";
import { calculateFcTarget } from "../../lib/chemistry/fc-cya";
import { useAppStore } from "../../stores/app-store";
import type { WaterTest } from "../../types";
import { TestTrendChart } from "./test-trend-chart";

const emptyTests: WaterTest[] = [];

function formatDate(iso: string): string {
	return new Date(iso).toLocaleString();
}

function ValueBadge({
	label,
	value,
	status,
}: {
	label: string;
	value: string;
	status: "ok" | "low" | "high";
}) {
	const variant = status === "ok" ? "outline" : "destructive";
	return (
		<Badge variant={variant} className="text-xs">
			{label}: {value}
		</Badge>
	);
}

function getFcStatus(fc: number, cya: number | null): "ok" | "low" | "high" {
	const targets = calculateFcTarget(cya ?? 0);
	if (fc < targets.min) return "low";
	if (fc > targets.max) return "high";
	return "ok";
}

function getPhStatus(ph: number): "ok" | "low" | "high" {
	if (ph < 7.2) return "low";
	if (ph > 7.6) return "high";
	return "ok";
}

function TestRow({
	test,
	latestCya,
}: {
	test: WaterTest;
	latestCya: number | null;
}) {
	return (
		<div className="flex flex-wrap items-center gap-2 py-2">
			<span className="text-xs text-muted-foreground w-full sm:w-auto">
				{formatDate(test.testedAt)}
			</span>
			<div className="flex flex-wrap gap-1">
				{test.fc != null && (
					<ValueBadge
						label="FC"
						value={`${test.fc}`}
						status={getFcStatus(test.fc, latestCya)}
					/>
				)}
				{test.cc != null && (
					<ValueBadge
						label="CC"
						value={`${test.cc}`}
						status={test.cc > 0.5 ? "high" : "ok"}
					/>
				)}
				{test.ph != null && (
					<ValueBadge
						label="pH"
						value={`${test.ph}`}
						status={getPhStatus(test.ph)}
					/>
				)}
				{test.cya != null && (
					<Badge variant="outline" className="text-xs">
						CYA: {test.cya}
					</Badge>
				)}
				{test.ta != null && (
					<Badge variant="outline" className="text-xs">
						TA: {test.ta}
					</Badge>
				)}
				{test.ch != null && (
					<Badge variant="outline" className="text-xs">
						CH: {test.ch}
					</Badge>
				)}
				{test.tempF != null && (
					<Badge variant="outline" className="text-xs">
						{test.tempF}°F
					</Badge>
				)}
			</div>
			{test.notes && (
				<span className="text-xs text-muted-foreground italic w-full">
					{test.notes}
				</span>
			)}
		</div>
	);
}

export function TestHistory() {
	const { id } = useParams<{ id: string }>();
	const pool = useAppStore((s) => s.pools.find((p) => p.id === id));
	const testResults = useAppStore((s) => s.testResults);
	const tests = testResults[id ?? ""] ?? emptyTests;

	if (!pool) {
		return (
			<div className="py-8 text-center text-muted-foreground">
				Pool not found
			</div>
		);
	}

	const sorted = [...tests].sort(
		(a, b) => new Date(b.testedAt).getTime() - new Date(a.testedAt).getTime(),
	);

	const latestCya = sorted.find((t) => t.cya != null)?.cya ?? null;

	return (
		<div className="mx-auto max-w-2xl space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold">Test History — {pool.name}</h2>
				<Button asChild nativeButton={false} size="sm">
					<Link href={`/pools/${pool.id}/test`}>Log Test</Link>
				</Button>
			</div>

			{sorted.length > 0 && <TestTrendChart tests={sorted} cya={latestCya} />}

			<Card>
				<CardHeader>
					<CardTitle>Results ({sorted.length})</CardTitle>
				</CardHeader>
				<CardContent>
					{sorted.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No test results yet. Log your first test to get started.
						</p>
					) : (
						<div className="divide-y">
							{sorted.map((test) => (
								<TestRow key={test.id} test={test} latestCya={latestCya} />
							))}
						</div>
					)}
				</CardContent>
			</Card>

			<Button asChild nativeButton={false} variant="outline">
				<Link href={`/pools/${pool.id}`}>Back to pool</Link>
			</Button>
		</div>
	);
}
