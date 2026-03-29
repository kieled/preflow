/**
 * SSR Benchmark: renderToString comparison across 4 virtualizers.
 *
 * Measures server-side rendering performance — time to produce HTML string
 * for N virtualized items. This tests the full React integration path.
 */

import React, { useRef } from "react";
import { renderToString } from "react-dom/server";
import { useFlow } from "../packages/react/src/index";
import { Virtuoso } from "react-virtuoso";
import { List } from "react-window";
import { useVirtualizer } from "@tanstack/react-virtual";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bench(fn: () => void, iterations: number): { ops: number; avgUs: number } {
	for (let i = 0; i < Math.min(iterations, 50); i++) fn();
	const start = performance.now();
	for (let i = 0; i < iterations; i++) fn();
	const elapsed = performance.now() - start;
	const avgMs = elapsed / iterations;
	return { ops: Math.round(1000 / avgMs), avgUs: avgMs * 1000 };
}

function fmtOps(ops: number): string {
	if (ops >= 1_000_000) return `${(ops / 1_000_000).toFixed(1)}M`;
	if (ops >= 1_000) return `${(ops / 1_000).toFixed(1)}K`;
	return String(ops);
}

const heights = (i: number) => 30 + ((i * 7919 + 104729) % 71);

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function PreflowList({ count }: { count: number }) {
	const { containerRef, items, totalHeight } = useFlow({
		count,
		getHeight: heights,
		overscan: 5,
	});

	return (
		<div ref={containerRef} style={{ height: 600, overflow: "auto" }}>
			<div style={{ height: totalHeight, position: "relative" }}>
				{items.map((item) => (
					<div
						key={item.index}
						style={{
							position: "absolute",
							top: item.y,
							height: item.height,
							width: "100%",
						}}
					>
						Item {item.index}
					</div>
				))}
			</div>
		</div>
	);
}

function VirtuosoList({ count }: { count: number }) {
	return (
		<Virtuoso
			style={{ height: 600 }}
			totalCount={count}
			initialItemCount={Math.min(count, 30)}
			defaultItemHeight={50}
			itemContent={(index) => <div style={{ height: heights(index) }}>Item {index}</div>}
		/>
	);
}

function ReactWindowRow({ index, style }: { index: number; style: React.CSSProperties }) {
	return (
		<div style={style}>
			<div style={{ height: heights(index) }}>Item {index}</div>
		</div>
	);
}

function ReactWindowList({ count }: { count: number }) {
	return (
		<List
			rowComponent={ReactWindowRow}
			rowCount={count}
			rowHeight={50}
			defaultHeight={600}
		/>
	);
}

function TanStackList({ count }: { count: number }) {
	const parentRef = useRef<HTMLDivElement>(null);
	const virtualizer = useVirtualizer({
		count,
		getScrollElement: () => parentRef.current,
		estimateSize: heights,
		initialRect: { height: 600, width: 800 },
	});

	return (
		<div ref={parentRef} style={{ height: 600, overflow: "auto" }}>
			<div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
				{virtualizer.getVirtualItems().map((item) => (
					<div
						key={item.key}
						style={{
							position: "absolute",
							top: item.start,
							height: item.size,
							width: "100%",
						}}
					>
						Item {item.index}
					</div>
				))}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------------------------

const COUNTS = [1_000, 10_000];
const ITERS = 200;

console.log("SSR Benchmark: renderToString");
console.log("=".repeat(70));
console.log();

for (const count of COUNTS) {
	console.log(`--- ${count.toLocaleString()} items ---`);
	console.log();

	// Preflow
	const preflow = bench(() => {
		renderToString(<PreflowList count={count} />);
	}, ITERS);

	// Virtuoso
	const virtuoso = bench(() => {
		renderToString(<VirtuosoList count={count} />);
	}, ITERS);

	// react-window
	let rw: { ops: number; avgUs: number } | null = null;
	let rwHtmlLen = 0;
	try {
		const testHtml = renderToString(<ReactWindowList count={count} />);
		rwHtmlLen = testHtml.length;
		rw = bench(() => {
			renderToString(<ReactWindowList count={count} />);
		}, ITERS);
	} catch {
		console.log("  react-window    SSR not supported (crashes)");
	}

	// TanStack
	const tanstack = bench(() => {
		renderToString(<TanStackList count={count} />);
	}, ITERS);

	// HTML sizes
	const preflowHtml = renderToString(<PreflowList count={count} />);
	const virtuosoHtml = renderToString(<VirtuosoList count={count} />);
	const tanstackHtml = renderToString(<TanStackList count={count} />);

	const results: Array<{ name: string; ops: number; avgUs: number; html: number }> = [
		{ name: "Preflow", ...preflow, html: preflowHtml.length },
		{ name: "Virtuoso", ...virtuoso, html: virtuosoHtml.length },
		{ name: "TanStack", ...tanstack, html: tanstackHtml.length },
	];
	if (rw) results.push({ name: "react-window", ...rw, html: rwHtmlLen });

	results.sort((a, b) => b.ops - a.ops);

	const maxOps = results[0]!.ops;
	for (const r of results) {
		const ratio = r.ops === maxOps ? "" : ` (${(maxOps / r.ops).toFixed(1)}x slower)`;
		console.log(
			`  ${r.name.padEnd(14)} ${fmtOps(r.ops).padStart(8)} ops/s  ${(r.avgUs).toFixed(0).padStart(7)}µs  HTML: ${(r.html / 1024).toFixed(1)}KB${ratio}`,
		);
	}
	console.log();
}
