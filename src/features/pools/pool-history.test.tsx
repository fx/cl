import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PoolHistory } from "./pool-history";

describe("PoolHistory", () => {
	it("renders placeholder text", () => {
		render(<PoolHistory />);
		expect(screen.getByText("Test History")).toBeInTheDocument();
	});
});
