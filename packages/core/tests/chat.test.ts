import { describe, expect, test } from "bun:test";
import { createChat } from "../src/chat";

describe("createChat", () => {
	function makeChat(heights: number[], overscan = 5) {
		return createChat({
			count: heights.length,
			getHeight: (i) => heights[i]!,
			overscan,
		});
	}

	describe("basic properties", () => {
		test("totalHeight is sum of all message heights", () => {
			const chat = makeChat([50, 60, 70, 80]);
			expect(chat.totalHeight).toBe(260);
		});

		test("empty chat has zero height", () => {
			const chat = makeChat([]);
			expect(chat.totalHeight).toBe(0);
		});

		test("getItemOffset is exact", () => {
			const chat = makeChat([50, 60, 70]);
			expect(chat.getItemOffset(0)).toBe(0);
			expect(chat.getItemOffset(1)).toBe(50);
			expect(chat.getItemOffset(2)).toBe(110);
		});
	});

	describe("scrollToEnd (bottom anchoring)", () => {
		test("returns correct offset", () => {
			const chat = makeChat(Array(100).fill(50));
			chat.setViewport(0, 400);
			// Total = 5000. scrollToEnd = 5000 - 400 = 4600
			expect(chat.scrollToEnd()).toBe(4600);
		});

		test("returns 0 when content fits viewport", () => {
			const chat = makeChat([50, 60]);
			chat.setViewport(0, 500);
			expect(chat.scrollToEnd()).toBe(0);
		});

		test("scrollToEnd updates visible range to show last items", () => {
			const chat = makeChat(Array(100).fill(50), 0);
			chat.setViewport(0, 400);
			chat.scrollToEnd();

			const items = chat.getItems();
			const lastItem = items[items.length - 1]!;
			expect(lastItem.index).toBe(99);
		});
	});

	describe("append (new messages)", () => {
		test("new messages increase totalHeight", () => {
			const heights = [50, 60, 70];
			const chat = createChat({
				count: 3,
				getHeight: (i) => heights[i]!,
			});
			expect(chat.totalHeight).toBe(180);

			heights.push(80, 90);
			chat.append(2);
			expect(chat.totalHeight).toBe(350);
		});

		test("stays at bottom when new messages arrive (isAtBottom)", () => {
			const heights = Array(20).fill(50);
			const chat = createChat({
				count: 20,
				getHeight: (i) => heights[i]!,
			});

			// Position at very bottom
			const endOffset = chat.scrollToEnd();
			chat.setViewport(endOffset, 400);

			// Append new messages
			heights.push(50, 50, 50);
			chat.append(3);

			// Should auto-follow to bottom
			const items = chat.getItems();
			const indices = items.map((i) => i.index);
			expect(indices).toContain(22); // last item
		});

		test("does not scroll when user is reading history", () => {
			const heights = Array(100).fill(50);
			const chat = createChat({
				count: 100,
				getHeight: (i) => heights[i]!,
			});

			// Scroll to middle (not at bottom)
			chat.setViewport(1000, 400);
			const rangeBefore = { ...chat.visibleRange };

			// Append new messages
			heights.push(50, 50, 50);
			chat.append(3);

			// Visible range should not jump
			expect(chat.visibleRange.start).toBe(rangeBefore.start);
		});
	});

	describe("prepend (loading history)", () => {
		test("returns exact scroll correction", () => {
			// Start with 5 messages
			const allHeights = [40, 60, 50, 70, 80, 30, 40, 50];
			let offset = 3; // first 3 items are prepended later

			const chat = createChat({
				count: 5,
				getHeight: (i) => allHeights[i + offset]!,
			});
			chat.setViewport(100, 400);

			// Now prepend 3 items — update offset so getHeight sees all 8
			offset = 0;
			const correction = chat.prepend(3);

			// Correction should be sum of prepended item heights: 40 + 60 + 50 = 150
			expect(correction.offset).toBe(150);
		});

		test("prepend increases totalHeight", () => {
			const allHeights = [100, 200, 50, 60, 70];
			let offset = 2;

			const chat = createChat({
				count: 3,
				getHeight: (i) => allHeights[i + offset]!,
			});
			const heightBefore = chat.totalHeight;

			offset = 0;
			chat.prepend(2);
			expect(chat.totalHeight).toBe(heightBefore + 300);
		});

		test("multiple prepends accumulate correctly", () => {
			const allHeights = [10, 20, 30, 40, 50, 60, 70, 80];
			let offset = 4;

			const chat = createChat({
				count: 4,
				getHeight: (i) => allHeights[i + offset]!,
			});
			chat.setViewport(0, 400);

			// First prepend: 2 items
			offset = 2;
			const c1 = chat.prepend(2);
			expect(c1.offset).toBe(70); // 30 + 40

			// Second prepend: 2 more items
			offset = 0;
			const c2 = chat.prepend(2);
			expect(c2.offset).toBe(30); // 10 + 20
		});
	});

	describe("scrollToIndex", () => {
		test("jumps to exact message offset", () => {
			const chat = makeChat([50, 60, 70, 80, 90]);
			chat.setViewport(0, 300);

			expect(chat.scrollToIndex(0)).toBe(0);
			expect(chat.scrollToIndex(1)).toBe(50);
			expect(chat.scrollToIndex(2)).toBe(110);
			expect(chat.scrollToIndex(3)).toBe(180);
			expect(chat.scrollToIndex(4)).toBe(260);
		});

		test("align=end shows message at bottom of viewport", () => {
			const chat = makeChat(Array(50).fill(50));
			chat.setViewport(0, 400);
			// Item 25 at offset 1250. End: 1250 - 400 + 50 = 900
			expect(chat.scrollToIndex(25, "end")).toBe(900);
		});
	});

	describe("setContainerWidth", () => {
		test("relayout stays at bottom if was at bottom", () => {
			let w = 300;
			const chat = createChat({
				count: 50,
				getHeight: () => (w >= 300 ? 50 : 100),
			});
			const endOffset = chat.scrollToEnd();
			chat.setViewport(endOffset, 400);

			// Resize to narrower (messages get taller)
			w = 150;
			chat.setContainerWidth(150);

			// Should still be at bottom
			const items = chat.getItems();
			const indices = items.map((i) => i.index);
			expect(indices).toContain(49);
		});

		test("relayout preserves position if not at bottom", () => {
			let w = 300;
			const chat = createChat({
				count: 100,
				getHeight: () => (w >= 300 ? 50 : 100),
			});

			// Scroll to middle
			chat.setViewport(1000, 400);

			// The range should have items around scroll position 1000
			const rangeBefore = { ...chat.visibleRange };

			w = 300; // same width, just trigger relayout
			chat.setContainerWidth(300);

			// Should not jump to bottom
			expect(chat.visibleRange.start).toBeLessThanOrEqual(rangeBefore.start + 1);
		});
	});

	describe("setCount", () => {
		test("increasing count (new messages) follows bottom", () => {
			const heights = Array(20).fill(50);
			const chat = createChat({
				count: 20,
				getHeight: (i) => heights[i]!,
			});

			// Go to bottom
			const end = chat.scrollToEnd();
			chat.setViewport(end, 400);

			// Add messages via setCount
			heights.push(50, 50, 50);
			chat.setCount(23);

			const items = chat.getItems();
			expect(items.some((i) => i.index === 22)).toBe(true);
		});

		test("decreasing count shrinks", () => {
			const chat = makeChat(Array(20).fill(50));
			expect(chat.totalHeight).toBe(1000);
			chat.setCount(10);
			expect(chat.totalHeight).toBe(500);
		});
	});

	describe("edge cases", () => {
		test("single message", () => {
			const chat = makeChat([100]);
			chat.setViewport(0, 400);
			expect(chat.totalHeight).toBe(100);
			expect(chat.getItems().length).toBe(1);
		});

		test("viewport taller than content", () => {
			const chat = makeChat([30, 40, 50]);
			chat.setViewport(0, 1000);
			expect(chat.getItems().length).toBe(3);
			expect(chat.scrollToEnd()).toBe(0);
		});

		test("very long message list (10k)", () => {
			const heights = Array.from({ length: 10000 }, (_, i) => 40 + (i % 10) * 8);
			const chat = createChat({
				count: 10000,
				getHeight: (i) => heights[i]!,
			});

			const end = chat.scrollToEnd();
			chat.setViewport(end, 600);

			const items = chat.getItems();
			expect(items.length).toBeGreaterThan(0);
			expect(items[items.length - 1]!.index).toBe(9999);
		});
	});

	describe("isAtBottom tracking", () => {
		test("starts at bottom by default (before any setViewport)", () => {
			const heights = Array(20).fill(50);
			const chat = createChat({
				count: 20,
				getHeight: (i) => heights[i]!,
			});

			// Append without ever scrolling
			heights.push(50);
			chat.append(1);

			// totalHeight should increase and chat should follow
			expect(chat.totalHeight).toBe(1050);
		});

		test("scrolling away from bottom disables auto-follow", () => {
			const heights = Array(50).fill(50);
			const chat = createChat({
				count: 50,
				getHeight: (i) => heights[i]!,
			});
			chat.setViewport(chat.scrollToEnd(), 400);

			// Scroll up
			chat.setViewport(500, 400);

			// Append — should NOT follow
			heights.push(50);
			chat.append(1);

			const items = chat.getItems();
			const indices = items.map((i) => i.index);
			expect(indices).not.toContain(50);
		});

		test("scrolling back to bottom re-enables auto-follow", () => {
			const heights = Array(50).fill(50);
			const chat = createChat({
				count: 50,
				getHeight: (i) => heights[i]!,
			});

			// Start at bottom
			chat.setViewport(chat.scrollToEnd(), 400);
			// Scroll up
			chat.setViewport(500, 400);
			// Scroll back to bottom
			const end = chat.scrollToEnd();
			chat.setViewport(end, 400);

			// Append — should follow
			heights.push(50);
			chat.append(1);

			const items = chat.getItems();
			const indices = items.map((i) => i.index);
			expect(indices).toContain(50);
		});
	});
});
