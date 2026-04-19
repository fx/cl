import { Badge } from "@fx/ui";

interface ChemistryStatusBarProps {
	fc: number | null;
	ph: number | null;
	cya: number | null;
	fcStatus: "ok" | "low" | "critical" | "high";
	phStatus: "ok" | "low" | "high";
}

const statusColors: Record<string, string> = {
	ok: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
	low: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
	high: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
	critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

function getCyaStatus(cya: number): { label: string; status: string } {
	if (cya > 80) return { label: "high", status: "critical" };
	if (cya > 60) return { label: "watch", status: "low" };
	return { label: "ok", status: "ok" };
}

export function ChemistryStatusBar({
	fc,
	ph,
	cya,
	fcStatus,
	phStatus,
}: ChemistryStatusBarProps) {
	const cyaInfo = cya != null ? getCyaStatus(cya) : null;

	return (
		<div className="flex flex-wrap gap-2" data-testid="chemistry-status-bar">
			{fc != null && (
				<Badge className={statusColors[fcStatus]}>
					FC {fc} — {fcStatus}
				</Badge>
			)}
			{ph != null && (
				<Badge className={statusColors[phStatus]}>
					pH {ph} — {phStatus}
				</Badge>
			)}
			{cya != null && cyaInfo && (
				<Badge className={statusColors[cyaInfo.status]}>
					CYA {cya} — {cyaInfo.label}
				</Badge>
			)}
		</div>
	);
}
