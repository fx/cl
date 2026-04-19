import { Alert, AlertDescription, AlertTitle } from "@fx/ui";
import { useState } from "react";
import type { ForecastWarning } from "../../types";

interface WarningBannerProps {
	warnings: ForecastWarning[];
}

const severityStyles: Record<ForecastWarning["severity"], string> = {
	urgent: "border-red-300 dark:border-red-800",
	warning: "border-yellow-300 dark:border-yellow-800",
	info: "border-blue-300 dark:border-blue-800",
};

export function WarningBanner({ warnings }: WarningBannerProps) {
	const [dismissed, setDismissed] = useState<Set<string>>(new Set());

	if (warnings.length === 0) return null;

	const visible = warnings.filter((w) => !dismissed.has(w.type));
	if (visible.length === 0) return null;

	function dismiss(type: string) {
		setDismissed((prev) => new Set(prev).add(type));
	}

	return (
		<div className="space-y-2" data-testid="warning-banner">
			{visible.map((warning) => (
				<Alert
					key={warning.type}
					variant={warning.severity === "urgent" ? "destructive" : "default"}
					className={severityStyles[warning.severity]}
				>
					<div className="flex items-start justify-between">
						<div>
							<AlertTitle>{warning.title}</AlertTitle>
							<AlertDescription>{warning.description}</AlertDescription>
						</div>
						<button
							type="button"
							onClick={() => dismiss(warning.type)}
							className="ml-2 shrink-0 text-muted-foreground hover:text-foreground"
							aria-label={`Dismiss ${warning.title}`}
						>
							✕
						</button>
					</div>
				</Alert>
			))}
		</div>
	);
}
