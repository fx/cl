import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PoolList } from "./pool-list";

describe("PoolList", () => {
	it("renders placeholder text", () => {
		render(<PoolList />);
		expect(screen.getByText("Pool List")).toBeInTheDocument();
	});
});
