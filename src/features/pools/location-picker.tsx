import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import {
	ATTRIBUTION,
	DEFAULT_CENTER,
	DEFAULT_ZOOM,
	TILE_URL,
} from "./leaflet-setup";

interface LocationPickerProps {
	latitude: number | null;
	longitude: number | null;
	onLocationChange: (lat: number, lng: number) => void;
}

function MapClickHandler({
	onLocationChange,
}: { onLocationChange: (lat: number, lng: number) => void }) {
	useMapEvents({
		click(e) {
			onLocationChange(e.latlng.lat, e.latlng.lng);
		},
	});
	return null;
}

function MapUpdater({
	latitude,
	longitude,
}: { latitude: number | null; longitude: number | null }) {
	const map = useMap();
	useEffect(() => {
		if (latitude != null && longitude != null) {
			map.flyTo([latitude, longitude], Math.max(map.getZoom(), 13));
		}
	}, [latitude, longitude, map]);
	return null;
}

function DraggableMarker({
	position,
	onLocationChange,
}: {
	position: [number, number];
	onLocationChange: (lat: number, lng: number) => void;
}) {
	const eventHandlers = useMemo(
		() => ({
			dragend(e: { target: { getLatLng: () => { lat: number; lng: number } } }) {
				const latlng = e.target.getLatLng();
				onLocationChange(latlng.lat, latlng.lng);
			},
		}),
		[onLocationChange],
	);
	return (
		<Marker position={position} draggable eventHandlers={eventHandlers} />
	);
}

export function LocationPicker({
	latitude,
	longitude,
	onLocationChange,
}: LocationPickerProps) {
	const hasLocation = latitude != null && longitude != null;
	const center: [number, number] = hasLocation
		? [latitude, longitude]
		: DEFAULT_CENTER;
	const zoom = hasLocation ? 13 : DEFAULT_ZOOM;

	return (
		<div
			data-testid="location-picker"
			className="h-64 w-full overflow-hidden rounded-md border"
		>
			<MapContainer
				center={center}
				zoom={zoom}
				className="h-full w-full"
				scrollWheelZoom
			>
				<TileLayer url={TILE_URL} attribution={ATTRIBUTION} />
				<MapClickHandler onLocationChange={onLocationChange} />
				<MapUpdater latitude={latitude} longitude={longitude} />
				{hasLocation && (
					<DraggableMarker
						position={[latitude, longitude]}
						onLocationChange={onLocationChange}
					/>
				)}
			</MapContainer>
		</div>
	);
}
