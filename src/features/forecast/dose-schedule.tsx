import { Card, CardContent, CardHeader, CardTitle } from "@fx/ui";
import type { DoseEvent } from "../../types";

interface DoseScheduleProps {
	doseEvents: DoseEvent[];
}

function formatDateTime(iso: string): string {
	const d = new Date(iso);
	return d.toLocaleDateString(undefined, {
		weekday: "short",
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

export function DoseSchedule({ doseEvents }: DoseScheduleProps) {
	if (doseEvents.length === 0) {
		return null;
	}

	return (
		<Card data-testid="dose-schedule">
			<CardHeader>
				<CardTitle>Dose Schedule</CardTitle>
			</CardHeader>
			<CardContent>
				<ul className="space-y-3">
					{doseEvents.map((event) => (
						<li
							key={event.time}
							className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-sm shadow-sm"
						>
							<div>
								<p className="font-medium">{formatDateTime(event.time)}</p>
								<p className="text-muted-foreground">
									FC {event.fcBefore.toFixed(1)} → {event.fcAfter.toFixed(1)}{" "}
									ppm
								</p>
							</div>
							<div className="text-right">
								<p className="font-medium">{event.productAmount}</p>
								{event.cyaIncrease > 0 && (
									<p className="text-xs text-yellow-600 dark:text-yellow-400">
										+{event.cyaIncrease} ppm CYA
									</p>
								)}
							</div>
						</li>
					))}
				</ul>
			</CardContent>
		</Card>
	);
}
