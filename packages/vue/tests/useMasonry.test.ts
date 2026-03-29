import { describe, expect, test } from "bun:test";
import { createMasonry } from "@preflow/core";

describe("useMasonry composable logic", () => {
	test("masonry instance creation with uniform heights", () => {
		const masonry = createMasonry({
			count: 6,
			columns: 3,
			columnWidth: 100,
			getHeight: () => 50,
		});
		// Uniform: 2 items per column, each 50px = 100px, minus trailing gap (0) = 100
		expect(masonry.totalHeight).toBe(100);
	});

	test("masonry with zero items", () => {
		const masonry = createMasonry({
			count: 0,
			columns: 3,
			columnWidth: 100,
			getHeight: () => 50,
		});
		expect(masonry.totalHeight).toBe(0);
		expect(masonry.getItems()).toEqual([]);
	});

	test("items placed in shortest column", () => {
		// Heights: 100, 50, 75
		// After placing: col0=100, col1=50, col2=75
		// 4th item goes to col1 (shortest at 50)
		const heights = [100, 50, 75, 30];
		const masonry = createMasonry({
			count: 4,
			columns: 3,
			columnWidth: 100,
			getHeight: (i) => heights[i]!,
		});
		masonry.setViewport(0, 1000);
		const items = masonry.getItems();
		expect(items.length).toBe(4);
		// Item 3 should be in column 1 (x = 100)
		expect(items[3]!.x).toBe(100); // col1
		expect(items[3]!.y).toBe(50); // below item 1 (height 50)
	});

	test("viewport updates return visible items", () => {
		const masonry = createMasonry({
			count: 100,
			columns: 3,
			columnWidth: 100,
			getHeight: () => 50,
			overscan: 1,
		});
		masonry.setViewport(0, 200);
		const items = masonry.getItems();
		expect(items.length).toBeGreaterThan(0);
	});

	test("setCount updates placement and total height", () => {
		const masonry = createMasonry({
			count: 6,
			columns: 3,
			columnWidth: 100,
			getHeight: () => 50,
		});
		expect(masonry.totalHeight).toBe(100);
		masonry.setCount(9);
		// 3 items per column, each 50 = 150
		expect(masonry.totalHeight).toBe(150);
	});

	test("scrollToIndex returns item offset", () => {
		const masonry = createMasonry({
			count: 10,
			columns: 2,
			columnWidth: 100,
			getHeight: () => 50,
		});
		masonry.setViewport(0, 400);
		const offset = masonry.scrollToIndex(0);
		expect(offset).toBe(0);
	});

	test("scrollToEnd returns correct offset", () => {
		const masonry = createMasonry({
			count: 10,
			columns: 2,
			columnWidth: 100,
			getHeight: () => 50,
		});
		masonry.setViewport(0, 100);
		const offset = masonry.scrollToEnd();
		// 5 items per column * 50 = 250, minus viewport 100 = 150
		expect(offset).toBe(150);
	});

	test("masonry with gap affects placement", () => {
		const masonry = createMasonry({
			count: 6,
			columns: 3,
			columnWidth: 100,
			gap: 10,
			getHeight: () => 50,
		});
		masonry.setViewport(0, 1000);
		const items = masonry.getItems();
		// Second row items should be offset by height + gap
		const secondRowItem = items.find((i) => i.y > 0);
		expect(secondRowItem).toBeDefined();
		expect(secondRowItem!.y).toBe(60); // 50 + 10 gap
	});

	test("items have correct width set to columnWidth", () => {
		const masonry = createMasonry({
			count: 3,
			columns: 3,
			columnWidth: 120,
			getHeight: () => 50,
		});
		masonry.setViewport(0, 500);
		const items = masonry.getItems();
		for (const item of items) {
			expect(item.width).toBe(120);
		}
	});

	test("append adds items and updates height", () => {
		const masonry = createMasonry({
			count: 6,
			columns: 3,
			columnWidth: 100,
			getHeight: () => 50,
		});
		expect(masonry.totalHeight).toBe(100);
		masonry.append(3);
		// 9 items / 3 columns = 3 each, 3 * 50 = 150
		expect(masonry.totalHeight).toBe(150);
	});

	test("getItemHeight returns correct height", () => {
		const heights = [30, 40, 50];
		const masonry = createMasonry({
			count: 3,
			columns: 3,
			columnWidth: 100,
			getHeight: (i) => heights[i]!,
		});
		expect(masonry.getItemHeight(0)).toBe(30);
		expect(masonry.getItemHeight(1)).toBe(40);
		expect(masonry.getItemHeight(2)).toBe(50);
	});
});
