import { describe, expect, test } from "bun:test";
import { createFlow } from "@preflow/core";

// useProse currently delegates to useFlow, so we test the same core logic
// it relies on. These tests will evolve once @preflow/prose is implemented.

describe("useProse logic (delegates to flow)", () => {
	test("creates flow instance for prose content", () => {
		const flow = createFlow({ count: 50, getHeight: () => 24 });
		expect(flow.totalHeight).toBe(1200);
	});

	test("setViewport computes visible range", () => {
		const flow = createFlow({ count: 200, getHeight: () => 24 });
		flow.setViewport(0, 600);
		const items = flow.getItems();
		expect(items.length).toBeGreaterThan(0);
		expect(items[0]!.height).toBe(24);
	});

	test("variable line heights work correctly", () => {
		const heights = [20, 40, 30, 50, 25];
		const flow = createFlow({
			count: 5,
			getHeight: (i) => heights[i]!,
		});
		expect(flow.totalHeight).toBe(165); // 20+40+30+50+25
	});

	test("scrollToIndex navigates to paragraph", () => {
		const flow = createFlow({ count: 100, getHeight: () => 24 });
		flow.setViewport(0, 600);
		expect(flow.scrollToIndex(50)).toBe(1200);
	});

	test("setCount handles dynamic content", () => {
		const flow = createFlow({ count: 10, getHeight: () => 24 });
		expect(flow.totalHeight).toBe(240);
		flow.setCount(20);
		expect(flow.totalHeight).toBe(480);
	});

	test("getItems returns correct y offsets for prose", () => {
		const heights = [30, 20, 40];
		const flow = createFlow({
			count: 3,
			getHeight: (i) => heights[i]!,
		});
		flow.setViewport(0, 500);
		const items = flow.getItems();
		expect(items[0]!.y).toBe(0);
		expect(items[1]!.y).toBe(30);
		expect(items[2]!.y).toBe(50);
	});

	test("scrollToEnd works for long documents", () => {
		const flow = createFlow({ count: 1000, getHeight: () => 24 });
		flow.setViewport(0, 600);
		expect(flow.scrollToEnd()).toBe(23400); // 24000 - 600
	});

	test("getItemOffset is consistent with getItems", () => {
		const flow = createFlow({ count: 100, getHeight: () => 24 });
		flow.setViewport(0, 600);
		const items = flow.getItems();
		for (const item of items) {
			expect(flow.getItemOffset(item.index)).toBe(item.y);
		}
	});
});
