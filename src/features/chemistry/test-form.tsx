import {
	Alert,
	AlertDescription,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Input,
	Label,
	Textarea,
} from "@fx/ui";
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { generateId } from "../../lib/id";
import { useAppStore } from "../../stores/app-store";
import type { WaterTest } from "../../types";

export function TestForm() {
	const { id } = useParams<{ id: string }>();
	const [, navigate] = useLocation();
	const pool = useAppStore((s) => s.pools.find((p) => p.id === id));
	const addTestResult = useAppStore((s) => s.addTestResult);

	const [fc, setFc] = useState("");
	const [cc, setCc] = useState("");
	const [ph, setPh] = useState("");
	const [cya, setCya] = useState("");
	const [ta, setTa] = useState("");
	const [ch, setCh] = useState("");
	const [tempF, setTempF] = useState("");
	const [tds, setTds] = useState("");
	const [salt, setSalt] = useState("");
	const [phosphates, setPhosphates] = useState("");
	const [notes, setNotes] = useState("");
	const [testedAt, setTestedAt] = useState("");
	const [errors, setErrors] = useState<string[]>([]);

	if (!pool) {
		return (
			<div className="py-8 text-center text-muted-foreground">
				Pool not found
			</div>
		);
	}

	const poolId = pool.id;
	const poolName = pool.name;

	function parseNum(val: string): number | undefined {
		if (val.trim() === "") return undefined;
		const n = Number.parseFloat(val);
		return Number.isNaN(n) ? undefined : n;
	}

	function validate(): string[] {
		const errs: string[] = [];
		const fcVal = parseNum(fc);
		const ccVal = parseNum(cc);
		const phVal = parseNum(ph);
		const cyaVal = parseNum(cya);
		const taVal = parseNum(ta);
		const chVal = parseNum(ch);
		const tempVal = parseNum(tempF);

		if (fcVal !== undefined && (fcVal < 0 || fcVal > 50))
			errs.push("FC must be 0-50 ppm");
		if (ccVal !== undefined && (ccVal < 0 || ccVal > 20))
			errs.push("CC must be 0-20 ppm");
		if (phVal !== undefined && (phVal < 6.0 || phVal > 9.0))
			errs.push("pH must be 6.0-9.0");
		if (cyaVal !== undefined && (cyaVal < 0 || cyaVal > 300))
			errs.push("CYA must be 0-300 ppm");
		if (taVal !== undefined && (taVal < 0 || taVal > 500))
			errs.push("TA must be 0-500 ppm");
		if (chVal !== undefined && (chVal < 0 || chVal > 1000))
			errs.push("CH must be 0-1000 ppm");
		if (tempVal !== undefined && (tempVal < 32 || tempVal > 120))
			errs.push("Temp must be 32-120°F");

		// At least one parameter must be entered
		if (
			fcVal === undefined &&
			ccVal === undefined &&
			phVal === undefined &&
			cyaVal === undefined &&
			taVal === undefined &&
			chVal === undefined
		) {
			errs.push("Enter at least one test parameter");
		}

		return errs;
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const errs = validate();
		if (errs.length > 0) {
			setErrors(errs);
			return;
		}

		const now = new Date().toISOString();
		const test: WaterTest = {
			id: generateId(),
			poolId: poolId,
			testedAt: testedAt ? new Date(testedAt).toISOString() : now,
			createdAt: now,
			fc: parseNum(fc),
			cc: parseNum(cc),
			ph: parseNum(ph),
			cya: parseNum(cya),
			ta: parseNum(ta),
			ch: parseNum(ch),
			tempF: parseNum(tempF),
			tds: parseNum(tds),
			salt: parseNum(salt),
			phosphates: parseNum(phosphates),
			notes: notes.trim() || undefined,
		};

		addTestResult(poolId, test);
		navigate(`/pools/${poolId}/history`);
	}

	return (
		<div className="mx-auto max-w-2xl space-y-4">
			<h2 className="text-xl font-semibold">Log Water Test — {poolName}</h2>

			<form onSubmit={handleSubmit} className="space-y-4">
				{errors.length > 0 && (
					<Alert variant="destructive">
						<AlertDescription>
							{errors.map((err) => (
								<p key={err}>{err}</p>
							))}
						</AlertDescription>
					</Alert>
				)}

				<Card>
					<CardHeader>
						<CardTitle>Primary Parameters</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-1">
							<Label htmlFor="fc">Free Chlorine (ppm)</Label>
							<Input
								id="fc"
								type="number"
								step="0.1"
								min="0"
								max="50"
								value={fc}
								onChange={(e) => setFc(e.target.value)}
								placeholder="e.g. 3.5"
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="cc">Combined Chlorine (ppm)</Label>
							<Input
								id="cc"
								type="number"
								step="0.1"
								min="0"
								max="20"
								value={cc}
								onChange={(e) => setCc(e.target.value)}
								placeholder="e.g. 0.2"
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="ph">pH</Label>
							<Input
								id="ph"
								type="number"
								step="0.1"
								min="6"
								max="9"
								value={ph}
								onChange={(e) => setPh(e.target.value)}
								placeholder="e.g. 7.4"
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="cya">Cyanuric Acid (ppm)</Label>
							<Input
								id="cya"
								type="number"
								step="1"
								min="0"
								max="300"
								value={cya}
								onChange={(e) => setCya(e.target.value)}
								placeholder="e.g. 40"
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="ta">Total Alkalinity (ppm)</Label>
							<Input
								id="ta"
								type="number"
								step="1"
								min="0"
								max="500"
								value={ta}
								onChange={(e) => setTa(e.target.value)}
								placeholder="e.g. 100"
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="ch">Calcium Hardness (ppm)</Label>
							<Input
								id="ch"
								type="number"
								step="1"
								min="0"
								max="1000"
								value={ch}
								onChange={(e) => setCh(e.target.value)}
								placeholder="e.g. 300"
							/>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Secondary Parameters</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-1">
							<Label htmlFor="tempF">Water Temperature (°F)</Label>
							<Input
								id="tempF"
								type="number"
								step="1"
								min="32"
								max="120"
								value={tempF}
								onChange={(e) => setTempF(e.target.value)}
								placeholder="e.g. 82"
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="tds">TDS (ppm)</Label>
							<Input
								id="tds"
								type="number"
								step="1"
								min="0"
								value={tds}
								onChange={(e) => setTds(e.target.value)}
								placeholder="e.g. 1000"
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="salt">Salt (ppm)</Label>
							<Input
								id="salt"
								type="number"
								step="1"
								min="0"
								value={salt}
								onChange={(e) => setSalt(e.target.value)}
								placeholder="e.g. 3200"
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="phosphates">Phosphates (ppb)</Label>
							<Input
								id="phosphates"
								type="number"
								step="1"
								min="0"
								value={phosphates}
								onChange={(e) => setPhosphates(e.target.value)}
								placeholder="e.g. 100"
							/>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Test Details</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-4">
						<div className="space-y-1">
							<Label htmlFor="testedAt">
								Test Date/Time (leave blank for now)
							</Label>
							<Input
								id="testedAt"
								type="datetime-local"
								value={testedAt}
								onChange={(e) => setTestedAt(e.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="notes">Notes</Label>
							<Textarea
								id="notes"
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								placeholder="Optional notes..."
								rows={2}
							/>
						</div>
					</CardContent>
				</Card>

				<div className="flex gap-2">
					{/* @ts-expect-error @fx/ui Button children type */}
					<Button type="submit">Save Test</Button>
					{/* @ts-expect-error @fx/ui Button children type */}
					<Button
						type="button"
						variant="outline"
						onClick={() => navigate(`/pools/${poolId}`)}
					>
						Cancel
					</Button>
				</div>
			</form>
		</div>
	);
}
