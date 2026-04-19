import { fireEvent, render, screen } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "../../stores/app-store";
import type { Pool } from "../../types";
import { TestForm } from "./test-form";

const mockNavigate = vi.fn();

vi.mock("wouter", () => ({
	useParams: () => ({ id: "pool-1" }),
	useLocation: () => ["/pools/pool-1/test", mockNavigate],
	Link: ({
		children,
		href,
		...props
	}: {
		children: React.ReactNode;
		href: string;
		className?: string;
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

const testPool: Pool = {
	id: "pool-1",
	name: "Test Pool",
	volumeGallons: 15000,
	latitude: 33,
	longitude: -112,
	surfaceType: "plaster",
	chlorineSource: "liquid",
	treeCoverPercent: 0,
	isIndoor: false,
	targetFc: null,
	targetPh: 7.4,
	notes: "",
	createdAt: "2026-01-01T00:00:00Z",
	updatedAt: "2026-01-01T00:00:00Z",
};

describe("TestForm", () => {
	beforeEach(() => {
		mockNavigate.mockClear();
		act(() => {
			useAppStore.getState().reset();
			useAppStore.getState().addPool(testPool);
		});
	});

	it("renders form with pool name", () => {
		render(<TestForm />);
		expect(screen.getByText(/Log Water Test/)).toBeInTheDocument();
		expect(screen.getByText(/Test Pool/)).toBeInTheDocument();
	});

	it("renders all primary parameter inputs", () => {
		render(<TestForm />);
		expect(screen.getByLabelText(/Free Chlorine/)).toBeInTheDocument();
		expect(screen.getByLabelText(/Combined Chlorine/)).toBeInTheDocument();
		expect(screen.getByLabelText("pH")).toBeInTheDocument();
		expect(screen.getByLabelText(/Cyanuric Acid/)).toBeInTheDocument();
		expect(screen.getByLabelText(/Total Alkalinity/)).toBeInTheDocument();
		expect(screen.getByLabelText(/Calcium Hardness/)).toBeInTheDocument();
	});

	it("shows validation error when no parameters entered", () => {
		render(<TestForm />);
		fireEvent.click(screen.getByText("Save Test"));
		expect(
			screen.getByText(/Enter at least one test parameter/),
		).toBeInTheDocument();
	});

	it("submits successfully with FC only", () => {
		render(<TestForm />);
		const fcInput = screen.getByLabelText(/Free Chlorine/);
		fireEvent.change(fcInput, { target: { value: "3.5" } });
		fireEvent.click(screen.getByText("Save Test"));

		const tests = useAppStore.getState().testResults["pool-1"];
		expect(tests).toHaveLength(1);
		expect(tests[0].fc).toBe(3.5);
		expect(tests[0].cc).toBeUndefined();
	});

	it("submits successfully with multiple parameters", () => {
		render(<TestForm />);
		fireEvent.change(screen.getByLabelText(/Free Chlorine/), {
			target: { value: "4.0" },
		});
		fireEvent.change(screen.getByLabelText("pH"), { target: { value: "7.4" } });
		fireEvent.change(screen.getByLabelText(/Cyanuric Acid/), {
			target: { value: "40" },
		});
		fireEvent.click(screen.getByText("Save Test"));

		const tests = useAppStore.getState().testResults["pool-1"];
		expect(tests).toHaveLength(1);
		expect(tests[0].fc).toBe(4.0);
		expect(tests[0].ph).toBe(7.4);
		expect(tests[0].cya).toBe(40);
	});

	it("validates FC range", () => {
		render(<TestForm />);
		fireEvent.change(screen.getByLabelText(/Free Chlorine/), {
			target: { value: "60" },
		});
		const form = screen
			.getByText("Save Test")
			.closest("form") as HTMLFormElement;
		fireEvent.submit(form);
		expect(screen.getByText(/FC must be 0-50 ppm/)).toBeInTheDocument();
	});

	it("validates pH range", () => {
		render(<TestForm />);
		fireEvent.change(screen.getByLabelText(/Free Chlorine/), {
			target: { value: "3" },
		});
		fireEvent.change(screen.getByLabelText("pH"), { target: { value: "5.0" } });
		const form = screen
			.getByText("Save Test")
			.closest("form") as HTMLFormElement;
		fireEvent.submit(form);
		expect(screen.getByText(/pH must be 6.0-9.0/)).toBeInTheDocument();
	});

	it("renders pool not found for invalid pool id", () => {
		act(() => {
			useAppStore.getState().reset();
		});
		render(<TestForm />);
		expect(screen.getByText("Pool not found")).toBeInTheDocument();
	});
});
