import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import { ATTRIBUTION, TILE_URL } from "./leaflet-setup";

interface PoolMapProps {
	latitude: number;
	longitude: number;
}

export function PoolMap({ latitude, longitude }: PoolMapProps) {
	return (
		<div
			data-testid="pool-map"
			className="h-48 w-full overflow-hidden rounded-md"
		>
			<MapContainer
				center={[latitude, longitude]}
				zoom={16}
				scrollWheelZoom={false}
				dragging={false}
				className="h-full w-full"
				zoomControl
			>
				<TileLayer url={TILE_URL} attribution={ATTRIBUTION} />
				<Marker position={[latitude, longitude]} />
			</MapContainer>
		</div>
	);
}
