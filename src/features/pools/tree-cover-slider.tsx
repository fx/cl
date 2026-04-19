import { Button, Label } from "@fx/ui";

const PRESETS = [
	{ value: 0, label: "0% — Full sun" },
	{ value: 25, label: "25% — Sparse shade" },
	{ value: 50, label: "50% — Partial shade" },
	{ value: 75, label: "75% — Mostly shaded" },
	{ value: 90, label: "90% — Dense canopy" },
] as const;

interface TreeCoverSliderProps {
	value: number;
	onChange: (value: number) => void;
}

export function TreeCoverSlider({ value, onChange }: TreeCoverSliderProps) {
	return (
		<div className="space-y-2">
			<Label htmlFor="treeCover">Tree Cover: {value}%</Label>
			<input
				id="treeCover"
				type="range"
				min={0}
				max={100}
				step={1}
				value={value}
				onChange={(e) => onChange(Number(e.target.value))}
				className="w-full"
			/>
			<div className="flex flex-wrap gap-2">
				{PRESETS.map((preset) => (
					<Button
						key={preset.value}
						variant={value === preset.value ? "default" : "outline"}
						size="sm"
						onClick={() => onChange(preset.value)}
					>
						{preset.label}
					</Button>
				))}
			</div>
		</div>
	);
}
