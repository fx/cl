import { Card, CardContent } from "@fx/ui";
import type { ChemistryStatus } from "../../types";

interface ParameterAlertsProps {
	chemStatus: ChemistryStatus;
}

export function ParameterAlerts({ chemStatus }: ParameterAlertsProps) {
	const alerts: { title: string; description: string; color: string }[] = [];

	// pH
	if (chemStatus.phStatus !== "ok" && chemStatus.currentPh != null) {
		alerts.push({
			title: chemStatus.phStatus === "high" ? "pH too high" : "pH too low",
			description:
				chemStatus.phStatus === "high"
					? `pH is ${chemStatus.currentPh}. Add muriatic acid to lower below 7.6.`
					: `pH is ${chemStatus.currentPh}. Add soda ash to raise above 7.2.`,
			color:
				"border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950",
		});
	}

	// LSI
	if (chemStatus.lsiStatus && chemStatus.lsiStatus !== "balanced") {
		alerts.push({
			title:
				chemStatus.lsiStatus === "corrosive"
					? "Water is corrosive"
					: "Water is scale-forming",
			description: `LSI is ${chemStatus.lsi}. ${
				chemStatus.lsiStatus === "corrosive"
					? "Raise pH or calcium hardness."
					: "Lower pH or calcium hardness."
			}`,
			color:
				"border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950",
		});
	}

	if (alerts.length === 0) return null;

	return (
		<div className="space-y-2" data-testid="parameter-alerts">
			{alerts.map((alert) => (
				<Card key={alert.title} className={alert.color}>
					<CardContent className="py-3 text-sm">
						<p className="font-medium">{alert.title}</p>
						<p className="text-muted-foreground">{alert.description}</p>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
