import { describe, expect, test } from "bun:test";
import { createMasonry } from "@preflow/core";

describe("useMasonry logic", () => {
	test("creates masonry with items placed in columns", () => {
		const flow = createMasonry({
			count: 6,
			columns: 3,
			columnWidth: 100,
			getHeight: () => 50,
		});
		flow.setViewport(0, 500);
		const items = flow.getItems();
		expect(items.length).toBe(6);
	});

	test("items are placed in shortest column", () => {
		const heights = [100, 50, 75, 60, 80, 40];
		const flow = createMasonry({
			count: 6,
			columns: 3,
			columnWidth: 100,
			getHeight: (i) => heights[i]!,
		});
		flow.setViewport(0, 1000);
		const items = flow.getItems();

		// First 3 items go to columns 0, 1, 2
		expect(items[0]!.x).toBe(0);
		expect(items[1]!.x).toBe(100);
		expect(items[2]!.x).toBe(200);

		// 4th item goes to shortest column (column 1 at height 50)
		expect(items[3]!.x).toBe(100);
		expect(items[3]!.y).toBe(50);
	});

	test("totalHeight is height of tallest column", () => {
		// All same height: 3 items in 3 cols = 1 row of 50
		const flow = createMasonry({
			count: 3,
			columns: 3,
			columnWidth: 100,
			getHeight: () => 50,
		});
		expect(flow.totalHeight).toBe(50);
	});

	test("gap is applied between items in same column", () => {
		const flow = createMasonry({
			count: 6,
			columns: 3,
			columnWidth: 100,
			gap: 10,
			getHeight: () => 50,
		});
		flow.setViewport(0, 500);
		const items = flow.getItems();

		// Items 3,4,5 should be at y = 50 + 10 = 60 (one item + gap above)
		expect(items[3]!.y).toBe(60);
	});

	test("gap is applied to x spacing between columns", () => {
		const flow = createMasonry({
			count: 3,
			columns: 3,
			columnWidth: 100,
			gap: 10,
			getHeight: () => 50,
		});
		flow.setViewport(0, 500);
		const items = flow.getItems();
		expect(items[0]!.x).toBe(0);
		expect(items[1]!.x).toBe(110);
		expect(items[2]!.x).toBe(220);
	});

	test("setViewport returns false when range unchanged", () => {
		const flow = createMasonry({
			count: 6,
			columns: 3,
			columnWidth: 100,
			getHeight: () => 50,
		});
		flow.setViewport(0, 500);
		const changed = flow.setViewport(0, 500);
		expect(changed).toBe(false);
	});

	test("scrollToIndex returns item y offset", () => {
		const flow = createMasonry({
			count: 6,
			columns: 3,
			columnWidth: 100,
			getHeight: () => 50,
		});
		flow.setViewport(0, 500);
		expect(flow.scrollToIndex(0)).toBe(0);
		expect(flow.scrollToIndex(1)).toBe(0);
	});

	test("setCount updates placement", () => {
		const flow = createMasonry({
			count: 3,
			columns: 3,
			columnWidth: 100,
			getHeight: () => 50,
		});
		expect(flow.totalHeight).toBe(50);
		flow.setCount(6);
		expect(flow.totalHeight).toBe(100);
	});

	test("scrollToEnd returns correct offset", () => {
		const flow = createMasonry({
			count: 6,
			columns: 3,
			columnWidth: 100,
			getHeight: () => 50,
		});
		flow.setViewport(0, 80);
		// totalHeight = 100, viewport = 80 => 20
		expect(flow.scrollToEnd()).toBe(20);
	});

	test("items have correct column width", () => {
		const flow = createMasonry({
			count: 6,
			columns: 3,
			columnWidth: 150,
			getHeight: () => 50,
		});
		flow.setViewport(0, 500);
		const items = flow.getItems();
		for (const item of items) {
			expect(item.width).toBe(150);
		}
	});

	test("append adds items to placement", () => {
		const flow = createMasonry({
			count: 3,
			columns: 3,
			columnWidth: 100,
			getHeight: () => 50,
		});
		expect(flow.totalHeight).toBe(50);
		flow.append(3);
		expect(flow.totalHeight).toBe(100);
	});
});
