import { create } from "zustand";
import type { OpenMeteoResponse, SolarCacheEntry } from "../types";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface SolarCacheState {
	cache: Record<string, SolarCacheEntry>;
}

export interface SolarCacheActions {
	getCachedData: (lat: number, lng: number) => OpenMeteoResponse | null;
	setCachedData: (
		lat: number,
		lng: number,
		data: OpenMeteoResponse,
	) => void;
	clearCache: () => void;
}

export function buildCacheKey(lat: number, lng: number): string {
	return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

export function isCacheValid(entry: SolarCacheEntry, now: number): boolean {
	return now - entry.fetchedAt < CACHE_TTL_MS;
}

export const useSolarCacheStore = create<
	SolarCacheState & SolarCacheActions
>()((set, get) => ({
	cache: {},

	getCachedData: (lat: number, lng: number): OpenMeteoResponse | null => {
		const key = buildCacheKey(lat, lng);
		const entry = get().cache[key];
		if (!entry) return null;
		if (!isCacheValid(entry, Date.now())) return null;
		return entry.data;
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
