import { describe, expect, test } from "bun:test";
import { createGrid } from "../src/grid";

describe("createGrid", () => {
	function makeGrid(heights: number[], columns: number, columnWidth = 200, gap = 10, overscan = 0) {
		return createGrid({
			count: heights.length,
			columns,
			columnWidth,
			gap,
			getHeight: (i) => heights[i]!,
			overscan,
		});
	}

	describe("basic layout", () => {
		test("items placed in columns left to right", () => {
			const grid = makeGrid([50, 50, 50, 50], 2, 200, 10);
			grid.setViewport(0, 1000);
			const items = grid.getItems();

			// Row 0: items 0, 1
			expect(items[0]!.x).toBe(0);
			expect(items[1]!.x).toBe(210); // 200 + 10 gap

			// Row 1: items 2, 3
			expect(items[2]!.x).toBe(0);
			expect(items[3]!.x).toBe(210);
		});

		test("row height is max of cells in row", () => {
			const grid = makeGrid([30, 50, 40, 20], 2, 200, 0);
			grid.setViewport(0, 1000);
			const items = grid.getItems();

			// Row 0: max(30, 50) = 50. Row 0 starts at y=0.
			expect(items[0]!.y).toBe(0);
			expect(items[1]!.y).toBe(0);

			// Row 1: starts at y = 50 (row 0 height)
			expect(items[2]!.y).toBe(50);
			expect(items[3]!.y).toBe(50);
		});

		test("totalHeight is sum of row heights + gaps", () => {
			// 2 columns, 4 items = 2 rows
			// Row 0: max(30, 50) = 50
			// Row 1: max(40, 20) = 40
			// With gap=10: row0=50, row1=gap+40=50. total=100
			const grid = makeGrid([30, 50, 40, 20], 2, 200, 10);
			expect(grid.totalHeight).toBe(100);
		});

		test("incomplete last row", () => {
			const grid = makeGrid([50, 50, 50], 2, 200, 0);
			grid.setViewport(0, 1000);
			const items = grid.getItems();

			expect(items.length).toBe(3);
			// Row 0: items 0, 1
			// Row 1: item 2 only
			expect(items[2]!.x).toBe(0);
			expect(items[2]!.y).toBe(50);
		});

		test("single column grid is like a list", () => {
			const heights = [10, 20, 30, 40];
			const grid = makeGrid(heights, 1, 300, 0);
			expect(grid.totalHeight).toBe(100);
			grid.setViewport(0, 1000);
			const items = grid.getItems();
			expect(items[0]!.y).toBe(0);
			expect(items[1]!.y).toBe(10);
			expect(items[2]!.y).toBe(30);
			expect(items[3]!.y).toBe(60);
		});
	});

	describe("scrolling", () => {
		test("scroll past first row hides it", () => {
			const heights = Array(20).fill(50); // 10 rows of 2
			const grid = makeGrid(heights, 2, 200, 0, 0);
			grid.setViewport(100, 200); // skip row 0 and 1

			const items = grid.getItems();
			// Should not include items from row 0
			expect(items[0]!.index).toBeGreaterThanOrEqual(2);
		});

		test("visibleRange reports item indices", () => {
			const heights = Array(20).fill(50);
			const grid = makeGrid(heights, 2, 200, 0, 0);
			grid.setViewport(0, 100);
			const r = grid.visibleRange;
			// 100px viewport / 50px rows = 2 rows = 4 items
			expect(r.start).toBe(0);
			expect(r.end).toBeLessThanOrEqual(8); // a few rows
		});
	});

	describe("scrollToIndex", () => {
		test("scrolls to correct row", () => {
			const heights = Array(20).fill(50);
			const grid = makeGrid(heights, 2, 200, 0);
			grid.setViewport(0, 200);

			// Item 6 is in row 3 (0-indexed). Row 3 offset = 3*50 = 150
			expect(grid.scrollToIndex(6)).toBe(150);
			// Item 7 is also in row 3
			expect(grid.scrollToIndex(7)).toBe(150);
		});

		test("scrollToEnd", () => {
			const heights = Array(20).fill(50);
			const grid = makeGrid(heights, 2, 200, 0);
			grid.setViewport(0, 200);
			// 10 rows × 50px = 500px total. scrollToEnd = 500 - 200 = 300
			expect(grid.scrollToEnd()).toBe(300);
		});
	});

	describe("mutations", () => {
		test("setCount updates layout", () => {
			const heights = Array(20).fill(50);
			const grid = makeGrid(heights, 2, 200, 0);
			expect(grid.totalHeight).toBe(500); // 10 rows × 50

			grid.setCount(10);
			expect(grid.totalHeight).toBe(250); // 5 rows × 50
		});

		test("append adds rows", () => {
			const heights = Array(10).fill(50);
			const grid = createGrid({
				count: 6,
				columns: 2,
				columnWidth: 200,
				gap: 0,
				getHeight: (i) => heights[i]!,
			});
			expect(grid.totalHeight).toBe(150); // 3 rows

			for (let i = 0; i < 4; i++) heights.push(50);
			grid.append(4);
			expect(grid.totalHeight).toBe(250); // 5 rows
		});

		test("setContainerWidth triggers relayout", () => {
			let containerWidth = 400;
			const grid = createGrid({
				count: 4,
				columns: 2,
				columnWidth: 200,
				gap: 0,
				getHeight: () => (containerWidth >= 400 ? 50 : 100),
			});
			expect(grid.totalHeight).toBe(100);

			containerWidth = 200;
			grid.setContainerWidth(200);
			expect(grid.totalHeight).toBe(200);
		});
	});

	describe("item dimensions", () => {
		test("items have correct width", () => {
			const grid = makeGrid([50, 50], 2, 250, 0);
			grid.setViewport(0, 200);
			const items = grid.getItems();
			expect(items[0]!.width).toBe(250);
			expect(items[1]!.width).toBe(250);
		});

		test("items have individual heights (not row height)", () => {
			const grid = makeGrid([30, 50], 2, 200, 0);
			grid.setViewport(0, 200);
			const items = grid.getItems();
			// getItems returns individual item heights, not row height
			expect(items[0]!.height).toBe(30);
			expect(items[1]!.height).toBe(50);
		});
	});
});
