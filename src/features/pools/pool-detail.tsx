import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@fx/ui";
import { Link, useLocation, useParams } from "wouter";
import { useAppStore } from "../../stores/app-store";
import { CHLORINE_SOURCE_LABELS, SURFACE_TYPE_LABELS } from "../../types";

export function PoolDetail() {
	const { id } = useParams<{ id: string }>();
	const [, navigate] = useLocation();
	const pool = useAppStore((s) => s.pools.find((p) => p.id === id));
	const deletePool = useAppStore((s) => s.deletePool);

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

	return (
		<div className="mx-auto max-w-2xl space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold">{pool.name}</h2>
				<div className="flex gap-2">
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
					<CardTitle>Water Chemistry</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						No test results yet. Chemistry tracking coming soon.
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Forecast</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						Forecast features coming soon.
					</p>
				</CardContent>
			</Card>

			{/* @ts-expect-error @fx/ui Button children type */}
			<Button asChild variant="outline">
				<Link href="/">Back to pools</Link>
			</Button>
		</div>
	);
}
