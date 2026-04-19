import { useCallback, useState } from "react";

interface Position {
	latitude: number;
	longitude: number;
}

interface UseGeolocationReturn {
	getLocation: () => void;
	loading: boolean;
	error: string | null;
	position: Position | null;
}

export function useGeolocation(): UseGeolocationReturn {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [position, setPosition] = useState<Position | null>(null);

	const getLocation = useCallback(() => {
		if (!navigator.geolocation) {
			setError("Geolocation is not supported by this browser.");
			return;
		}

		setLoading(true);
		setError(null);

		navigator.geolocation.getCurrentPosition(
			(pos) => {
				setPosition({
					latitude: pos.coords.latitude,
					longitude: pos.coords.longitude,
				});
				setLoading(false);
			},
			(err) => {
				switch (err.code) {
					case err.PERMISSION_DENIED:
						setError(
							"Location access denied. Place your pool on the map or enter coordinates manually.",
						);
						break;
					case err.POSITION_UNAVAILABLE:
						setError("Location information is unavailable.");
						break;
					case err.TIMEOUT:
						setError("Location request timed out.");
						break;
				}
				setLoading(false);
			},
		);
	}, []);

	return { getLocation, loading, error, position };
}
