import { describe, expect, test } from "bun:test";
import { createGrid } from "@preflow/core";

describe("useGrid composable logic", () => {
	test("grid instance creation with correct total height", () => {
		const grid = createGrid({
			count: 12,
			columns: 3,
			columnWidth: 100,
			getHeight: () => 50,
		});
		// 12 items / 3 columns = 4 rows, each 50px tall
		expect(grid.totalHeight).toBe(200);
	});

	test("grid with zero items", () => {
		const grid = createGrid({
			count: 0,
			columns: 3,
			columnWidth: 100,
			getHeight: () => 50,
		});
		expect(grid.totalHeight).toBe(0);
		expect(grid.getItems()).toEqual([]);
	});

	test("grid items have correct x positions based on columns", () => {
		const grid = createGrid({
			count: 6,
			columns: 3,
			columnWidth: 100,
			gap: 10,
			getHeight: () => 50,
		});
		grid.setViewport(0, 500);
		const items = grid.getItems();
		expect(items.length).toBe(6);
		// First row
		expect(items[0]!.x).toBe(0);
		expect(items[1]!.x).toBe(110); // 100 + 10 gap
		expect(items[2]!.x).toBe(220); // 200 + 20 gap
	});

	test("grid items have correct width set to columnWidth", () => {
		const grid = createGrid({
			count: 3,
			columns: 3,
			columnWidth: 150,
			getHeight: () => 50,
		});
		grid.setViewport(0, 500);
		const items = grid.getItems();
		for (const item of items) {
			expect(item.width).toBe(150);
		}
	});

	test("viewport updates return visible items", () => {
		const grid = createGrid({
			count: 100,
			columns: 4,
			columnWidth: 100,
			getHeight: () => 50,
			overscan: 1,
		});
		grid.setViewport(0, 200);
		const items = grid.getItems();
		expect(items.length).toBeGreaterThan(0);
		expect(items[0]!.index).toBe(0);
	});

	test("setCount updates total height", () => {
		const grid = createGrid({
			count: 12,
			columns: 3,
			columnWidth: 100,
			getHeight: () => 50,
		});
		expect(grid.totalHeight).toBe(200);
		grid.setCount(24);
		// 24 / 3 = 8 rows * 50 = 400
		expect(grid.totalHeight).toBe(400);
	});

	test("scrollToIndex returns offset for the correct row", () => {
		const grid = createGrid({
			count: 30,
			columns: 3,
			columnWidth: 100,
			getHeight: () => 50,
		});
		grid.setViewport(0, 200);
		// Item 9 is in row 3 (0-indexed), offset = 3 * 50 = 150
		const offset = grid.scrollToIndex(9);
		expect(offset).toBe(150);
	});

	test("scrollToEnd returns correct offset", () => {
		const grid = createGrid({
			count: 30,
			columns: 3,
			columnWidth: 100,
			getHeight: () => 50,
		});
		grid.setViewport(0, 200);
		const offset = grid.scrollToEnd();
		// 10 rows * 50 = 500 total, minus viewport 200 = 300
		expect(offset).toBe(300);
	});

	test("grid with gap increases total height", () => {
		const grid = createGrid({
			count: 12,
			columns: 3,
			columnWidth: 100,
			gap: 10,
			getHeight: () => 50,
		});
		// 4 rows: first row 50px, rows 2-4 each (50+10)px = 50 + 3*60 = 230
		expect(grid.totalHeight).toBe(230);
	});

	test("partial last row handled correctly", () => {
		const grid = createGrid({
			count: 7,
			columns: 3,
			columnWidth: 100,
			getHeight: () => 50,
		});
		// ceil(7/3) = 3 rows * 50 = 150
		expect(grid.totalHeight).toBe(150);
		grid.setViewport(0, 500);
		const items = grid.getItems();
		expect(items.length).toBe(7);
	});

	test("row height is max of cell heights in that row", () => {
		const heights = [20, 30, 40, 50, 60, 70];
		const grid = createGrid({
			count: 6,
			columns: 3,
			columnWidth: 100,
			getHeight: (i) => heights[i]!,
		});
		// Row 0: max(20,30,40) = 40
		// Row 1: max(50,60,70) = 70
		// Total = 40 + 70 = 110
		expect(grid.totalHeight).toBe(110);
	});
});
