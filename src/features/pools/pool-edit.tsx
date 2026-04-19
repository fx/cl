import { Button } from "@fx/ui";
import { Link, useParams } from "wouter";
import { useAppStore } from "../../stores/app-store";
import { PoolForm } from "./pool-form";

export function PoolEdit() {
	const { id } = useParams<{ id: string }>();
	const pool = useAppStore((s) => s.pools.find((p) => p.id === id));

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

	return <PoolForm pool={pool} />;
}
