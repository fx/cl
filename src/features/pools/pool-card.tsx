import { Card, CardContent, CardHeader, CardTitle } from "@fx/ui";
import { Link } from "wouter";
import type { Pool } from "../../types";

interface PoolCardProps {
	pool: Pool;
}

export function PoolCard({ pool }: PoolCardProps) {
	return (
		<Link href={`/pools/${pool.id}`} className="block">
			<Card className="transition-colors hover:bg-muted/50">
				<CardHeader>
					<CardTitle>{pool.name}</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						{pool.volumeGallons.toLocaleString()} gallons
					</p>
					<p className="text-sm text-muted-foreground">No tests yet</p>
				</CardContent>
			</Card>
		</Link>
	);
}
