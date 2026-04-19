import { useLocation, useParams } from "wouter";
import { useAppStore } from "../../stores/app-store";
import { PoolForm } from "./pool-form";

export function PoolEdit() {
	const { id } = useParams<{ id: string }>();
	const [, navigate] = useLocation();
	const pool = useAppStore((s) => s.pools.find((p) => p.id === id));

	if (!pool) {
		navigate("/");
		return null;
	}

	return <PoolForm pool={pool} />;
}
