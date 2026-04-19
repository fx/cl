import { Card, CardContent } from "@fx/ui";
import { Route, Switch } from "wouter";
import { Layout } from "./components/layout";
import { PoolDetail } from "./features/pools/pool-detail";
import { PoolEdit } from "./features/pools/pool-edit";
import { PoolHistory } from "./features/pools/pool-history";
import { PoolList } from "./features/pools/pool-list";
import { PoolNew } from "./features/pools/pool-new";
import { PoolTest } from "./features/pools/pool-test";

export function App() {
	return (
		<Layout>
			<Switch>
				<Route path="/" component={PoolList} />
				<Route path="/pools/new" component={PoolNew} />
				<Route path="/pools/:id/edit" component={PoolEdit} />
				<Route path="/pools/:id" component={PoolDetail} />
				<Route path="/pools/:id/test" component={PoolTest} />
				<Route path="/pools/:id/history" component={PoolHistory} />
				<Route>
					<Card className="mx-auto mt-12 max-w-md text-center">
						<CardContent className="py-10">
							<h2 className="text-2xl font-semibold">404</h2>
							<p className="mt-2 text-muted-foreground">Page not found</p>
						</CardContent>
					</Card>
				</Route>
			</Switch>
		</Layout>
	);
}
