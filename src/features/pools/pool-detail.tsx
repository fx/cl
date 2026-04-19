import {
	Alert,
	AlertDescription,
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@fx/ui";
import { Link, useLocation, useParams } from "wouter";
import { useSunExposure } from "../../hooks/use-sun-exposure";
import { evaluateChemistry } from "../../lib/chemistry/evaluate";
import { useAppStore } from "../../stores/app-store";
import type { ChemistryStatus, WaterTest } from "../../types";
import { CHLORINE_SOURCE_LABELS, SURFACE_TYPE_LABELS } from "../../types";
import { DosingCalculator } from "../chemistry/dosing-calculator";
import { ForecastDashboard } from "../forecast/forecast-dashboard";
import { PoolMap } from "./pool-map";

const emptyTests: WaterTest[] = [];

function StatusBadge({ status, label }: { status: string; label: string }) {
	const variant =
		status === "ok" || status === "balanced" ? "outline" : "destructive";
	return (
		<Badge variant={variant}>
			{label}: {status}
		</Badge>
	);
}

function ChemistryCard({ chemStatus }: { chemStatus: ChemistryStatus }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Water Chemistry</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="flex flex-wrap gap-2">
					{chemStatus.currentFc != null && (
						<StatusBadge
							status={chemStatus.fcStatus}
							label={`FC ${chemStatus.currentFc}`}
						/>
					)}
					{chemStatus.currentPh != null && (
						<StatusBadge
							status={chemStatus.phStatus}
							label={`pH ${chemStatus.currentPh}`}
						/>
					)}
					{chemStatus.lsi != null && chemStatus.lsiStatus != null && (
						<StatusBadge
							status={chemStatus.lsiStatus}
							label={`LSI ${chemStatus.lsi}`}
						/>
					)}
					{chemStatus.fcCyaRatio != null && (
						<Badge variant="outline">
							FC/CYA: {(chemStatus.fcCyaRatio * 100).toFixed(1)}%
						</Badge>
					)}
				</div>
				{chemStatus.recommendations.length > 0 && (
					<div className="space-y-1">
						{chemStatus.recommendations.map((rec) => (
							<Alert
								key={`${rec.type}-${rec.priority}-${rec.title}`}
								variant={
									rec.priority === "urgent"
										? "destructive"
										: rec.priority === "warning"
											? "warning"
											: "default"
								}
							>
								<AlertDescription>
									<span className="font-medium">{rec.title}</span>
									<span className="ml-1">{rec.description}</span>
									{rec.productAmount && (
										<span className="ml-1 font-medium">
											Add: {rec.productAmount}
										</span>
									)}
								</AlertDescription>
							</Alert>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

export function PoolDetail() {
	const { id } = useParams<{ id: string }>();
	const [, navigate] = useLocation();
	const pool = useAppStore((s) => s.pools.find((p) => p.id === id));
	const testResults = useAppStore((s) => s.testResults);
	const tests = testResults[id ?? ""] ?? emptyTests;
	const deletePool = useAppStore((s) => s.deletePool);
	const sunExposure = useSunExposure(pool);

	if (!pool) {
		return (
			<div className="py-8 text-center">
				<p className="text-muted-foreground">Pool not found</p>
				{/* @ts-expect-error @fx/ui Button children type */}
				<Button asChild variant="outline" className="mt-4">
					<Link href="/">Back to pools</Link>
				</Button>
			</div>
		);
	}

	const poolId = pool.id;
	function handleDelete() {
		deletePool(poolId);
		navigate("/");
	}

	const chemStatus = tests.length > 0 ? evaluateChemistry(pool, tests) : null;

	return (
		<div className="mx-auto max-w-2xl space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold">{pool.name}</h2>
				<div className="flex gap-2">
					{/* @ts-expect-error @fx/ui Button children type */}
					<Button asChild size="sm">
						<Link href={`/pools/${pool.id}/test`}>Log Test</Link>
					</Button>
					{/* @ts-expect-error @fx/ui Button children type */}
					<Button asChild variant="outline" size="sm">
						<Link href={`/pools/${pool.id}/history`}>History</Link>
					</Button>
					{/* @ts-expect-error @fx/ui Button children type */}
					<Button asChild variant="outline" size="sm">
						<Link href={`/pools/${pool.id}/edit`}>Edit</Link>
					</Button>
					<AlertDialog>
						<AlertDialogTrigger>
							{/* @ts-expect-error @fx/ui Button children type */}
							<Button variant="destructive" size="sm">
								Delete
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Delete Pool</AlertDialogTitle>
								<AlertDialogDescription>
									Are you sure you want to delete "{pool.name}"? This will
									remove the pool and all associated test results. This action
									cannot be undone.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction onClick={handleDelete}>
									Delete
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Pool Details</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-2 text-sm">
					<div className="flex justify-between">
						<span className="text-muted-foreground">Volume</span>
						<span>{pool.volumeGallons.toLocaleString()} gallons</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">Location</span>
						<span>
							{pool.latitude}, {pool.longitude}
						</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">Surface Type</span>
						<span>{SURFACE_TYPE_LABELS[pool.surfaceType]}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">Chlorine Source</span>
						<span>{CHLORINE_SOURCE_LABELS[pool.chlorineSource]}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">Tree Cover</span>
						<span>{pool.treeCoverPercent}%</span>
					</div>
					{pool.notes && (
						<div className="pt-2">
							<span className="text-muted-foreground">Notes</span>
							<p className="mt-1">{pool.notes}</p>
						</div>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Location</CardTitle>
				</CardHeader>
				<CardContent>
					<PoolMap latitude={pool.latitude} longitude={pool.longitude} />
				</CardContent>
			</Card>

			{chemStatus ? (
				<ChemistryCard chemStatus={chemStatus} />
			) : (
				<Card>
					<CardHeader>
						<CardTitle>Water Chemistry</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							No test results yet.{" "}
							<Link href={`/pools/${pool.id}/test`} className="underline">
								Log your first test
							</Link>{" "}
							to see chemistry status.
						</p>
					</CardContent>
				</Card>
			)}

			<DosingCalculator />

			<ForecastDashboard pool={pool} tests={tests} sunExposure={sunExposure} />

			{/* @ts-expect-error @fx/ui Button children type */}
			<Button asChild variant="outline">
				<Link href="/">Back to pools</Link>
			</Button>
		</div>
	);
}
