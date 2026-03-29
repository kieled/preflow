/**
 * Browser Benchmark: Playwright-driven scroll + resize performance.
 *
 * Tests:
 *   1. Scroll FPS — 100K items, continuous scroll, uncapped framerate
 *   2. Grid resize — 100K items, rapid container width animation, measures reflow cost
 *
 * Usage: bun run benchmarks/browser.bench.ts
 */

import { chromium, type Page } from "playwright";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const SCROLL_LIBS = ["preflow", "tanstack", "virtuoso"] as const;
const GRID_LIBS = ["preflow-grid", "tanstack-grid", "virtuoso-grid"] as const;
const DURATION_MS = 3000;

type FPSResult = { fps: number; p50: number; p95: number; p99: number; frames: number; dropped: number };

async function measureScroll(page: Page): Promise<FPSResult> {
	await page.evaluate((duration) => {
		return new Promise<void>((resolve) => {
			const el = document.getElementById("scroll-container")
				|| document.querySelector('[data-virtuoso-scroller="true"]')
				|| document.querySelector("[style*='overflow']");
			if (!el) { resolve(); return; }
			const times: number[] = [];
			let last = performance.now();
			let elapsed = 0;
			function tick() {
				const now = performance.now();
				times.push(now - last);
				last = now;
				elapsed += times[times.length - 1]!;
				el!.scrollTop += 20;
				if (el!.scrollTop >= el!.scrollHeight - el!.clientHeight) el!.scrollTop = 0;
				if (elapsed < duration) requestAnimationFrame(tick);
				else { (window as any).__r = { times: times.slice(1) }; resolve(); }
			}
			requestAnimationFrame(tick);
		});
	}, DURATION_MS);
	return extractResult(page);
}

async function measureResize(page: Page): Promise<FPSResult> {
	await page.evaluate((duration) => {
		return new Promise<void>((resolve) => {
			const el = document.getElementById("scroll-container")
				|| document.querySelector('[data-virtuoso-scroller="true"]')
				|| document.querySelector("[style*='overflow']");
			if (!el) { resolve(); return; }
			const times: number[] = [];
			let last = performance.now();
			let elapsed = 0;
			let frame = 0;
			const root = document.getElementById("root")!;
			function tick() {
				const now = performance.now();
				times.push(now - last);
				last = now;
				elapsed += times[times.length - 1]!;
				// Oscillate width between 400px and 1200px
				const w = 800 + Math.sin(frame * 0.05) * 400;
				root.style.width = `${w}px`;
				frame++;
				if (elapsed < duration) requestAnimationFrame(tick);
				else { root.style.width = ""; (window as any).__r = { times: times.slice(1) }; resolve(); }
			}
			requestAnimationFrame(tick);
		});
	}, DURATION_MS);
	return extractResult(page);
}

async function extractResult(page: Page): Promise<FPSResult> {
	const { times } = await page.evaluate(() => (window as any).__r) as { times: number[] };
	times.sort((a, b) => a - b);
	const n = times.length;
	const avg = times.reduce((a, b) => a + b, 0) / n;
	return {
		fps: Math.round(1000 / avg),
		p50: times[Math.floor(n * 0.5)]!,
		p95: times[Math.floor(n * 0.95)]!,
		p99: times[Math.floor(n * 0.99)]!,
		frames: n,
		dropped: times.filter((t) => t > 33.3).length,
	};
}

function printTable(title: string, results: Array<{ name: string } & FPSResult & { mountMs: number }>) {
	console.log(title);
	console.log("-".repeat(74));
	console.log(`  ${"Library".padEnd(18)} ${"FPS".padStart(5)} ${"p50".padStart(8)} ${"p95".padStart(8)} ${"p99".padStart(8)} ${"Drops".padStart(6)} ${"Mount".padStart(7)}`);
	console.log("-".repeat(74));
	for (const r of results) {
		if (r.fps === 0) { console.log(`  ${r.name.padEnd(18)} FAILED`); continue; }
		console.log(`  ${r.name.padEnd(18)} ${String(r.fps).padStart(5)} ${(r.p50.toFixed(1) + "ms").padStart(8)} ${(r.p95.toFixed(1) + "ms").padStart(8)} ${(r.p99.toFixed(1) + "ms").padStart(8)} ${String(r.dropped).padStart(6)} ${(r.mountMs.toFixed(0) + "ms").padStart(7)}`);
	}
	console.log();
}

async function runTest(
	browser: Awaited<ReturnType<typeof chromium.launch>>,
	baseUrl: string,
	libs: readonly string[],
	measure: (page: Page) => Promise<FPSResult>,
) {
	const results: Array<{ name: string } & FPSResult & { mountMs: number }> = [];
	for (const lib of libs) {
		const label = lib.replace("-grid", " grid").replace("preflow", "Preflow").replace("tanstack", "TanStack").replace("virtuoso", "Virtuoso");
		process.stdout.write(`  ${label}...`);
		const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
		try {
			await page.goto(`${baseUrl}?lib=${lib}`, { waitUntil: "networkidle" });
			await page.waitForTimeout(300);
			const mountMs = await page.evaluate(() => new Promise<number>((r) => { const s = performance.now(); requestAnimationFrame(() => requestAnimationFrame(() => r(performance.now() - s))); }));
			const fps = await measure(page);
			results.push({ name: label, ...fps, mountMs });
			console.log(` ${fps.fps} FPS (p95: ${fps.p95.toFixed(1)}ms, drops: ${fps.dropped})`);
		} catch (e: any) {
			console.log(` FAILED: ${e.message.slice(0, 80)}`);
			results.push({ name: label, fps: 0, p50: 0, p95: 0, p99: 0, frames: 0, dropped: 0, mountMs: 0 });
		}
		await page.close();
	}
	return results;
}

async function main() {
	console.log("Browser Benchmark (Playwright, vsync uncapped, 100K items)");
	console.log("=".repeat(74));
	console.log();

	const server = await createServer({
		root: path.resolve(import.meta.dir, "browser"),
		plugins: [react()],
		resolve: {
			alias: {
				"@preflow/core": path.resolve(import.meta.dir, "../packages/core/src"),
				"@preflow/react": path.resolve(import.meta.dir, "../packages/react/src"),
			},
		},
		server: { port: 5199, strictPort: true },
		logLevel: "silent",
	});
	await server.listen();
	console.log("Vite server ready\n");

	const browser = await chromium.launch({
		headless: true,
		args: ["--disable-gpu-vsync", "--disable-frame-rate-limit"],
	});

	// Test 1: Scroll
	console.log("Test 1: Continuous scroll (100K list items)\n");
	const scrollResults = await runTest(browser, "http://localhost:5199", SCROLL_LIBS, measureScroll);

	// Test 2: Grid resize
	console.log("\nTest 2: Grid resize stress (100K items, width 400-1200px oscillation)\n");
	const resizeResults = await runTest(browser, "http://localhost:5199", GRID_LIBS, measureResize);

	await browser.close();
	await server.close();

	console.log("\n");
	printTable("Scroll Results (100K items, 3s):", scrollResults);
	printTable("Grid Resize Results (100K items, 3s width oscillation):", resizeResults);
}

main().catch(console.error);
