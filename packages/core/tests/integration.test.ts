import { describe, expect, test } from "bun:test";
import { createChat, createFlow, createGrid, createMasonry } from "../src/index";

describe("integration: simulated pretext usage", () => {
	// Simulate pretext's layout() returning different heights based on container width
	function simulateLayout(textLength: number, containerWidth: number, lineHeight: number): number {
		const charsPerLine = Math.floor(containerWidth / 8); // ~8px per char
		const lineCount = Math.ceil(textLength / charsPerLine);
		return lineCount * lineHeight;
	}

	const texts = [
		"Hello world",
		"This is a longer message that might wrap to multiple lines depending on width",
		"Short",
		"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.",
		"Ok",
		"Another medium length message for testing purposes",
		"A",
		"The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog again.",
	];

	test("flow: heights change when container width changes", () => {
		let width = 400;
		const flow = createFlow({
			count: texts.length,
			getHeight: (i) => simulateLayout(texts[i]!.length, width, 20) + 16,
		});
		flow.setViewport(0, 600);

		const totalWide = flow.totalHeight;
		const _itemsWide = flow.getItems();

		// Narrow the container — text wraps more, items get taller
		width = 200;
		flow.setContainerWidth(200);

		expect(flow.totalHeight).toBeGreaterThan(totalWide);
	});

	test("flow: scrollToIndex is exact at any point", () => {
		const flow = createFlow({
			count: texts.length,
			getHeight: (i) => simulateLayout(texts[i]!.length, 400, 20) + 16,
		});
		flow.setViewport(0, 300);

		for (let i = 0; i < texts.length; i++) {
			const offset = flow.scrollToIndex(i);
			expect(offset).toBe(flow.getItemOffset(i));
		}
	});

	test("grid: column resize recalculates all heights", () => {
		let width = 300;
		const grid = createGrid({
			count: texts.length,
			columns: 2,
			columnWidth: 300,
			gap: 16,
			getHeight: (i) => simulateLayout(texts[i]!.length, width, 20) + 16,
		});
		grid.setViewport(0, 600);
		const totalBefore = grid.totalHeight;

		width = 150;
		grid.setContainerWidth(150);
		expect(grid.totalHeight).toBeGreaterThan(totalBefore);
	});

	test("masonry: items distribute based on height", () => {
		const masonry = createMasonry({
			count: texts.length,
			columns: 3,
			columnWidth: 250,
			gap: 12,
			getHeight: (i) => simulateLayout(texts[i]!.length, 250, 20) + 16,
		});
		masonry.setViewport(0, 1000);

		const items = masonry.getItems();
		expect(items.length).toBe(texts.length);

		// Short items should cluster in same columns that were shortest
		// Just verify all items have valid positions
		for (const item of items) {
			expect(item.y).toBeGreaterThanOrEqual(0);
			expect(item.x).toBeGreaterThanOrEqual(0);
			expect(item.height).toBeGreaterThan(0);
		}
	});

	test("chat: full lifecycle — load, read, prepend, new message", () => {
		const allMessages = [
			// Older messages (will be prepended later)
			"Old message 1",
			"Old message 2 with more text that wraps",
			"Old message 3",
			// Initial messages
			"Hey!",
			"What's up?",
			"Not much, just coding",
			"Nice! Working on the virtualizer?",
			"Yeah, it's coming along well",
		];

		let offset = 3; // initially show messages 3-7
		const chat = createChat({
			count: 5,
			getHeight: (i) => simulateLayout(allMessages[i + offset]!.length, 350, 20) + 24,
			overscan: 2,
		});

		// 1. Initial load — scroll to bottom
		const end = chat.scrollToEnd();
		chat.setViewport(end, 400);

		let items = chat.getItems();
		expect(items.length).toBeGreaterThan(0);

		// 2. New message arrives
		allMessages.push("Sure, let me help!");
		chat.append(1);

		items = chat.getItems();
		const lastIdx = items[items.length - 1]!.index;
		expect(lastIdx).toBe(5); // new message is visible (auto-follow)

		// 3. User scrolls up to read history
		chat.setViewport(0, 400);

		// 4. Load older messages (prepend)
		offset = 0;
		const correction = chat.prepend(3);
		expect(correction.offset).toBeGreaterThan(0);

		// totalHeight should now include all messages
		expect(chat.totalHeight).toBeGreaterThan(0);

		// Old messages should be accessible
		expect(chat.getItemOffset(0)).toBe(0);
		expect(chat.getItemHeight(0)).toBeGreaterThan(0);
	});
});

