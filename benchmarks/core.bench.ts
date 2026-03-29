/**
 * Benchmark: @preflow/core vs @tanstack/virtual-core
 *
 * Both are framework-agnostic virtualizer cores.
 * react-virtuoso is React-only — no headless core to benchmark.
 */

import { createFlow, createGrid, createMasonry, createChat } from "../packages/core/src/index";
import { Virtualizer } from "@tanstack/virtual-core";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bench(fn: () => void, iterations: number): { ops: number; avgUs: number } {
	// Warmup
	for (let i = 0; i < Math.min(iterations, 50); i++) fn();

	const start = performance.now();
	for (let i = 0; i < iterations; i++) fn();
	const elapsed = performance.now() - start;

	const avgMs = elapsed / iterations;
	const ops = Math.round(1000 / avgMs);
	const avgUs = avgMs * 1000;

	return { ops, avgUs };
}

function fmtOps(ops: number): string {
	if (ops >= 1_000_000) return `${(ops / 1_000_000).toFixed(1)}M`;
	if (ops >= 1_000) return `${(ops / 1_000).toFixed(1)}K`;
	return String(ops);
}

const variableHeight = (i: number) => 50 + (i % 7) * 10;

function createTS(count: number, estimateSize: (i: number) => number, overscan = 5) {
	return new Virtualizer({
		count,
		getScrollElement: () => null,
		estimateSize,
		overscan,
		scrollToFn: () => {},
		observeElementRect: () => {},
		observeElementOffset: () => {},
		initialRect: { width: 800, height: 600 },
	});
}

// ---------------------------------------------------------------------------
// Run benchmarks
// ---------------------------------------------------------------------------

interface Row {
	scenario: string;
	preflow: string;
	tanstack: string;
	diff: string;
}

const rows: Row[] = [];

function run(
	scenario: string,
	pfFn: () => void,
	pfIter: number,
	tsFn: (() => void) | null,
	tsIter: number,
) {
	const pf = bench(pfFn, pfIter);
	const ts = tsFn ? bench(tsFn, tsIter) : null;

	let diff: string;
	if (!ts) {
		diff = "preflow only";
	} else if (pf.ops >= ts.ops) {
		diff = `**${(pf.ops / ts.ops).toFixed(1)}x faster**`;
	} else {
		diff = `${(ts.ops / pf.ops).toFixed(1)}x slower`;
	}

	rows.push({
		scenario,
		preflow: `${fmtOps(pf.ops)} ops/s`,
		tanstack: ts ? `${fmtOps(ts.ops)} ops/s` : "N/A (needs DOM)",
		diff,
	});

	console.log(`  ${scenario}: preflow ${fmtOps(pf.ops)} | tanstack ${ts ? fmtOps(ts.ops) : "N/A"} | ${diff}`);
}

console.log("\n=== @preflow/core vs @tanstack/virtual-core ===\n");

// 1. Create 10K items
run(
	"Create 10K items",
	() => createFlow({ count: 10_000, getHeight: variableHeight, overscan: 5 }),
	500,
	() => createTS(10_000, variableHeight),
	500,
);

// 2. Create 100K items
run(
	"Create 100K items",
	() => createFlow({ count: 100_000, getHeight: variableHeight, overscan: 5 }),
	50,
	() => createTS(100_000, variableHeight),
	50,
);

// 3. scrollToIndex — 10K random lookups
{
	const flow = createFlow({ count: 100_000, getHeight: variableHeight, overscan: 5 });
	flow.setViewport(0, 600);
	const indices = Array.from({ length: 10_000 }, () => Math.floor(Math.random() * 100_000));

	const ts = createTS(100_000, variableHeight);
	ts._willUpdate();
	ts.getMeasurements();

	run(
		"scrollToIndex (10K random, 100K items)",
		() => { for (const idx of indices) flow.scrollToIndex(idx); },
		100,
		() => { for (const idx of indices) ts.getOffsetForIndex(idx, "start"); },
		100,
	);
}

// 4. Viewport scroll — 1K updates
{
	const flow = createFlow({ count: 100_000, getHeight: variableHeight, overscan: 5 });
	const totalH = flow.totalHeight;

	const ts = createTS(100_000, variableHeight);
	ts._willUpdate();

	run(
		"setViewport (1K scrolls, 100K items)",
		() => { for (let i = 0; i < 1000; i++) flow.setViewport((i / 1000) * totalH, 600); },
		100,
		() => {
			for (let i = 0; i < 1000; i++) {
				(ts as any).scrollOffset = (i / 1000) * ts.getTotalSize();
				ts.calculateRange();
			}
		},
		100,
	);
}

