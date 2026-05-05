/**
 * Benchmark: @preflow/core vs @tanstack/virtual-core
 *
 * Both are framework-agnostic virtualizer cores.
 * react-virtuoso is React-only — no headless core to benchmark.
 */

import { Virtualizer } from "@tanstack/virtual-core";
import { createChat, createFlow, createGrid, createMasonry } from "../packages/core/src/index";
import { createColumnLayout, createProse } from "../packages/prose/src/index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface BenchResult {
	ops: number;
	lowOps: number;
	avgUs: number;
	samples: number[];
}

function percentile(sorted: number[], p: number): number {
	const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1);
	return sorted[index]!;
}

function bench(fn: () => void, iterations: number, samples = 7): BenchResult {
	for (let i = 0; i < Math.min(iterations, 50); i++) fn();

	const opsSamples: number[] = [];
	const avgUsSamples: number[] = [];
	for (let sample = 0; sample < samples; sample++) {
		const start = performance.now();
		for (let i = 0; i < iterations; i++) fn();
		const elapsed = performance.now() - start;
		const avgMs = elapsed / iterations;
		opsSamples.push(1000 / avgMs);
		avgUsSamples.push(avgMs * 1000);
	}

	const sortedOps = [...opsSamples].sort((a, b) => a - b);
	const sortedUs = [...avgUsSamples].sort((a, b) => a - b);

	return {
		ops: Math.round(percentile(sortedOps, 0.5)),
		lowOps: Math.round(percentile(sortedOps, 0.05)),
		avgUs: percentile(sortedUs, 0.5),
		samples: opsSamples.map(Math.round),
	};
}

function fmtOps(ops: number): string {
	if (ops >= 1_000_000) return `${(ops / 1_000_000).toFixed(1)}M`;
	if (ops >= 1_000) return `${(ops / 1_000).toFixed(1)}K`;
	return String(ops);
}

const variableHeight = (i: number) => 50 + (i % 7) * 10;

interface TanStackMutableState {
	scrollOffset: number;
	scrollRect: { width: number; height: number };
}

function setTSViewport(
	v: Virtualizer<unknown, unknown>,
	scrollOffset: number,
	height: number,
): void {
	const state = v as unknown as TanStackMutableState;
	state.scrollOffset = scrollOffset;
	state.scrollRect = { width: 800, height };
}

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
	preflowOps: number | null;
	tanstackOps: number | null;
	preflowLowOps: number | null;
	tanstackLowOps: number | null;
}

const rows: Row[] = [];
const outputJson = Bun.argv.includes("--json");

function run(
	scenario: string,
	pfFn: () => void,
	pfIter: number,
	tsFn: (() => void) | null,
	tsIter: number,
	samples = 7,
) {
	const pf = bench(pfFn, pfIter, samples);
	const ts = tsFn ? bench(tsFn, tsIter, samples) : null;

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
		preflowOps: pf.ops,
		tanstackOps: ts?.ops ?? null,
		preflowLowOps: pf.lowOps,
		tanstackLowOps: ts?.lowOps ?? null,
	});

	if (!outputJson) {
		console.log(
			`  ${scenario}: preflow ${fmtOps(pf.ops)} | tanstack ${ts ? fmtOps(ts.ops) : "N/A"} | ${diff}`,
		);
	}
}

