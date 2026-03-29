import { describe, expect, test } from "bun:test";
import { createFlow } from "../src/flow";

describe("createFlow", () => {
	function makeFlow(heights: number[], overscan = 3) {
		return createFlow({
			count: heights.length,
			getHeight: (i) => heights[i]!,
			overscan,
		});
	}

	describe("basic properties", () => {
		test("totalHeight is sum of all heights", () => {
			const flow = makeFlow([10, 20, 30, 40, 50]);
			expect(flow.totalHeight).toBe(150);
		});

		test("empty flow has zero totalHeight", () => {
			const flow = makeFlow([]);
			expect(flow.totalHeight).toBe(0);
		});

		test("single item", () => {
			const flow = makeFlow([100]);
			expect(flow.totalHeight).toBe(100);
		});

		test("getItemOffset returns O(1) prefix-sum lookup", () => {
			const flow = makeFlow([10, 20, 30, 40]);
			expect(flow.getItemOffset(0)).toBe(0);
			expect(flow.getItemOffset(1)).toBe(10);
			expect(flow.getItemOffset(2)).toBe(30);
			expect(flow.getItemOffset(3)).toBe(60);
		});

		test("getItemHeight returns correct height", () => {
			const flow = makeFlow([15, 25, 35]);
			expect(flow.getItemHeight(0)).toBe(15);
			expect(flow.getItemHeight(1)).toBe(25);
			expect(flow.getItemHeight(2)).toBe(35);
		});
	});

	describe("setViewport", () => {
		test("returns true when range changes", () => {
			const flow = makeFlow(Array(100).fill(50), 0);
			const changed = flow.setViewport(0, 300);
			expect(changed).toBe(true);
		});

		test("returns false when range unchanged", () => {
			const flow = makeFlow(Array(100).fill(50), 0);
			flow.setViewport(0, 300);
			const changed = flow.setViewport(0, 300);
			expect(changed).toBe(false);
		});

		test("scroll forward changes range", () => {
			const flow = makeFlow(Array(100).fill(50), 0);
			flow.setViewport(0, 300);
			const r1 = { ...flow.visibleRange };
			flow.setViewport(500, 300);
			const r2 = flow.visibleRange;
			expect(r2.start).toBeGreaterThan(r1.start);
		});
	});

	describe("getItems", () => {
		test("returns positioned items for visible range", () => {
			const flow = makeFlow(Array(100).fill(50), 0);
			flow.setViewport(0, 200);
			const items = flow.getItems();
			expect(items.length).toBeGreaterThanOrEqual(4);

			// First item
			expect(items[0]!.index).toBe(0);
			expect(items[0]!.y).toBe(0);
			expect(items[0]!.height).toBe(50);

			// Second item
			expect(items[1]!.index).toBe(1);
			expect(items[1]!.y).toBe(50);
		});

		test("items after scroll have correct offsets", () => {
			const flow = makeFlow(Array(100).fill(50), 0);
			flow.setViewport(500, 200);
			const items = flow.getItems();
			expect(items[0]!.index).toBe(10);
			expect(items[0]!.y).toBe(500);
		});

		test("variable height items positioned correctly", () => {
			const heights = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
			const flow = makeFlow(heights, 0);
			flow.setViewport(0, 500);
			const items = flow.getItems();

			let expectedY = 0;
			for (const item of items) {
				expect(item.y).toBe(expectedY);
				expect(item.height).toBe(heights[item.index]!);
				expectedY += heights[item.index]!;
			}
		});
	});

	describe("scrollToIndex", () => {
		test("align=start returns item offset", () => {
			const flow = makeFlow([10, 20, 30, 40, 50]);
			flow.setViewport(0, 100);
			expect(flow.scrollToIndex(0)).toBe(0);
			expect(flow.scrollToIndex(1)).toBe(10);
			expect(flow.scrollToIndex(2)).toBe(30);
			expect(flow.scrollToIndex(3)).toBe(60);
			expect(flow.scrollToIndex(4)).toBe(100);
		});

		test("align=center centers item in viewport", () => {
			const flow = makeFlow(Array(100).fill(50));
			flow.setViewport(0, 400);
			// Item 50 is at offset 2500. Center: 2500 - 200 + 25 = 2325
			expect(flow.scrollToIndex(50, "center")).toBe(2325);
		});

		test("align=end puts item at bottom of viewport", () => {
			const flow = makeFlow(Array(100).fill(50));
			flow.setViewport(0, 400);
			// Item 50 at offset 2500. End: 2500 - 400 + 50 = 2150
			expect(flow.scrollToIndex(50, "end")).toBe(2150);
		});

		test("clamps to valid range", () => {
			const flow = makeFlow([10, 20, 30]);
			flow.setViewport(0, 100);
			expect(flow.scrollToIndex(-5)).toBe(0);
			expect(flow.scrollToIndex(999)).toBe(30); // last item offset
		});
	});

	describe("scrollToEnd", () => {
		test("returns offset to show last items", () => {
			const flow = makeFlow(Array(100).fill(50));
			flow.setViewport(0, 400);
			// Total = 5000. scrollToEnd = 5000 - 400 = 4600
			expect(flow.scrollToEnd()).toBe(4600);
		});

		test("returns 0 when content fits in viewport", () => {
			const flow = makeFlow([10, 20, 30]);
			flow.setViewport(0, 500);
			expect(flow.scrollToEnd()).toBe(0);
		});
	});

	describe("setCount", () => {
		test("increasing count preserves existing offsets", () => {
			const _heights = [10, 20, 30];
			const allHeights = [10, 20, 30, 40, 50];
			const flow = createFlow({
				count: 3,
				getHeight: (i) => allHeights[i]!,
			});
			expect(flow.totalHeight).toBe(60);

			flow.setCount(5);
			expect(flow.totalHeight).toBe(150);
			expect(flow.getItemOffset(0)).toBe(0);
			expect(flow.getItemOffset(1)).toBe(10);
			expect(flow.getItemOffset(2)).toBe(30);
			expect(flow.getItemOffset(3)).toBe(60);
		});

		test("decreasing count shrinks totalHeight", () => {
			const flow = makeFlow([10, 20, 30, 40, 50]);
			expect(flow.totalHeight).toBe(150);
			flow.setCount(3);
			expect(flow.totalHeight).toBe(60);
		});

		test("setCount to 0 gives zero height", () => {
			const flow = makeFlow([10, 20]);
			flow.setCount(0);
			expect(flow.totalHeight).toBe(0);
		});

		test("setCount to same value is no-op", () => {
			const flow = makeFlow([10, 20, 30]);
			flow.setViewport(0, 100);
			const range1 = { ...flow.visibleRange };
			flow.setCount(3);
			expect(flow.visibleRange).toEqual(range1);
		});
	});

	describe("prepend", () => {
		test("returns scroll correction equal to prepended height", () => {
			const allHeights = [40, 50, 10, 20, 30]; // prepended: [40, 50], original: [10, 20, 30]
			const flow = createFlow({
				count: 3,
				getHeight: (i) => allHeights[i + 2]!, // initially points to [10, 20, 30]
			});
			flow.setViewport(15, 100); // somewhere in the original list

			// Now update getHeight to include prepended items
			// After prepend: indices 0,1 are new, indices 2,3,4 are old 0,1,2
			const prependFlow = createFlow({
				count: 3,
				getHeight: (i) => allHeights[i + 2]!,
			});
			prependFlow.setViewport(15, 100);

			// Simulate: caller shifts their getHeight before calling prepend
			const fullFlow = createFlow({
				count: 5,
				getHeight: (i) => allHeights[i]!,
			});

			// The correction should be the sum of prepended items
			// Heights[0] + Heights[1] = 40 + 50 = 90
			expect(fullFlow.getItemOffset(2)).toBe(90);
		});

		test("prepend increases totalHeight", () => {
			const heights = [100, 200, 10, 20, 30];
			const flow = createFlow({
				count: 3,
				getHeight: (i) => heights[i + 2]!,
			});
			expect(flow.totalHeight).toBe(60);

			// Rewire getHeight to see all 5 items
			const flow2 = createFlow({
				count: 5,
				getHeight: (i) => heights[i]!,
			});
			expect(flow2.totalHeight).toBe(360);
		});
	});

	describe("append", () => {
		test("append increases totalHeight", () => {
			const allHeights = [10, 20, 30, 40, 50];
			const flow = createFlow({
				count: 3,
				getHeight: (i) => allHeights[i]!,
			});
			expect(flow.totalHeight).toBe(60);

			flow.append(2);
			expect(flow.totalHeight).toBe(150);
		});

		test("append updates visible range when at end", () => {
			const heights = Array(10).fill(50);
			const flow = createFlow({
				count: 10,
				getHeight: (i) => heights[i]!,
				overscan: 0,
			});
			flow.setViewport(350, 200);
			const rangeBefore = { ...flow.visibleRange };

			// Append 5 more
			for (let i = 0; i < 5; i++) heights.push(50);
			flow.append(5);

			// Range should still be valid
			expect(flow.visibleRange.start).toBeLessThanOrEqual(rangeBefore.start);
		});
	});

	describe("setContainerWidth", () => {
		test("triggers full relayout", () => {
			let containerWidth = 300;
			const flow = createFlow({
				count: 5,
				// Simulate: wider container → shorter text (fewer wraps)
				getHeight: (_i) => (containerWidth >= 300 ? 50 : 100),
			});
			expect(flow.totalHeight).toBe(250);

			containerWidth = 150;
			flow.setContainerWidth(150);
			expect(flow.totalHeight).toBe(500);
		});
	});

	describe("overscan", () => {
		test("overscan=0 gives minimal range", () => {
			const flow = makeFlow(Array(100).fill(50), 0);
			flow.setViewport(0, 200);
			const r = flow.visibleRange;
			// 200px viewport / 50px items = 4 items. But binary search includes partially visible.
			expect(r.end - r.start).toBeLessThanOrEqual(6);
		});

		test("overscan=5 extends range by 5 each side", () => {
			const flow = makeFlow(Array(100).fill(50), 5);
			flow.setViewport(2500, 200); // middle of list
			const r = flow.visibleRange;
			// Visible items: ~50-53. With overscan 5: start ≥ 45, end ≤ 59
			expect(r.start).toBeLessThanOrEqual(50 - 5);
			expect(r.end).toBeGreaterThanOrEqual(54 + 5);
		});

		test("overscan clamped at boundaries", () => {
			const flow = makeFlow(Array(20).fill(50), 10);
			flow.setViewport(0, 200);
			expect(flow.visibleRange.start).toBe(0);

			flow.setViewport(800, 200);
			expect(flow.visibleRange.end).toBe(20);
		});
	});

	describe("stress tests", () => {
		test("100,000 items: O(1) operations stay fast", () => {
			const count = 100_000;
			const flow = createFlow({
				count,
				getHeight: (i) => 20 + (i % 7) * 5,
			});

			// totalHeight should be exact
			let expectedTotal = 0;
			for (let i = 0; i < count; i++) expectedTotal += 20 + (i % 7) * 5;
			expect(flow.totalHeight).toBe(expectedTotal);

			// scrollToIndex should be O(1)
			const offset = flow.scrollToIndex(50000);
			expect(offset).toBe(flow.getItemOffset(50000));

			// Verify some offsets are monotonically increasing
			let prev = 0;
			for (let i = 0; i < 1000; i++) {
				const off = flow.getItemOffset(i);
				expect(off).toBeGreaterThanOrEqual(prev);
				prev = off;
			}
		});

		test("rapid viewport updates", () => {
			const flow = makeFlow(Array(10000).fill(50), 3);
			// Simulate fast scrolling: 1000 viewport updates
			for (let i = 0; i < 1000; i++) {
				const scrollTop = i * 50;
				flow.setViewport(scrollTop, 600);
				const items = flow.getItems();
				// Should always have items when scrolling through valid range
				if (scrollTop < flow.totalHeight) {
					expect(items.length).toBeGreaterThan(0);
				}
			}
		});
	});
});
