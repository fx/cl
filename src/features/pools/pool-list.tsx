import { Button } from "@fx/ui";
import { Link } from "wouter";
import { useAppStore } from "../../stores/app-store";
import { PoolCard } from "./pool-card";

export function PoolList() {
	const pools = useAppStore((s) => s.pools);

	const sorted = [...pools].sort(
		(a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
	);

	if (pools.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 py-16">
				<p className="text-lg text-muted-foreground">Add your first pool</p>
				<Button asChild nativeButton={false}>
					<Link href="/pools/new">Add Pool</Link>
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold">Your Pools</h2>
				<Button asChild nativeButton={false}>
					<Link href="/pools/new">Add Pool</Link>
				</Button>
			</div>
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{sorted.map((pool) => (
					<PoolCard key={pool.id} pool={pool} />
				))}
			</div>
		</div>
	);
}
