import { describe, expect, test } from "bun:test";
import { createMasonry } from "../src/masonry";

describe("createMasonry", () => {
	function makeMasonry(
		heights: number[],
		columns: number,
		columnWidth = 200,
		gap = 10,
		overscan = 3,
	) {
		return createMasonry({
			count: heights.length,
			columns,
			columnWidth,
			gap,
			getHeight: (i) => heights[i]!,
			overscan,
		});
	}

	describe("shortest-column placement", () => {
		test("first N items go into N columns", () => {
			const masonry = makeMasonry([50, 60, 40], 3, 200, 10);
			masonry.setViewport(0, 1000);
			const items = masonry.getItems();

			// First 3 items should each be in a different column
			const xs = items.slice(0, 3).map((i) => i.x);
			expect(new Set(xs).size).toBe(3);

			// All start at y=0
			expect(items[0]!.y).toBe(0);
			expect(items[1]!.y).toBe(0);
			expect(items[2]!.y).toBe(0);
		});

		test("4th item goes into shortest column", () => {
			// Heights: 100, 50, 70 → column heights: 100, 50, 70
			// Shortest is column 1 (height 50). Item 3 goes there.
			const masonry = makeMasonry([100, 50, 70, 30], 3, 200, 10);
			masonry.setViewport(0, 1000);
			const items = masonry.getItems();

			// Item 3 should be in same column as item 1 (shortest)
			expect(items[3]!.x).toBe(items[1]!.x);
			// Item 3 y should be: item 1 height + gap = 50 + 10 = 60
			expect(items[3]!.y).toBe(60);
		});

		test("2 columns with varying heights", () => {
			// Items: 100, 40, 60, 50
			// Step 1: col0=100, col1=40
			// Step 2 (item 2, h=60): shortest is col1(40), place at y=40. col1 = 40+60+10 = 110
			// Step 3 (item 3, h=50): shortest is col0(100+10), place at y=100+10=110. col0 = 110+50+10 = 170
			const masonry = makeMasonry([100, 40, 60, 50], 2, 200, 10);
			masonry.setViewport(0, 1000);
			const items = masonry.getItems();

			expect(items[0]!.x).toBe(0); // col 0
			expect(items[0]!.y).toBe(0);

			expect(items[1]!.x).toBe(210); // col 1
			expect(items[1]!.y).toBe(0);

			expect(items[2]!.x).toBe(210); // col 1 (shorter)
			expect(items[2]!.y).toBe(50); // 40 + 10 gap

			expect(items[3]!.x).toBe(0); // col 0 (now shorter: 100+10=110 vs 110)
			// col0 = 100+10 = 110, col1 = 40+10+60 = 110. Tie → col 0 wins (first found)
			expect(items[3]!.y).toBe(110);
		});
	});

	describe("totalHeight", () => {
		test("is max column height minus trailing gap", () => {
			const masonry = makeMasonry([100, 50], 2, 200, 10);
			// Col 0: 100. Col 1: 50. Max = 100. (no trailing gap subtraction for single items)
			expect(masonry.totalHeight).toBe(100);
		});

		test("empty masonry has zero height", () => {
			const masonry = makeMasonry([], 2, 200, 10);
			expect(masonry.totalHeight).toBe(0);
		});

		test("single column is sum of heights + gaps", () => {
			const masonry = makeMasonry([10, 20, 30], 1, 200, 10);
			// col starts at 0. item0: 0+10+10=20, item1: 20+20+10=50, item2: 50+30+10=90
			// adjusted = 90-10 = 80 (last trailing gap removed)
			expect(masonry.totalHeight).toBe(80);
		});
	});

	describe("visibility", () => {
		test("only items in viewport are returned", () => {
			const heights = Array(100).fill(50);
			const masonry = makeMasonry(heights, 3, 200, 10, 0);
			masonry.setViewport(0, 200);
			const items = masonry.getItems();

			// All items should be within viewport + small buffer
			for (const item of items) {
				const bottom = item.y + item.height;
				expect(bottom).toBeGreaterThanOrEqual(0);
				expect(item.y).toBeLessThanOrEqual(200);
			}
		});

		test("scrolling reveals different items", () => {
			const heights = Array(100).fill(50);
			const masonry = makeMasonry(heights, 3, 200, 10, 0);

			masonry.setViewport(0, 200);
			const topItems = masonry.getItems().map((i) => i.index);

			masonry.setViewport(500, 200);
			const midItems = masonry.getItems().map((i) => i.index);

			// Should be different sets
			const overlap = topItems.filter((i) => midItems.includes(i));
			expect(overlap.length).toBeLessThan(topItems.length);
		});
	});

	describe("scrollToIndex", () => {
		test("returns y position of item", () => {
			const masonry = makeMasonry([100, 50, 70, 30, 90, 60], 3, 200, 10);
			masonry.setViewport(0, 500);

			// Item 0 is at y=0
			expect(masonry.scrollToIndex(0)).toBe(0);

			// Item 3 is in the shortest column after first 3
			const offset = masonry.scrollToIndex(3);
			expect(offset).toBeGreaterThan(0);
		});

		test("align=center", () => {
			const masonry = makeMasonry(Array(20).fill(50), 2, 200, 10);
			masonry.setViewport(0, 400);

			const offset = masonry.scrollToIndex(10, "center");
			const itemY = masonry.getItemOffset(10);
			const itemH = masonry.getItemHeight(10);
			expect(offset).toBe(itemY - 200 + itemH / 2);
		});
	});

	describe("mutations", () => {
		test("setCount recomputes placement", () => {
			const heights = Array(20).fill(50);
			const masonry = makeMasonry(heights, 2, 200, 10);
			const h1 = masonry.totalHeight;

			masonry.setCount(10);
			expect(masonry.totalHeight).toBeLessThan(h1);
		});

		test("append adds items to layout", () => {
			const heights = Array(10).fill(50);
			const masonry = createMasonry({
				count: 6,
				columns: 2,
				columnWidth: 200,
				gap: 10,
				getHeight: (i) => heights[i]!,
			});
			const h1 = masonry.totalHeight;

			masonry.append(4);
			expect(masonry.totalHeight).toBeGreaterThan(h1);
		});

		test("prepend returns scroll correction", () => {
			const heights = Array(10).fill(50);
			const masonry = createMasonry({
				count: 6,
				columns: 2,
				columnWidth: 200,
				gap: 10,
				getHeight: (i) => heights[i]!,
			});
			masonry.setViewport(100, 300);

			const correction = masonry.prepend(4);
			expect(correction.offset).toBeGreaterThan(0);
		});
	});

	describe("item dimensions", () => {
		test("items have correct columnWidth", () => {
			const masonry = makeMasonry([50, 50, 50], 3, 250, 10);
			masonry.setViewport(0, 500);
			const items = masonry.getItems();
			for (const item of items) {
				expect(item.width).toBe(250);
			}
		});

		test("items have individual heights", () => {
			const masonry = makeMasonry([30, 50, 70], 3, 200, 10);
			masonry.setViewport(0, 500);
			const items = masonry.getItems();
			expect(items[0]!.height).toBe(30);
			expect(items[1]!.height).toBe(50);
			expect(items[2]!.height).toBe(70);
		});
	});

	describe("stress", () => {
		test("1000 items in 4 columns", () => {
			const heights = Array.from({ length: 1000 }, (_, i) => 30 + (i % 5) * 20);
			const masonry = makeMasonry(heights, 4, 200, 10, 3);

			expect(masonry.totalHeight).toBeGreaterThan(0);

			// Scroll through
			masonry.setViewport(0, 600);
			expect(masonry.getItems().length).toBeGreaterThan(0);

			masonry.setViewport(masonry.totalHeight / 2, 600);
			expect(masonry.getItems().length).toBeGreaterThan(0);

			masonry.setViewport(masonry.totalHeight - 600, 600);
			expect(masonry.getItems().length).toBeGreaterThan(0);
		});
	});
});
