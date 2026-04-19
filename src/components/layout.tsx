import type { ReactNode } from "react";

export function Layout({ children }: { children: ReactNode }) {
	return (
		<div className="min-h-screen bg-background text-foreground">
			<header className="border-b border-border px-4 py-3">
				<h1 className="text-lg font-bold">cl</h1>
			</header>
			<main className="p-4">{children}</main>
		</div>
	);
}
