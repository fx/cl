import { create } from "zustand";
import type { OpenMeteoResponse, SolarCacheEntry } from "../types";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface SolarCacheState {
	cache: Record<string, SolarCacheEntry>;
}

export interface SolarCacheActions {
	getCachedData: (lat: number, lng: number) => OpenMeteoResponse | null;
	getCacheEntry: (lat: number, lng: number) => SolarCacheEntry | null;
	setCachedData: (
		lat: number,
		lng: number,
		data: OpenMeteoResponse,
	) => void;
	clearCache: () => void;
}

function formatCoord(value: number): string {
	const rounded = Number(value.toFixed(2));
	return (Object.is(rounded, -0) ? 0 : rounded).toFixed(2);
}

export function buildCacheKey(lat: number, lng: number): string {
	return `${formatCoord(lat)},${formatCoord(lng)}`;
}

export function isCacheValid(entry: SolarCacheEntry, now: number): boolean {
	return now - entry.fetchedAt < CACHE_TTL_MS;
}

export const useSolarCacheStore = create<
	SolarCacheState & SolarCacheActions
>()((set, get) => ({
	cache: {},

	getCachedData: (lat: number, lng: number): OpenMeteoResponse | null => {
		const entry = get().getCacheEntry(lat, lng);
		return entry?.data ?? null;
	},

	getCacheEntry: (lat: number, lng: number): SolarCacheEntry | null => {
		const key = buildCacheKey(lat, lng);
		const entry = get().cache[key];
		if (!entry) return null;
		if (!isCacheValid(entry, Date.now())) {
			set((state) => {
				const { [key]: _, ...rest } = state.cache;
				return { cache: rest };
			});
			return null;
		}
		return entry;
	},

	setCachedData: (
		lat: number,
		lng: number,
		data: OpenMeteoResponse,
	): void => {
		const key = buildCacheKey(lat, lng);
		set((state) => ({
			cache: {
				...state.cache,
				[key]: { data, fetchedAt: Date.now() },
			},
		}));
	},

	clearCache: (): void => {
		set({ cache: {} });
	},
}));
