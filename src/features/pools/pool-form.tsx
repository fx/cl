import {
	Button,
	Input,
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Textarea,
} from "@fx/ui";
import { type FormEvent, useState } from "react";
import { useLocation } from "wouter";
import { useAppStore } from "../../stores/app-store";
import type { ChlorineSource, Pool, SurfaceType } from "../../types";
import { CHLORINE_SOURCE_LABELS, SURFACE_TYPE_LABELS } from "../../types";
import { TreeCoverSlider } from "./tree-cover-slider";

interface PoolFormProps {
	pool?: Pool;
}

interface FormErrors {
	name?: string;
	volumeGallons?: string;
	latitude?: string;
	longitude?: string;
}

function validateForm(fields: {
	name: string;
	volumeGallons: string;
	latitude: string;
	longitude: string;
}): FormErrors {
	const errors: FormErrors = {};

	if (!fields.name.trim()) {
		errors.name = "Name is required";
	}

	const volume = Number(fields.volumeGallons);
	if (!fields.volumeGallons || Number.isNaN(volume)) {
		errors.volumeGallons = "Volume is required";
	} else if (volume < 100 || volume > 1_000_000) {
		errors.volumeGallons = "Volume must be between 100 and 1,000,000 gallons";
	}

	const lat = Number(fields.latitude);
	if (!fields.latitude || Number.isNaN(lat)) {
		errors.latitude = "Latitude is required";
	} else if (lat < -90 || lat > 90) {
		errors.latitude = "Latitude must be between -90 and 90";
	}

	const lng = Number(fields.longitude);
	if (!fields.longitude || Number.isNaN(lng)) {
		errors.longitude = "Longitude is required";
	} else if (lng < -180 || lng > 180) {
		errors.longitude = "Longitude must be between -180 and 180";
	}

	return errors;
}