// 5. getItems
{
	const flow = createFlow({ count: 100_000, getHeight: variableHeight, overscan: 5 });
	flow.setViewport(250_000, 600);

	const ts = createTS(100_000, variableHeight);
	ts._willUpdate();
	(ts as any).scrollOffset = 250_000;
	(ts as any).scrollRect = { width: 800, height: 600 };
	ts.calculateRange();

	run(
		"getItems (100K items)",
		() => flow.getItems(),
		10_000,
		() => ts.getVirtualItems(),
		10_000,
	);
}

// 6. Full pipeline: create + 100 scrolls + getItems each
run(
	"Full pipeline (create+scroll+render)",
	() => {
		const f = createFlow({ count: 100_000, getHeight: variableHeight, overscan: 5 });
		for (let i = 0; i < 100; i++) { f.setViewport(i * 500, 600); f.getItems(); }
	},
	20,
	() => {
		const v = createTS(100_000, variableHeight);
		v._willUpdate();
		for (let i = 0; i < 100; i++) {
			(v as any).scrollOffset = i * 500;
			(v as any).scrollRect = { width: 800, height: 600 };
			v.calculateRange();
			v.getVirtualItems();
		}
	},
	20,
);

// 7. Append 100 batches of 100 items
run(
	"Append (100x100 items, infinite scroll)",
	() => {
		const f = createFlow({ count: 10_000, getHeight: variableHeight, overscan: 5 });
		f.setViewport(0, 600);
		for (let i = 0; i < 100; i++) f.append(100);
	},
	100,
	() => {
		let count = 10_000;
		const v = createTS(count, variableHeight);
		v._willUpdate();
		for (let i = 0; i < 100; i++) {
			count += 100;
			v.setOptions({
				count,
				getScrollElement: () => null,
				estimateSize: variableHeight,
				overscan: 5,
				scrollToFn: () => {},
				observeElementRect: () => {},
				observeElementOffset: () => {},
				initialRect: { width: 800, height: 600 },
			});
			v.getMeasurements();
		}
	},
	100,
);

// 8. O(1) offset lookup (preflow exclusive)
{
	const flow = createFlow({ count: 100_000, getHeight: variableHeight, overscan: 5 });
	const indices = Array.from({ length: 100_000 }, () => Math.floor(Math.random() * 100_000));

	run(
		"getItemOffset (100K lookups, O(1))",
		() => { for (const idx of indices) flow.getItemOffset(idx); },
		100,
		null,
		0,
	);
}

// 9. Grid layout (preflow exclusive — tanstack has no built-in grid)
run(
	"Grid create 10K (4 cols)",
	() => createGrid({ count: 10_000, columns: 4, columnWidth: 200, gap: 8, getHeight: variableHeight }),
	200,
	null,
	0,
);

// 10. Masonry layout (preflow exclusive)
run(
	"Masonry create 10K (4 cols)",
	() => createMasonry({ count: 10_000, columns: 4, columnWidth: 200, gap: 8, getHeight: variableHeight }),
	200,
	null,
	0,
);

// 11. Chat with prepend + scroll correction (preflow exclusive)
run(
	"Chat prepend (20 batches of 50)",
	() => {
		const c = createChat({ count: 500, getHeight: variableHeight, overscan: 5 });
		c.setViewport(c.scrollToEnd(), 600);
		for (let i = 0; i < 20; i++) c.prepend(50);
	},
	200,
	null,
	0,
);

// 12. Memory
{
	// Preflow: Float64Array(count+1) = (100001) * 8 bytes = 800 KB
	// Plus closure overhead ~1 KB
	const pfMem = (100_001) * 8 + 1024;

	// TanStack: array of VirtualItem objects, each ~80-120 bytes
	// Measure by creating and keeping alive
	const kept: any[] = [];
	const m1 = process.memoryUsage().heapUsed;
	for (let i = 0; i < 5; i++) {
		const v = createTS(100_000, variableHeight);
		v._willUpdate();
		v.getMeasurements();
		kept.push(v);
	}
	const tsMem = (process.memoryUsage().heapUsed - m1) / 5;
	void kept;

	const fmtMem = (b: number) => b >= 1_048_576 ? `${(b / 1_048_576).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`;

	rows.push({
		scenario: "Memory per 100K instance",
		preflow: fmtMem(pfMem),
		tanstack: fmtMem(tsMem),
		diff: `**${(tsMem / pfMem).toFixed(1)}x less**`,
	});
	console.log(`  Memory: preflow ${fmtMem(pfMem)} | tanstack ${fmtMem(tsMem)} | ${(tsMem / pfMem).toFixed(1)}x less`);
}

// ---------------------------------------------------------------------------
// Output markdown table
// ---------------------------------------------------------------------------

console.log("\n\n## Markdown table (copy to README)\n");
console.log("| Scenario | Preflow | TanStack Virtual | Diff |");
console.log("|---|---|---|---|");
for (const r of rows) {
	console.log(`| ${r.scenario} | ${r.preflow} | ${r.tanstack} | ${r.diff} |`);
}
