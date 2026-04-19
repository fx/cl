export type {
	DailySunExposure,
	HourlySunData,
	OpenMeteoHourlyResponse,
	OpenMeteoResponse,
	SolarCacheEntry,
	SunExposureResult,
} from "./sun-exposure";

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

export interface ForecastResult {
	poolId: string;
	generatedAt: string;
	startFc: number;
	startTime: string;
	confidence: "high" | "moderate" | "low";
	hourly: ForecastHour[];
	doseEvents: DoseEvent[];
	nextAction: NextAction;
	warnings: ForecastWarning[];
}

export interface ForecastHour {
	time: string;
	predictedFc: number;
	kTotal: number;
	kUv: number;
	kDemand: number;
	effectiveGhi: number;
	temperatureC: number;
	isDaytime: boolean;
}

export interface DoseEvent {
	time: string;
	fcBefore: number;
	fcAfter: number;
	ppmToAdd: number;
	productAmount: string;
	productAmountMl: number;
	cyaIncrease: number;
}

export interface NextAction {
	type: "dose" | "test" | "ok";
	priority: "info" | "warning" | "urgent";
	title: string;
	description: string;
	doseEvent?: DoseEvent;
}

export interface ForecastWarning {
	type:
		| "cya_high"
		| "cya_rising"
		| "ph_out_of_range"
		| "stale_test"
		| "lsi_imbalanced"
		| "no_cya_test";
	severity: "info" | "warning" | "urgent";
	title: string;
	description: string;
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
