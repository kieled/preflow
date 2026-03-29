import { useFlow, useGrid } from "@preflow/react";
import { Virtuoso, VirtuosoGrid } from "react-virtuoso";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useState, useCallback, useRef, useEffect } from "react";

const COUNTS = { "10K": 10_000, "50K": 50_000, "100K": 100_000 } as const;
type CountKey = keyof typeof COUNTS;

const heights = (i: number) => 30 + ((i * 7919 + 104729) % 71);
const MIN_COL = 200;
const GAP = 8;

function seededColor(i: number) {
	return `hsl(${(i * 137) % 360}, 60%, 82%)`;
}

function computeGrid(w: number) {
	const cols = Math.max(1, Math.floor((w + GAP) / (MIN_COL + GAP)));
	const colW = (w - GAP * (cols - 1)) / cols;
	return { cols, colW };
}

// ---------------------------------------------------------------------------
// FPS counter
// ---------------------------------------------------------------------------
function useFps() {
	const [fps, setFps] = useState(0);
	const framesRef = useRef(0);
	const lastRef = useRef(performance.now());
	useEffect(() => {
		let id: number;
		const tick = () => {
			framesRef.current++;
			const now = performance.now();
			if (now - lastRef.current >= 1000) {
				setFps(framesRef.current);
				framesRef.current = 0;
				lastRef.current = now;
			}
			id = requestAnimationFrame(tick);
		};
		id = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(id);
	}, []);
	return fps;
}

