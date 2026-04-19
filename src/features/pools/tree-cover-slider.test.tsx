import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TreeCoverSlider } from "./tree-cover-slider";

describe("TreeCoverSlider", () => {
	it("renders with current value", () => {
		render(<TreeCoverSlider value={50} onChange={vi.fn()} />);
		expect(screen.getByText("Tree Cover: 50%")).toBeInTheDocument();
	});

	it("renders all preset buttons", () => {
		render(<TreeCoverSlider value={0} onChange={vi.fn()} />);
		expect(screen.getByText("0% — Full sun")).toBeInTheDocument();
		expect(screen.getByText("25% — Sparse shade")).toBeInTheDocument();
		expect(screen.getByText("50% — Partial shade")).toBeInTheDocument();
		expect(screen.getByText("75% — Mostly shaded")).toBeInTheDocument();
		expect(screen.getByText("90% — Dense canopy")).toBeInTheDocument();
	});

	it("calls onChange when slider changes", () => {
		const onChange = vi.fn();
		render(<TreeCoverSlider value={0} onChange={onChange} />);
		fireEvent.change(screen.getByRole("slider"), { target: { value: "60" } });
		expect(onChange).toHaveBeenCalledWith(60);
	});

	it("calls onChange when preset button is clicked", () => {
		const onChange = vi.fn();
		render(<TreeCoverSlider value={0} onChange={onChange} />);
		fireEvent.click(screen.getByText("75% — Mostly shaded"));
		expect(onChange).toHaveBeenCalledWith(75);
	});

	it("renders the range input element", () => {
		render(<TreeCoverSlider value={25} onChange={vi.fn()} />);
		const slider = screen.getByRole("slider");
		expect(slider).toBeInTheDocument();
		expect(slider).toHaveAttribute("min", "0");
		expect(slider).toHaveAttribute("max", "100");
	});
});
