import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PoolNew } from "./pool-new";

describe("PoolNew", () => {
	it("renders placeholder text", () => {
		render(<PoolNew />);
		expect(screen.getByText("New Pool")).toBeInTheDocument();
	});
});
