export type PoolId = string;

export type SurfaceType =
	| "plaster"
	| "vinyl"
	| "fiberglass"
	| "pebble"
	| "tile";

export type ChlorineSource =
	| "liquid"
	| "liquid_6"
	| "cal_hypo"
	| "dichlor"
	| "trichlor"
	| "swg";

export interface Pool {
	id: PoolId;
	name: string;
	latitude: number;
	longitude: number;
	volumeGallons: number;
	surfaceType: SurfaceType;
	chlorineSource: ChlorineSource;
	treeCoverPercent: number;
	isIndoor: boolean;
	targetFc: number | null;
	targetPh: number;
	notes: string;
	createdAt: string;
	updatedAt: string;
}

export interface WaterTest {
	id: string;
	poolId: PoolId;
	testedAt: string;
	createdAt: string;

	// Primary (all optional — user logs what they test)
	fc?: number;
	cc?: number;
	ph?: number;
	cya?: number;
	ta?: number;
	ch?: number;

	// Secondary
	tempF?: number;
	tds?: number;
	salt?: number;
	phosphates?: number;

	// Context
	notes?: string;
}

export interface ChemistryStatus {
	poolId: string;
	computedAt: string;
	currentFc: number | null;
	currentPh: number | null;
	currentCya: number | null;
	fcStatus: "ok" | "low" | "critical" | "high";
	phStatus: "ok" | "low" | "high";
	lsi: number | null;
	lsiStatus: "corrosive" | "balanced" | "scaling" | null;
	fcCyaRatio: number | null;
	recommendations: Recommendation[];
}

export interface Recommendation {
	type: "dose" | "shock" | "test" | "warning";
	priority: "info" | "warning" | "urgent";
	title: string;
	description: string;
	productAmount?: string;
}

export interface DecayParameters {
	kUvBase: number;
	kDemand: number;
	kObservedAvg: number | null;
	kEffective: number;
	alpha: number;
}

export interface UserPreferences {
	units: "imperial" | "metric";
}

export const SURFACE_TYPE_LABELS: Record<SurfaceType, string> = {
	plaster: "Plaster",
	vinyl: "Vinyl",
	fiberglass: "Fiberglass",
	pebble: "Pebble",
	tile: "Tile",
};

export const CHLORINE_SOURCE_LABELS: Record<ChlorineSource, string> = {
	liquid: "Liquid Chlorine (12.5%)",
	liquid_6: "Liquid Chlorine (6%)",
	cal_hypo: "Cal-Hypo (Granular)",
	dichlor: "Dichlor",
	trichlor: "Trichlor (Tablets)",
	swg: "Salt Water Generator",
};