if (!outputJson) console.log("\n=== @preflow/core vs @tanstack/virtual-core ===\n");

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
		() => {
			for (const idx of indices) flow.scrollToIndex(idx);
		},
		100,
		() => {
			for (const idx of indices) ts.getOffsetForIndex(idx, "start");
		},
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
		() => {
			for (let i = 0; i < 1000; i++) flow.setViewport((i / 1000) * totalH, 600);
		},
		100,
		() => {
			for (let i = 0; i < 1000; i++) {
				setTSViewport(ts, (i / 1000) * ts.getTotalSize(), 600);
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
	setTSViewport(ts, 250_000, 600);
	ts.calculateRange();

	run(
		"getItems (100K items)",
		() => flow.getItems(),
		10_000,
		() => ts.getVirtualItems(),
		10_000,
	);
}

// 6. forEachItem — allocation-free visible item traversal
{
	const flow = createFlow({ count: 100_000, getHeight: variableHeight, overscan: 5 });
	flow.setViewport(250_000, 600);
	let sink = 0;

	run(
		"forEachItem (100K items)",
		() =>
			flow.forEachItem((index, _x, y, _width, height) => {
				sink += index + y + height;
			}),
		10_000,
		null,
		0,
	);
	if (sink === -1) console.log("");
}

// 7. Full pipeline split: create/build + first viewport
run(
	"Create + first viewport",
	() => {
		const f = createFlow({ count: 100_000, getHeight: variableHeight, overscan: 5 });
		f.setViewport(0, 600);
	},
	50,
	() => {
		const v = createTS(100_000, variableHeight);
		v._willUpdate();
		setTSViewport(v, 0, 600);
		v.calculateRange();
	},
	50,
);

// 8. Full pipeline split: scroll math only
{
	const flow = createFlow({ count: 100_000, getHeight: variableHeight, overscan: 5 });
	const ts = createTS(100_000, variableHeight);
	ts._willUpdate();

	run(
		"Scroll pipeline without getItems",
		() => {
			for (let i = 0; i < 100; i++) flow.setViewport(i * 500, 600);
		},
		100,
		() => {
			for (let i = 0; i < 100; i++) {
				setTSViewport(ts, i * 500, 600);
				ts.calculateRange();
			}
		},
		100,
	);
}

// 9. Full pipeline: create + 100 scrolls + getItems each
run(
	"Full pipeline (create+scroll+render)",
	() => {
		const f = createFlow({ count: 100_000, getHeight: variableHeight, overscan: 5 });
		for (let i = 0; i < 100; i++) {
			f.setViewport(i * 500, 600);
			f.getItems();
		}
	},
	20,
	() => {
		const v = createTS(100_000, variableHeight);
		v._willUpdate();
		for (let i = 0; i < 100; i++) {
			setTSViewport(v, i * 500, 600);
			v.calculateRange();
			v.getVirtualItems();
		}
	},
	20,
);

// 10. Append 100 batches of 100 items
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

// 11. O(1) offset lookup (preflow exclusive)
{
	const flow = createFlow({ count: 100_000, getHeight: variableHeight, overscan: 5 });
	const indices = Array.from({ length: 100_000 }, () => Math.floor(Math.random() * 100_000));

	run(
		"getItemOffset (100K lookups, O(1))",
		() => {
			for (const idx of indices) flow.getItemOffset(idx);
		},
		100,
		null,
		0,
	);
}

// 12. Grid layout (preflow exclusive — tanstack has no built-in grid)
run(
	"Grid create 10K (4 cols)",
	() =>
		createGrid({ count: 10_000, columns: 4, columnWidth: 200, gap: 8, getHeight: variableHeight }),
	200,
	null,
	0,
);

// 13. Masonry layout (preflow exclusive)
run(
	"Masonry create 10K (4 cols)",
	() =>
		createMasonry({
			count: 10_000,
			columns: 4,
			columnWidth: 200,
			gap: 8,
			getHeight: variableHeight,
		}),
	200,
	null,
	0,
);

// 14. Masonry viewport updates (preflow exclusive)
{
	const masonry = createMasonry({
		count: 100_000,
		columns: 4,
		columnWidth: 200,
		gap: 8,
		getHeight: variableHeight,
	});
	const totalH = masonry.totalHeight;

	run(
		"Masonry setViewport (1K scrolls, 100K items)",
		() => {
			for (let i = 0; i < 1000; i++) masonry.setViewport((i / 1000) * totalH, 600);
		},
		50,
		null,
		0,
	);
}

// 15. Masonry viewport + item traversal (preflow exclusive)
{
	const masonry = createMasonry({
		count: 100_000,
		columns: 4,
		columnWidth: 200,
		gap: 8,
		getHeight: variableHeight,
	});
	const totalH = masonry.totalHeight;

	run(
		"Masonry setViewport + getItems (1K scrolls, 100K items)",
		() => {
			for (let i = 0; i < 1000; i++) {
				masonry.setViewport((i / 1000) * totalH, 600);
				masonry.getItems();
			}
		},
		20,
		null,
		0,
	);
}

// 16. Chat with prepend + scroll correction (preflow exclusive)
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

// 17. Prose line virtualization (preflow exclusive)
{
	const lineCount = (i: number) => 1 + (i % 9);
	const prose = createProse({
		count: 100_000,
		getLineCount: lineCount,
		lineHeight: 20,
		blockGap: 8,
		overscan: 8,
	});
	const totalH = prose.totalHeight;

	run(
		"Prose setViewport + getLines (1K scrolls, 100K blocks)",
		() => {
			for (let i = 0; i < 1000; i++) {
				prose.setViewport((i / 1000) * totalH, 600);
				prose.getLines();
			}
		},
		50,
		null,
		0,
	);
}

// 18. Prose cached line reads (preflow exclusive)
{
	const prose = createProse({
		count: 100_000,
		getLineCount: (i) => 1 + (i % 9),
		lineHeight: 20,
		blockGap: 8,
		overscan: 8,
	});
	prose.setViewport(250_000, 600);

	run("Prose cached getLines (100K blocks)", () => prose.getLines(), 10_000, null, 0);
}

// 19. Prose column layout (preflow exclusive)
run(
	"Prose column layout 100K (4 cols)",
	() =>
		createColumnLayout({
			columns: 4,
			count: 100_000,
			getLineCount: (i) => 1 + (i % 9),
			lineHeight: 20,
			blockGap: 8,
		}),
	50,
	null,
	0,
);

// 20. Memory — subprocess isolation to avoid GC interference
//    Bun tracks Float64Array in `external`, JS objects in `heapUsed`
{
	const pfResult = Bun.spawnSync([
		"bun",
		"-e",
		`
		const { createFlow } = require('./packages/core/src/index');
		const h = (i) => 50 + (i % 7) * 10;
		for (let i = 0; i < 3; i++) { const f = createFlow({ count: 100_000, getHeight: h, overscan: 5 }); f.setViewport(0, 600); }
		Bun.gc(true); Bun.gc(true);
		const mem = () => { const m = process.memoryUsage(); return m.heapUsed + m.external; };
		const b = mem();
		const k = [];
		for (let i = 0; i < 5; i++) { const f = createFlow({ count: 100_000, getHeight: h, overscan: 5 }); f.setViewport(0, 600); f.getItems(); k.push(f); }
		Bun.gc(true); Bun.gc(true);
		console.log(Math.round((mem() - b) / 5));
		globalThis.__k = k;
	`,
	]);
	const pfMem = Number.parseInt(pfResult.stdout.toString().trim()) || 0;

	const tsResult = Bun.spawnSync([
		"bun",
		"-e",
		`
		const { Virtualizer } = require('@tanstack/virtual-core');
		const h = (i) => 50 + (i % 7) * 10;
		function mk(n) { return new Virtualizer({ count: n, getScrollElement: () => null, estimateSize: h, overscan: 5,
			scrollToFn: () => {}, observeElementRect: () => {}, observeElementOffset: () => {},
			initialRect: { width: 800, height: 600 } }); }
		for (let i = 0; i < 3; i++) { const v = mk(100000); v._willUpdate(); v.getMeasurements(); }
		Bun.gc(true); Bun.gc(true);
		const mem = () => { const m = process.memoryUsage(); return m.heapUsed + m.external; };
		const b = mem();
		const k = [];
		for (let i = 0; i < 5; i++) { const v = mk(100000); v._willUpdate(); v.getMeasurements(); k.push(v); }
		Bun.gc(true); Bun.gc(true);
		console.log(Math.round((mem() - b) / 5));
		globalThis.__k = k;
	`,
	]);
	const tsMem = Number.parseInt(tsResult.stdout.toString().trim()) || 0;

	const fmtMem = (b: number) =>
		b >= 1_048_576 ? `${(b / 1_048_576).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`;
	const ratio =
		tsMem > pfMem
			? `**${(tsMem / pfMem).toFixed(1)}x less**`
			: `${(pfMem / tsMem).toFixed(1)}x more`;

	rows.push({
		scenario: "Memory per 100K instance",
		preflow: fmtMem(pfMem),
		tanstack: fmtMem(tsMem),
		diff: ratio,
		preflowOps: null,
		tanstackOps: null,
		preflowLowOps: null,
		tanstackLowOps: null,
	});
	if (!outputJson)
		console.log(`  Memory: preflow ${fmtMem(pfMem)} | tanstack ${fmtMem(tsMem)} | ${ratio}`);
}

// ---------------------------------------------------------------------------
// Output markdown table
// ---------------------------------------------------------------------------

if (outputJson) {
	console.log(JSON.stringify({ rows }, null, 2));
} else {
	console.log("\n\n## Markdown table (copy to README)\n");
	console.log("| Scenario | Preflow | TanStack Virtual | Diff |");
	console.log("|---|---|---|---|");
	for (const r of rows) {
		console.log(`| ${r.scenario} | ${r.preflow} | ${r.tanstack} | ${r.diff} |`);
	}
}