export function PoolForm({ pool }: PoolFormProps) {
	const [, navigate] = useLocation();
	const addPool = useAppStore((s) => s.addPool);
	const updatePool = useAppStore((s) => s.updatePool);

	const [name, setName] = useState(pool?.name ?? "");
	const [volumeGallons, setVolumeGallons] = useState(
		pool?.volumeGallons?.toString() ?? "",
	);
	const [latitude, setLatitude] = useState(pool?.latitude?.toString() ?? "");
	const [longitude, setLongitude] = useState(pool?.longitude?.toString() ?? "");
	const [surfaceType, setSurfaceType] = useState<SurfaceType>(
		pool?.surfaceType ?? "plaster",
	);
	const [chlorineSource, setChlorineSource] = useState<ChlorineSource>(
		pool?.chlorineSource ?? "liquid",
	);
	const [treeCoverPercent, setTreeCoverPercent] = useState(
		pool?.treeCoverPercent ?? 0,
	);
	const [notes, setNotes] = useState(pool?.notes ?? "");
	const [errors, setErrors] = useState<FormErrors>({});

	const isEditing = !!pool;

	/* v8 ignore next 3 */
	function handleSurfaceTypeChange(v: unknown) {
		setSurfaceType(v as SurfaceType);
	}

	/* v8 ignore next 3 */
	function handleChlorineSourceChange(v: unknown) {
		setChlorineSource(v as ChlorineSource);
	}

	function handleSubmit(e: FormEvent) {
		e.preventDefault();

		const validationErrors = validateForm({
			name,
			volumeGallons,
			latitude,
			longitude,
		});
		if (Object.keys(validationErrors).length > 0) {
			setErrors(validationErrors);
			return;
		}

		const now = new Date().toISOString();

		if (isEditing) {
			updatePool(pool.id, {
				name: name.trim(),
				volumeGallons: Number(volumeGallons),
				latitude: Number(latitude),
				longitude: Number(longitude),
				surfaceType,
				chlorineSource,
				treeCoverPercent,
				notes,
				updatedAt: now,
			});
			navigate(`/pools/${pool.id}`);
		} else {
			const newPool: Pool = {
				id: crypto.randomUUID(),
				name: name.trim(),
				volumeGallons: Number(volumeGallons),
				latitude: Number(latitude),
				longitude: Number(longitude),
				surfaceType,
				chlorineSource,
				treeCoverPercent,
				isIndoor: false,
				targetFc: null,
				targetPh: 7.4,
				notes,
				createdAt: now,
				updatedAt: now,
			};
			addPool(newPool);
			navigate(`/pools/${newPool.id}`);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-4">
			<h2 className="text-xl font-semibold">
				{isEditing ? "Edit Pool" : "Add Pool"}
			</h2>

			<div className="space-y-1">
				<Label htmlFor="name">Name *</Label>
				<Input
					id="name"
					value={name}
					onChange={(e) => setName((e.target as HTMLInputElement).value)}
					placeholder="e.g. Backyard Pool"
				/>
				{errors.name && (
					<p className="text-sm text-destructive">{errors.name}</p>
				)}
			</div>

			<div className="space-y-1">
				<Label htmlFor="volumeGallons">Volume (gallons) *</Label>
				<Input
					id="volumeGallons"
					type="number"
					value={volumeGallons}
					onChange={(e) =>
						setVolumeGallons((e.target as HTMLInputElement).value)
					}
					placeholder="e.g. 15000"
				/>
				{errors.volumeGallons && (
					<p className="text-sm text-destructive">{errors.volumeGallons}</p>
				)}
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-1">
					<Label htmlFor="latitude">Latitude *</Label>
					<Input
						id="latitude"
						type="number"
						value={latitude}
						onChange={(e) => setLatitude((e.target as HTMLInputElement).value)}
						placeholder="e.g. 33.4484"
						step="any"
					/>
					{errors.latitude && (
						<p className="text-sm text-destructive">{errors.latitude}</p>
					)}
				</div>
				<div className="space-y-1">
					<Label htmlFor="longitude">Longitude *</Label>
					<Input
						id="longitude"
						type="number"
						value={longitude}
						onChange={(e) => setLongitude((e.target as HTMLInputElement).value)}
						placeholder="e.g. -112.0740"
						step="any"
					/>
					{errors.longitude && (
						<p className="text-sm text-destructive">{errors.longitude}</p>
					)}
				</div>
			</div>

			<div className="space-y-1">
				<Label htmlFor="surfaceType">Surface Type</Label>
				<Select value={surfaceType} onValueChange={handleSurfaceTypeChange}>
					<SelectTrigger id="surfaceType">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{Object.entries(SURFACE_TYPE_LABELS).map(([value, label]) => (
							<SelectItem key={value} value={value}>
								{label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-1">
				<Label htmlFor="chlorineSource">Chlorine Source</Label>
				<Select
					value={chlorineSource}
					onValueChange={handleChlorineSourceChange}
				>
					<SelectTrigger id="chlorineSource">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{Object.entries(CHLORINE_SOURCE_LABELS).map(([value, label]) => (
							<SelectItem key={value} value={value}>
								{label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<TreeCoverSlider
				value={treeCoverPercent}
				onChange={setTreeCoverPercent}
			/>

			<div className="space-y-1">
				<Label htmlFor="notes">Notes</Label>
				<Textarea
					id="notes"
					value={notes}
					onChange={(e) => setNotes(e.target.value)}
					placeholder="Any additional notes about this pool..."
					rows={3}
				/>
			</div>

			<div className="flex gap-2">
				{/* @ts-expect-error @fx/ui Button children type */}
				<Button type="submit">{isEditing ? "Save Changes" : "Add Pool"}</Button>
				{/* @ts-expect-error @fx/ui Button children type */}
				<Button
					type="button"
					variant="outline"
					onClick={() => navigate(isEditing ? `/pools/${pool.id}` : "/")}
				>
					Cancel
				</Button>
			</div>
		</form>
	);
}
