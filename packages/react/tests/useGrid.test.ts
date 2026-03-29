import { describe, expect, test } from "bun:test";
import { createGrid } from "@preflow/core";

describe("useGrid logic", () => {
	test("creates grid with correct total height", () => {
		// 12 items, 3 columns = 4 rows, each row height 50
		const flow = createGrid({ count: 12, columns: 3, columnWidth: 100, getHeight: () => 50 });
		expect(flow.totalHeight).toBe(200);
	});

	test("handles incomplete last row", () => {
		// 10 items, 3 columns = 4 rows (last row has 1 item)
		const flow = createGrid({ count: 10, columns: 3, columnWidth: 100, getHeight: () => 50 });
		expect(flow.totalHeight).toBe(200);
	});

	test("setViewport returns true on first call", () => {
		const flow = createGrid({ count: 30, columns: 3, columnWidth: 100, getHeight: () => 50 });
		const changed = flow.setViewport(0, 200);
		expect(changed).toBe(true);
	});

	test("getItems positions items in columns", () => {
		const flow = createGrid({
			count: 9,
			columns: 3,
			columnWidth: 100,
			gap: 10,
			getHeight: () => 50,
		});
		flow.setViewport(0, 500);
		const items = flow.getItems();
		expect(items.length).toBe(9);

		// First row: items 0,1,2 at x=0, 110, 220
		expect(items[0]!.x).toBe(0);
		expect(items[1]!.x).toBe(110);
		expect(items[2]!.x).toBe(220);

		// All first row at y=0
		expect(items[0]!.y).toBe(0);
		expect(items[1]!.y).toBe(0);
		expect(items[2]!.y).toBe(0);
	});

	test("items have correct column widths", () => {
		const flow = createGrid({ count: 6, columns: 3, columnWidth: 120, getHeight: () => 50 });
		flow.setViewport(0, 500);
		const items = flow.getItems();
		for (const item of items) {
			expect(item.width).toBe(120);
		}
	});

	test("scrollToIndex returns row offset", () => {
		const flow = createGrid({ count: 30, columns: 3, columnWidth: 100, getHeight: () => 50 });
		flow.setViewport(0, 200);
		// Item 6 is in row 2 (0-indexed), offset = row0(50) + row1(50) = 100
		expect(flow.scrollToIndex(6)).toBe(100);
	});

	test("gap between rows is included in total height", () => {
		const flow = createGrid({
			count: 6,
			columns: 3,
			columnWidth: 100,
			gap: 10,
			getHeight: () => 50,
		});
		// 2 rows: row0=50, row1=50+10(gap)=60 => total = 110
		expect(flow.totalHeight).toBe(110);
	});

	test("setCount updates row count", () => {
		const flow = createGrid({ count: 6, columns: 3, columnWidth: 100, getHeight: () => 50 });
		expect(flow.totalHeight).toBe(100); // 2 rows * 50
		flow.setCount(9);
		expect(flow.totalHeight).toBe(150); // 3 rows * 50
	});

	test("scrollToEnd returns correct offset", () => {
		const flow = createGrid({ count: 30, columns: 3, columnWidth: 100, getHeight: () => 50 });
		flow.setViewport(0, 200);
		// 10 rows * 50 = 500; 500 - 200 = 300
		expect(flow.scrollToEnd()).toBe(300);
	});

	test("append adds items and updates total height", () => {
		const flow = createGrid({ count: 6, columns: 3, columnWidth: 100, getHeight: () => 50 });
		expect(flow.totalHeight).toBe(100); // 2 rows
		flow.append(3);
		expect(flow.totalHeight).toBe(150); // 3 rows
	});

	test("visibleRange converts row range to item range", () => {
		const flow = createGrid({ count: 30, columns: 3, columnWidth: 100, getHeight: () => 50 });
		flow.setViewport(0, 200);
		const range = flow.visibleRange;
		// Item range should be multiples of columns
		expect(range.start % 3).toBe(0);
	});
});
