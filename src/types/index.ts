export type PoolId = string;

export interface Pool {
	id: PoolId;
	name: string;
	volumeGallons: number;
	latitude: number;
	longitude: number;
	createdAt: string;
}

export interface WaterTest {
	id: string;
	poolId: PoolId;
	timestamp: string;
	freeChlorine: number;
	totalChlorine: number;
	ph: number;
	alkalinity: number;
	cyanuricAcid: number;
}

export interface UserPreferences {
	units: "imperial" | "metric";
}
