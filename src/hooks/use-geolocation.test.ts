import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGeolocation } from "./use-geolocation";

describe("useGeolocation", () => {
	const mockGetCurrentPosition = vi.fn();

	beforeEach(() => {
		vi.restoreAllMocks();
		Object.defineProperty(window, "isSecureContext", {
			value: true,
			writable: true,
			configurable: true,
		});
		Object.defineProperty(navigator, "geolocation", {
			value: { getCurrentPosition: mockGetCurrentPosition },
			writable: true,
			configurable: true,
		});
	});

	it("returns initial state", () => {
		const { result } = renderHook(() => useGeolocation());
		expect(result.current.loading).toBe(false);
		expect(result.current.error).toBeNull();
		expect(result.current.position).toBeNull();
		expect(typeof result.current.getLocation).toBe("function");
	});

	it("sets position on geolocation success", () => {
		mockGetCurrentPosition.mockImplementation((success) => {
			success({ coords: { latitude: 33.4484, longitude: -112.074 } });
		});

		const { result } = renderHook(() => useGeolocation());
		act(() => {
			result.current.getLocation();
		});

		expect(result.current.position).toEqual({
			latitude: 33.4484,
			longitude: -112.074,
		});
		expect(result.current.loading).toBe(false);
		expect(result.current.error).toBeNull();
	});

	it("sets error on permission denied", () => {
		mockGetCurrentPosition.mockImplementation((_success, error) => {
			error({ code: 1, PERMISSION_DENIED: 1 });
		});

		const { result } = renderHook(() => useGeolocation());
		act(() => {
			result.current.getLocation();
		});

		expect(result.current.error).toBe(
			"Location access denied. Place your pool on the map or enter coordinates manually.",
		);
		expect(result.current.loading).toBe(false);
		expect(result.current.position).toBeNull();
	});

	it("sets error on position unavailable", () => {
		mockGetCurrentPosition.mockImplementation((_success, error) => {
			error({ code: 2, POSITION_UNAVAILABLE: 2 });
		});

		const { result } = renderHook(() => useGeolocation());
		act(() => {
			result.current.getLocation();
		});

		expect(result.current.error).toBe("Location information is unavailable.");
		expect(result.current.loading).toBe(false);
	});

	it("sets error on timeout", () => {
		mockGetCurrentPosition.mockImplementation((_success, error) => {
			error({ code: 3, TIMEOUT: 3 });
		});

		const { result } = renderHook(() => useGeolocation());
		act(() => {
			result.current.getLocation();
		});

		expect(result.current.error).toBe("Location request timed out.");
		expect(result.current.loading).toBe(false);
	});

	it("sets error on unknown error code", () => {
		mockGetCurrentPosition.mockImplementation((_success, error) => {
			error({ code: 99 });
		});

		const { result } = renderHook(() => useGeolocation());
		act(() => {
			result.current.getLocation();
		});

		expect(result.current.error).toBe("An unknown location error occurred.");
		expect(result.current.loading).toBe(false);
	});

	it("sets error when context is not secure", () => {
		Object.defineProperty(window, "isSecureContext", {
			value: false,
			writable: true,
			configurable: true,
		});

		mockGetCurrentPosition.mockClear();
		const { result } = renderHook(() => useGeolocation());
		act(() => {
			result.current.getLocation();
		});

		expect(result.current.error).toBe(
			"Geolocation requires a secure context (HTTPS).",
		);
		expect(result.current.loading).toBe(false);
		expect(mockGetCurrentPosition).not.toHaveBeenCalled();
	});

	it("sets error when geolocation is not supported", () => {
		Object.defineProperty(navigator, "geolocation", {
			value: undefined,
			writable: true,
			configurable: true,
		});

		const { result } = renderHook(() => useGeolocation());
		act(() => {
			result.current.getLocation();
		});

		expect(result.current.error).toBe(
			"Geolocation is not supported by this browser.",
		);
		expect(result.current.loading).toBe(false);
	});

	it("sets loading to true while geolocation is pending", () => {
		let resolvePosition!: (pos: {
			coords: { latitude: number; longitude: number };
		}) => void;
		mockGetCurrentPosition.mockImplementation((success) => {
			resolvePosition = success;
		});

		const { result } = renderHook(() => useGeolocation());
		act(() => {
			result.current.getLocation();
		});

		expect(result.current.loading).toBe(true);

		act(() => {
			resolvePosition({ coords: { latitude: 40, longitude: -100 } });
		});

		expect(result.current.loading).toBe(false);
	});

	it("clears previous error on new getLocation call", () => {
		mockGetCurrentPosition.mockImplementationOnce((_success, error) => {
			error({ code: 1, PERMISSION_DENIED: 1 });
		});

		const { result } = renderHook(() => useGeolocation());
		act(() => {
			result.current.getLocation();
		});
		expect(result.current.error).not.toBeNull();

		mockGetCurrentPosition.mockImplementationOnce((success) => {
			success({ coords: { latitude: 33, longitude: -112 } });
		});

		act(() => {
			result.current.getLocation();
		});
		expect(result.current.error).toBeNull();
		expect(result.current.position).toEqual({
			latitude: 33,
			longitude: -112,
		});
	});
});
