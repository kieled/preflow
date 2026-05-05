import { useState } from "react";
import { ChatExample } from "./examples/ChatExample";
import { ComponentsExample } from "./examples/ComponentsExample";
import { CoreDirectExample } from "./examples/CoreDirectExample";
import { FeedExample } from "./examples/FeedExample";
import { FlowExample } from "./examples/FlowExample";
import { GridExample } from "./examples/GridExample";
import { InfiniteScrollExample } from "./examples/InfiniteScrollExample";
import { MasonryExample } from "./examples/MasonryExample";
import { PerformanceExample } from "./examples/PerformanceExample";
import { ProseExample } from "./examples/ProseExample";
import "./App.css";

const examples = [
	{
		id: "flow",
		name: "Flow (1D List)",
		section: "React Hooks",
		component: FlowExample,
	},
	{
		id: "grid",
		name: "Grid",
		section: "React Hooks",
		component: GridExample,
	},
	{
		id: "masonry",
		name: "Masonry",
		section: "React Hooks",
		component: MasonryExample,
	},
	{
		id: "chat",
		name: "Chat",
		section: "React Hooks",
		component: ChatExample,
	},
	{
		id: "feed",
		name: "Social Feed",
		section: "Infinite Scroll",
		component: FeedExample,
	},
	{
		id: "infinite",
		name: "Bidirectional Feed",
		section: "Infinite Scroll",
		component: InfiniteScrollExample,
	},
	{
		id: "prose",
		name: "Prose",
		section: "Prose Package",
		component: ProseExample,
	},
	{
		id: "core",
		name: "Core Direct API",
		section: "Core Package",
		component: CoreDirectExample,
	},
	{
		id: "components",
		name: "Components",
		section: "React Components",
		component: ComponentsExample,
	},
	{
		id: "performance",
		name: "Stress Test (100k)",
		section: "Performance",
		component: PerformanceExample,
	},
] as const;

export function App() {
	const [active, setActive] = useState("flow");
	const current = examples.find((e) => e.id === active);

	let lastSection = "";

	return (
		<>
			<nav className="sidebar">
				<h1>Preflow</h1>
				{examples.map((ex) => {
					const showSection = ex.section !== lastSection;
					lastSection = ex.section;
					return (
						<div key={ex.id}>
							{showSection && <div className="section-title">{ex.section}</div>}
							<button
								type="button"
								className={active === ex.id ? "active" : ""}
								onClick={() => {
									setActive(ex.id);
								}}
							>
								{ex.name}
							</button>
						</div>
					);
				})}
			</nav>
			<main className="main-content">{current && <current.component />}</main>
		</>
	);
}
