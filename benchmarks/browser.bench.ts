/**
 * Browser FPS Benchmark: Playwright-driven scroll performance comparison.
 *
 * Starts a Vite dev server with test pages for each library,
 * then uses Playwright to scroll and measure real frame times.
 *
 * Usage: bun run benchmarks/browser.bench.ts
 */

import { chromium } from "playwright";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const LIBS = ["preflow", "tanstack", "virtuoso"] as const;
const SCROLL_DURATION_MS = 3000;
const SCROLL_SPEED = 20; // pixels per frame

async function measureFPS(
	page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newPage"]>>,
	lib: string,
): Promise<{ fps: number; p50: number; p95: number; p99: number; frames: number; dropped: number }> {
	// Inject FPS measurement
	await page.evaluate(
		({ duration, speed }) => {
			return new Promise<void>((resolve) => {
				const container =
					document.getElementById("scroll-container") ||
					document.querySelector('[data-testid="virtuoso-scroller"]') ||
					document.querySelector('[data-virtuoso-scroller="true"]') ||
					document.querySelector("[style*='overflow: auto']") ||
					document.querySelector("[style*='overflow']");
				if (!container) {
					console.error("No scroll container found");
					resolve();
					return;
				}

				const frameTimes: number[] = [];
				let lastTime = performance.now();
				let elapsed = 0;

				function tick() {
					const now = performance.now();
					const dt = now - lastTime;
					frameTimes.push(dt);
					lastTime = now;
					elapsed += dt;

					container!.scrollTop += speed;

					if (container!.scrollTop >= container!.scrollHeight - container!.clientHeight) {
						container!.scrollTop = 0;
					}

					if (elapsed < duration) {
						requestAnimationFrame(tick);
					} else {
						(window as any).__benchResult = {
							frameTimes: frameTimes.slice(1), // skip first (warmup)
						};
						resolve();
					}
				}

				requestAnimationFrame(tick);
			});
		},
		{ duration: SCROLL_DURATION_MS, speed: SCROLL_SPEED },
	);

	const result = await page.evaluate(() => (window as any).__benchResult);
	const frameTimes: number[] = result.frameTimes;

	frameTimes.sort((a: number, b: number) => a - b);
	const totalFrames = frameTimes.length;
	const avgFrameTime = frameTimes.reduce((a: number, b: number) => a + b, 0) / totalFrames;
	const fps = Math.round(1000 / avgFrameTime);
	const p50 = frameTimes[Math.floor(totalFrames * 0.5)]!;
	const p95 = frameTimes[Math.floor(totalFrames * 0.95)]!;
	const p99 = frameTimes[Math.floor(totalFrames * 0.99)]!;
	const dropped = frameTimes.filter((t: number) => t > 33.3).length; // below 30fps

	return { fps, p50, p95, p99, frames: totalFrames, dropped };
}

async function measureMountTime(
	page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newPage"]>>,
): Promise<number> {
	return page.evaluate(() => {
		return new Promise<number>((resolve) => {
			const start = performance.now();
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					resolve(performance.now() - start);
				});
			});
		});
	});
}

async function main() {
	console.log("Browser FPS Benchmark (Playwright + Vite)");
	console.log("=".repeat(70));
	console.log();

	// Start Vite dev server
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
	const baseUrl = "http://localhost:5199";
	console.log(`Vite server running at ${baseUrl}`);
	console.log();

	// Launch browser
	const browser = await chromium.launch({ headless: true });

	const results: Array<{
		lib: string;
		fps: number;
		p50: number;
		p95: number;
		p99: number;
		frames: number;
		dropped: number;
		mountMs: number;
	}> = [];

	for (const lib of LIBS) {
		process.stdout.write(`  Testing ${lib}...`);
		const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

		try {
			await page.goto(`${baseUrl}?lib=${lib}`, { waitUntil: "networkidle" });
			await page.waitForTimeout(500); // let everything settle

			const mountMs = await measureMountTime(page);
			const fps = await measureFPS(page, lib);

			results.push({ lib, ...fps, mountMs });
			console.log(` ${fps.fps} FPS (p95: ${fps.p95.toFixed(1)}ms, dropped: ${fps.dropped})`);
		} catch (e: any) {
			console.log(` FAILED: ${e.message}`);
			results.push({
				lib,
				fps: 0,
				p50: 0,
				p95: 0,
				p99: 0,
				frames: 0,
				dropped: 0,
				mountMs: 0,
			});
		}

		await page.close();
	}

	await browser.close();
	await server.close();

	// Print results
	console.log();
	console.log("Results (100,000 items, 3s continuous scroll):");
	console.log("-".repeat(70));
	console.log(
		`  ${"Library".padEnd(16)} ${"FPS".padStart(5)} ${"p50".padStart(8)} ${"p95".padStart(8)} ${"p99".padStart(8)} ${"Dropped".padStart(8)} ${"Mount".padStart(8)}`,
	);
	console.log("-".repeat(70));

	for (const r of results) {
		if (r.fps === 0) {
			console.log(`  ${r.lib.padEnd(16)} FAILED`);
			continue;
		}
		console.log(
			`  ${r.lib.padEnd(16)} ${String(r.fps).padStart(5)} ${(r.p50.toFixed(1) + "ms").padStart(8)} ${(r.p95.toFixed(1) + "ms").padStart(8)} ${(r.p99.toFixed(1) + "ms").padStart(8)} ${String(r.dropped).padStart(8)} ${(r.mountMs.toFixed(0) + "ms").padStart(8)}`,
		);
	}
	console.log();
}

main().catch(console.error);
