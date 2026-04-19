import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PoolDetail } from "./pool-detail";

describe("PoolDetail", () => {
	it("renders placeholder text", () => {
		render(<PoolDetail />);
		expect(screen.getByText("Pool Detail")).toBeInTheDocument();
	});
});