describe("integration: boundary conditions", () => {
	test("zero-height items", () => {
		const flow = createFlow({
			count: 5,
			getHeight: (i) => (i === 2 ? 0 : 50),
		});
		expect(flow.totalHeight).toBe(200);
		expect(flow.getItemOffset(3)).toBe(100); // items 0,1 = 100, item 2 = 0
		expect(flow.getItemHeight(2)).toBe(0);
	});

	test("very tall single item", () => {
		const flow = createFlow({
			count: 3,
			getHeight: (i) => (i === 1 ? 10000 : 50),
		});
		expect(flow.totalHeight).toBe(10100);
		flow.setViewport(5000, 400);
		const items = flow.getItems();
		// Should still show the giant item
		expect(items.some((i) => i.index === 1)).toBe(true);
	});

	test("all items same height degenerate case", () => {
		const flow = createFlow({
			count: 1000,
			getHeight: () => 50,
		});
		// scrollToIndex should be a simple multiplication
		for (let i = 0; i < 100; i++) {
			expect(flow.scrollToIndex(i)).toBe(i * 50);
		}
	});

	test("float precision: many small items don't drift", () => {
		const flow = createFlow({
			count: 100000,
			getHeight: () => 0.1,
		});
		// 100000 * 0.1 = 10000, but floating point might drift
		expect(flow.totalHeight).toBeCloseTo(10000, 5);
	});

	test("grid: single item", () => {
		const grid = createGrid({
			count: 1,
			columns: 3,
			columnWidth: 200,
			gap: 10,
			getHeight: () => 50,
		});
		grid.setViewport(0, 500);
		const items = grid.getItems();
		expect(items.length).toBe(1);
		expect(items[0]!.x).toBe(0);
		expect(items[0]!.y).toBe(0);
	});

	test("masonry: single column", () => {
		const masonry = createMasonry({
			count: 5,
			columns: 1,
			columnWidth: 400,
			gap: 10,
			getHeight: (i) => (i + 1) * 20,
		});
		masonry.setViewport(0, 1000);
		const items = masonry.getItems();

		// Single column = sequential vertical layout
		let expectedY = 0;
		for (const item of items) {
			expect(item.y).toBe(expectedY);
			expect(item.x).toBe(0);
			expectedY += item.height + 10;
		}
	});

	test("chat: empty then append", () => {
		const heights: number[] = [];
		const chat = createChat({
			count: 0,
			getHeight: (i) => heights[i]!,
		});
		expect(chat.totalHeight).toBe(0);
		expect(chat.getItems().length).toBe(0);

		heights.push(50, 60, 70);
		chat.append(3);
		chat.setViewport(0, 400);
		expect(chat.totalHeight).toBe(180);
		expect(chat.getItems().length).toBe(3);
	});
});

describe("integration: performance characteristics", () => {
	test("building 100k items completes in reasonable time", () => {
		const start = performance.now();
		const _flow = createFlow({
			count: 100_000,
			getHeight: (i) => 20 + (i % 13) * 3,
		});
		const buildTime = performance.now() - start;

		// Should complete in well under 100ms
		expect(buildTime).toBeLessThan(100);
	});

	test("scrollToIndex on 100k items is sub-millisecond", () => {
		const flow = createFlow({
			count: 100_000,
			getHeight: (i) => 20 + (i % 13) * 3,
		});
		flow.setViewport(0, 600);

		const start = performance.now();
		for (let i = 0; i < 10000; i++) {
			flow.scrollToIndex(Math.floor(Math.random() * 100000));
		}
		const elapsed = performance.now() - start;

		// 10,000 random scrollToIndex calls should be well under 50ms
		expect(elapsed).toBeLessThan(50);
	});

	test("setViewport on 100k items is sub-millisecond", () => {
		const flow = createFlow({
			count: 100_000,
			getHeight: (i) => 20 + (i % 13) * 3,
		});

		const start = performance.now();
		for (let i = 0; i < 1000; i++) {
			flow.setViewport(i * 100, 600);
		}
		const elapsed = performance.now() - start;

		// 1,000 viewport updates should complete quickly
		expect(elapsed).toBeLessThan(50);
	});

	test("masonry placement of 10k items completes quickly", () => {
		const start = performance.now();
		const masonry = createMasonry({
			count: 10_000,
			columns: 4,
			columnWidth: 250,
			gap: 12,
			getHeight: (i) => 40 + (i % 7) * 15,
		});
		const elapsed = performance.now() - start;

		expect(elapsed).toBeLessThan(100);
		expect(masonry.totalHeight).toBeGreaterThan(0);
	});
});