// ---------------------------------------------------------------------------
// Preflow List
// ---------------------------------------------------------------------------
function PreflowListView({ count }: { count: number }) {
	const getHeight = useCallback((i: number) => heights(i), []);
	const { containerRef, items, totalHeight } = useFlow({ count, getHeight, overscan: 5 });
	return (
		<div className="example-viewport" ref={containerRef}>
			<div style={{ height: totalHeight, position: "relative" }}>
				{items.map((item) => (
					<div key={item.index} className="flow-item" style={{ position: "absolute", top: item.y, left: 0, right: 0, height: item.height, backgroundColor: seededColor(item.index) }}>
						<span className="item-index">#{item.index}</span>
						<span className="item-info">{item.height}px</span>
					</div>
				))}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Preflow Grid
// ---------------------------------------------------------------------------
function PreflowGridView({ count }: { count: number }) {
	const scrollRef = useRef<HTMLElement | null>(null);
	const [cols, setCols] = useState(4);
	const colW = scrollRef.current ? (scrollRef.current.clientWidth - GAP * (cols - 1)) / cols : MIN_COL;
	const getHeight = useCallback((i: number) => heights(i), []);
	const { containerRef, items, totalHeight } = useGrid({ count, columns: cols, columnWidth: colW, gap: GAP, getHeight, overscan: 3 });
	const ref = useCallback((el: HTMLElement | null) => {
		scrollRef.current = el;
		if (el) setCols(computeGrid(el.clientWidth).cols);
		containerRef(el);
	}, [containerRef]);
	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		const ro = new ResizeObserver((e) => {
			const newCols = computeGrid(e[0]!.contentRect.width).cols;
			setCols((prev) => prev !== newCols ? newCols : prev);
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, []);
	return (
		<div className="example-viewport" ref={ref}>
			<div style={{ height: totalHeight, position: "relative" }}>
				{items.map((item) => (
					<div key={item.index} className="grid-item" style={{ position: "absolute", top: item.y, left: item.x, width: item.width, height: item.height, backgroundColor: seededColor(item.index) }}>
						<div style={{ textAlign: "center" }}>
							<div style={{ fontWeight: 600 }}>#{item.index}</div>
							<div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>{Math.round(item.width)}x{item.height}</div>
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
function TanStackListView({ count }: { count: number }) {
	const parentRef = useRef<HTMLDivElement>(null);
	const v = useVirtualizer({ count, getScrollElement: () => parentRef.current, estimateSize: heights, overscan: 5 });
	return (
		<div className="example-viewport" ref={parentRef}>
			<div style={{ height: v.getTotalSize(), position: "relative" }}>
				{v.getVirtualItems().map((item) => (
					<div key={item.key} className="flow-item" style={{ position: "absolute", top: item.start, height: item.size, left: 0, right: 0, backgroundColor: seededColor(item.index) }}>
						<span className="item-index">#{item.index}</span>
						<span className="item-info">{item.size}px</span>
					</div>
				))}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// TanStack Grid (lanes)
// ---------------------------------------------------------------------------
function TanStackGridView({ count }: { count: number }) {
	const parentRef = useRef<HTMLDivElement>(null);
	const [cols, setCols] = useState(4);
	useEffect(() => {
		const el = parentRef.current;
		if (!el) return;
		const ro = new ResizeObserver((e) => setCols(Math.max(1, Math.floor((e[0]!.contentRect.width + GAP) / (MIN_COL + GAP)))));
		ro.observe(el);
		return () => ro.disconnect();
	}, []);
	const colW = parentRef.current ? (parentRef.current.clientWidth - GAP * (cols - 1)) / cols : MIN_COL;
	const v = useVirtualizer({ count, getScrollElement: () => parentRef.current, estimateSize: heights, lanes: cols, gap: GAP, overscan: 5 });
	return (
		<div className="example-viewport" ref={parentRef}>
			<div style={{ height: v.getTotalSize(), position: "relative" }}>
				{v.getVirtualItems().map((item) => (
					<div key={item.key} className="grid-item" style={{ position: "absolute", top: item.start, left: item.lane * (colW + GAP), width: colW, height: item.size, backgroundColor: seededColor(item.index) }}>
						<div style={{ textAlign: "center" }}>
							<div style={{ fontWeight: 600 }}>#{item.index}</div>
							<div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>{Math.round(colW)}x{item.size}</div>
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
function VirtuosoListView({ count }: { count: number }) {
	return (
		<div className="example-viewport">
			<Virtuoso totalCount={count} defaultItemHeight={50} overscan={200} style={{ height: "100%" }}
				itemContent={(index) => (
					<div className="flow-item" style={{ height: heights(index), backgroundColor: seededColor(index) }}>
						<span className="item-index">#{index}</span>
						<span className="item-info">{heights(index)}px</span>
					</div>
				)}
			/>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Virtuoso Grid
// ---------------------------------------------------------------------------
function VirtuosoGridView({ count }: { count: number }) {
	return (
		<div className="example-viewport">
			<style>{`.vg-list { display: flex; flex-wrap: wrap; gap: ${GAP}px; } .vg-item { flex: 0 0 ${MIN_COL}px; min-width: ${MIN_COL}px; height: 100px; }`}</style>
			<VirtuosoGrid totalCount={count} listClassName="vg-list" itemClassName="vg-item" style={{ height: "100%" }}
				itemContent={(index) => (
					<div className="grid-item" style={{ backgroundColor: seededColor(index), height: "100%", borderRadius: 4 }}>
						<div style={{ textAlign: "center" }}>
							<div style={{ fontWeight: 600 }}>#{index}</div>
						</div>
					</div>
				)}
			/>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
type Lib = "preflow" | "tanstack" | "virtuoso";
type Mode = "list" | "grid";

const views: Record<`${Lib}-${Mode}`, React.FC<{ count: number }>> = {
	"preflow-list": PreflowListView,
	"preflow-grid": PreflowGridView,
	"tanstack-list": TanStackListView,
	"tanstack-grid": TanStackGridView,
	"virtuoso-list": VirtuosoListView,
	"virtuoso-grid": VirtuosoGridView,
};

export function PerformanceExample() {
	const [lib, setLib] = useState<Lib>("preflow");
	const [mode, setMode] = useState<Mode>("list");
	const [countKey, setCountKey] = useState<CountKey>("100K");
	const fps = useFps();

	const count = COUNTS[countKey];
	const View = views[`${lib}-${mode}`];

	return (
		<div className="example-layout">
			<div className="example-controls">
				<h3>Stress Test</h3>
				<p>
					Compare scroll and grid performance across libraries.
					Switch between Preflow, TanStack Virtual, and Virtuoso
					in list or auto-column grid mode.
				</p>
				<div style={{ marginTop: 8 }}>
					<div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>Library</div>
					<div className="tab-bar">
						<button className={lib === "preflow" ? "active" : ""} onClick={() => setLib("preflow")}>Preflow</button>
						<button className={lib === "tanstack" ? "active" : ""} onClick={() => setLib("tanstack")}>TanStack</button>
						<button className={lib === "virtuoso" ? "active" : ""} onClick={() => setLib("virtuoso")}>Virtuoso</button>
					</div>
				</div>
				<div style={{ marginTop: 8 }}>
					<div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>Mode</div>
					<div className="tab-bar">
						<button className={mode === "list" ? "active" : ""} onClick={() => setMode("list")}>List</button>
						<button className={mode === "grid" ? "active" : ""} onClick={() => setMode("grid")}>Grid</button>
					</div>
				</div>
				<div style={{ marginTop: 8 }}>
					<div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>Items</div>
					<div className="tab-bar">
						{(Object.keys(COUNTS) as CountKey[]).map((k) => (
							<button key={k} className={countKey === k ? "active" : ""} onClick={() => setCountKey(k)}>{k}</button>
						))}
					</div>
				</div>
				<div className="example-stats" style={{ marginTop: 12 }}>
					<div>
						<span>Library</span>
						<span>{lib}</span>
					</div>
					<div>
						<span>Mode</span>
						<span>{mode}</span>
					</div>
					<div>
						<span>Items</span>
						<span>{count.toLocaleString()}</span>
					</div>
				</div>
			</div>
			<View count={count} key={`${lib}-${mode}-${countKey}`} />
			<div className="fps-counter">
				FPS: {fps}
			</div>
		</div>
	);
}
