import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PoolNew } from "./pool-new";

vi.mock("wouter", () => ({
	useLocation: () => ["/pools/new", vi.fn()],
	useParams: () => ({}),
}));

describe("PoolNew", () => {
	it("renders the pool form", () => {
		render(<PoolNew />);
		expect(
			screen.getByRole("heading", { name: "Add Pool" }),
		).toBeInTheDocument();
	});
});
