import React, { useRef, useEffect, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { useFlow } from "../../packages/react/src/index";
import { Virtuoso } from "react-virtuoso";
import { List } from "react-window";
import { useVirtualizer } from "@tanstack/react-virtual";

const COUNT = 100_000;
const heights = (i: number) => 30 + ((i * 7919 + 104729) % 71);

// ---------------------------------------------------------------------------
// Preflow
// ---------------------------------------------------------------------------
function PreflowList() {
	const { containerRef, items, totalHeight } = useFlow({
		count: COUNT,
		getHeight: heights,
		overscan: 5,
	});
	return (
		<div ref={containerRef} id="scroll-container" style={{ height: "100vh", overflow: "auto" }}>
			<div style={{ height: totalHeight, position: "relative" }}>
				{items.map((item) => (
					<div key={item.index} style={{ position: "absolute", top: item.y, height: item.height, width: "100%", padding: "0 12px", display: "flex", alignItems: "center", background: `hsl(${(item.index * 137) % 360}, 60%, 80%)`, color: "#333" }}>
						Item {item.index} — {item.height}px
					</div>
				))}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// TanStack
// ---------------------------------------------------------------------------
function TanStackList() {
	const parentRef = useRef<HTMLDivElement>(null);
	const virtualizer = useVirtualizer({
		count: COUNT,
		getScrollElement: () => parentRef.current,
		estimateSize: heights,
		overscan: 5,
	});
	return (
		<div ref={parentRef} id="scroll-container" style={{ height: "100vh", overflow: "auto" }}>
			<div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
				{virtualizer.getVirtualItems().map((item) => (
					<div key={item.key} style={{ position: "absolute", top: item.start, height: item.size, width: "100%", padding: "0 12px", display: "flex", alignItems: "center", background: `hsl(${(item.index * 137) % 360}, 60%, 80%)`, color: "#333" }}>
						Item {item.index} — {item.size}px
					</div>
				))}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Virtuoso
// ---------------------------------------------------------------------------
function VirtuosoList() {
	return (
		<div id="scroll-container" style={{ height: "100vh" }}>
			<Virtuoso
				totalCount={COUNT}
				defaultItemHeight={50}
				overscan={200}
				style={{ height: "100%" }}
				itemContent={(index) => (
					<div style={{ height: heights(index), padding: "0 12px", display: "flex", alignItems: "center", background: `hsl(${(index * 137) % 360}, 60%, 80%)`, color: "#333" }}>
						Item {index} — {heights(index)}px
					</div>
				)}
			/>
		</div>
	);
}

// ---------------------------------------------------------------------------
// react-window
// ---------------------------------------------------------------------------
function RWRow({ index, style }: { index: number; style: React.CSSProperties }) {
	return (
		<div style={{ ...style, padding: "0 12px", display: "flex", alignItems: "center", background: `hsl(${(index * 137) % 360}, 60%, 80%)`, color: "#333" }}>
			Item {index} — {heights(index)}px
		</div>
	);
}

function ReactWindowList() {
	return (
		<div id="scroll-container" style={{ height: "100vh" }}>
			<List
				rowComponent={RWRow}
				rowCount={COUNT}
				rowHeight={(i) => heights(i)}
				defaultHeight={window.innerHeight}
				style={{ height: "100%" }}
			/>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const libs: Record<string, React.FC> = {
	preflow: PreflowList,
	tanstack: TanStackList,
	virtuoso: VirtuosoList,
	"react-window": ReactWindowList,
};

function App() {
	const lib = new URLSearchParams(location.search).get("lib") || "preflow";
	const Component = libs[lib] || PreflowList;
	return <Component />;
}

createRoot(document.getElementById("root")!).render(<App />);
