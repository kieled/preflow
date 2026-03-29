import React, { useRef, useState, useCallback, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { useFlow, useGrid } from "../../packages/react/src/index";
import { Virtuoso, VirtuosoGrid } from "react-virtuoso";
import { useVirtualizer } from "@tanstack/react-virtual";

const COUNT = 100_000;
const heights = (i: number) => 30 + ((i * 7919 + 104729) % 71);
const MIN_COL = 200;
const GAP = 8;

function computeGrid(w: number) {
	const cols = Math.max(1, Math.floor((w + GAP) / (MIN_COL + GAP)));
	const colW = (w - GAP * (cols - 1)) / cols;
	return { cols, colW };
}

// ---------------------------------------------------------------------------
// Preflow List
// ---------------------------------------------------------------------------
function PreflowList() {
	const { containerRef, items, totalHeight } = useFlow({ count: COUNT, getHeight: heights, overscan: 5 });
	return (
		<div ref={containerRef} id="scroll-container" style={{ height: "100vh", overflow: "auto" }}>
			<div style={{ height: totalHeight, position: "relative" }}>
				{items.map((item) => (
					<div key={item.index} style={{ position: "absolute", top: item.y, height: item.height, width: "100%", padding: "0 8px", display: "flex", alignItems: "center", background: `hsl(${(item.index * 137) % 360}, 60%, 80%)`, color: "#333", fontSize: 13 }}>
						Item {item.index}
					</div>
				))}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Preflow Grid
// ---------------------------------------------------------------------------
function PreflowGrid() {
	const [w, setW] = useState(800);
	const scrollRef = useRef<HTMLElement | null>(null);
	const { cols, colW } = computeGrid(w);
	const { containerRef, items, totalHeight } = useGrid({ count: COUNT, columns: cols, columnWidth: colW, gap: GAP, getHeight: heights, overscan: 3 });
	const ref = useCallback((el: HTMLElement | null) => { scrollRef.current = el; if (el) setW(el.clientWidth); containerRef(el); }, [containerRef]);
	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		const ro = new ResizeObserver((e) => { setW(e[0]!.contentRect.width); });
		ro.observe(el);
		return () => ro.disconnect();
	}, []);
	return (
		<div ref={ref} id="scroll-container" style={{ height: "100vh", overflow: "auto" }}>
			<div style={{ height: totalHeight, position: "relative" }}>
				{items.map((item) => (
					<div key={item.index} style={{ position: "absolute", top: item.y, left: item.x, width: item.width, height: item.height, padding: 4, boxSizing: "border-box" }}>
						<div style={{ background: `hsl(${(item.index * 137) % 360}, 60%, 80%)`, color: "#333", height: "100%", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
							{item.index}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// TanStack List
// ---------------------------------------------------------------------------
function TanStackList() {
	const parentRef = useRef<HTMLDivElement>(null);
	const v = useVirtualizer({ count: COUNT, getScrollElement: () => parentRef.current, estimateSize: heights, overscan: 5 });
	return (
		<div ref={parentRef} id="scroll-container" style={{ height: "100vh", overflow: "auto" }}>
			<div style={{ height: v.getTotalSize(), position: "relative" }}>
				{v.getVirtualItems().map((item) => (
					<div key={item.key} style={{ position: "absolute", top: item.start, height: item.size, width: "100%", padding: "0 8px", display: "flex", alignItems: "center", background: `hsl(${(item.index * 137) % 360}, 60%, 80%)`, color: "#333", fontSize: 13 }}>
						Item {item.index}
					</div>
				))}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// TanStack Grid (lanes)
// ---------------------------------------------------------------------------
function TanStackGrid() {
	const parentRef = useRef<HTMLDivElement>(null);
	const [cols, setCols] = useState(4);
	useEffect(() => {
		const el = parentRef.current;
		if (!el) return;
		const ro = new ResizeObserver((e) => {
			const w = e[0]!.contentRect.width;
			setCols(Math.max(1, Math.floor((w + GAP) / (MIN_COL + GAP))));
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, []);
	const colW = parentRef.current ? (parentRef.current.clientWidth - GAP * (cols - 1)) / cols : MIN_COL;
	const v = useVirtualizer({ count: COUNT, getScrollElement: () => parentRef.current, estimateSize: heights, lanes: cols, gap: GAP, overscan: 5 });
	return (
		<div ref={parentRef} id="scroll-container" style={{ height: "100vh", overflow: "auto" }}>
			<div style={{ height: v.getTotalSize(), position: "relative" }}>
				{v.getVirtualItems().map((item) => (
					<div key={item.key} style={{ position: "absolute", top: item.start, left: item.lane * (colW + GAP), width: colW, height: item.size, padding: 4, boxSizing: "border-box" }}>
						<div style={{ background: `hsl(${(item.index * 137) % 360}, 60%, 80%)`, color: "#333", height: "100%", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
							{item.index}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Virtuoso List
// ---------------------------------------------------------------------------
function VirtuosoList() {
	return (
		<div id="scroll-container" style={{ height: "100vh" }}>
			<Virtuoso totalCount={COUNT} defaultItemHeight={50} overscan={200} style={{ height: "100%" }}
				itemContent={(index) => (
					<div style={{ height: heights(index), padding: "0 8px", display: "flex", alignItems: "center", background: `hsl(${(index * 137) % 360}, 60%, 80%)`, color: "#333", fontSize: 13 }}>
						Item {index}
					</div>
				)}
			/>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Virtuoso Grid
// ---------------------------------------------------------------------------
function VirtuosoGridView() {
	return (
		<div id="scroll-container" style={{ height: "100vh" }}>
			<style>{`.vgrid-list { display: flex; flex-wrap: wrap; gap: ${GAP}px; } .vgrid-item { flex: 0 0 ${MIN_COL}px; min-width: ${MIN_COL}px; height: 100px; }`}</style>
			<VirtuosoGrid totalCount={COUNT} listClassName="vgrid-list" itemClassName="vgrid-item" style={{ height: "100%" }}
				itemContent={(index) => (
					<div style={{ background: `hsl(${(index * 137) % 360}, 60%, 80%)`, color: "#333", height: "100%", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
						{index}
					</div>
				)}
			/>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const libs: Record<string, React.FC> = {
	preflow: PreflowList,
	"preflow-grid": PreflowGrid,
	tanstack: TanStackList,
	"tanstack-grid": TanStackGrid,
	virtuoso: VirtuosoList,
	"virtuoso-grid": VirtuosoGridView,
};

function App() {
	const lib = new URLSearchParams(location.search).get("lib") || "preflow";
	const Component = libs[lib] || PreflowList;
	return <Component />;
}

createRoot(document.getElementById("root")!).render(<App />);
