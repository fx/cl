import { Button, Card, CardContent } from "@fx/ui";
import { Link } from "wouter";
import type { NextAction } from "../../types";

interface NextActionCardProps {
	nextAction: NextAction;
	poolId: string;
}

const priorityStyles: Record<
	NextAction["priority"],
	{ card: string; icon: string }
> = {
	urgent: {
		card: "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950",
		icon: "text-red-600 dark:text-red-400",
	},
	warning: {
		card: "border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950",
		icon: "text-yellow-600 dark:text-yellow-400",
	},
	info: {
		card: "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950",
		icon: "text-green-600 dark:text-green-400",
	},
};

const typeIcons: Record<NextAction["type"], string> = {
	dose: "\u26A0",
	test: "\uD83E\uDDEA",
	ok: "\u2705",
};

export function NextActionCard({ nextAction, poolId }: NextActionCardProps) {
	const styles = priorityStyles[nextAction.priority];

	return (
		<Card className={styles.card} data-testid="next-action-card">
			<CardContent className="flex items-start gap-3 pt-4">
				<span
					className={`text-2xl ${styles.icon}`}
					role="img"
					aria-label={nextAction.type}
				>
					{typeIcons[nextAction.type]}
				</span>
				<div className="min-w-0 flex-1">
					<p className="font-semibold">{nextAction.title}</p>
					<p className="mt-1 text-sm text-muted-foreground">
						{nextAction.description}
					</p>
					{nextAction.doseEvent && (
						<p className="mt-1 text-sm font-medium">
							Add {nextAction.doseEvent.productAmount}
						</p>
					)}
					<div className="mt-3 flex gap-2">
						{nextAction.type === "dose" && (
							<>
								{/* @ts-expect-error @fx/ui Button children type */}
								<Button asChild size="sm">
									<Link href={`/pools/${poolId}/test`}>Log Test</Link>
								</Button>
							</>
						)}
						{nextAction.type === "test" && (
							<>
								{/* @ts-expect-error @fx/ui Button children type */}
								<Button asChild size="sm">
									<Link href={`/pools/${poolId}/test`}>Log Test</Link>
								</Button>
							</>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
