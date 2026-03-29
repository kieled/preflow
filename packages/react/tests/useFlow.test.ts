import { describe, expect, test } from "bun:test";
import { createFlow } from "@preflow/core";

describe("useFlow logic", () => {
	test("creates flow with correct total height", () => {
		const flow = createFlow({ count: 100, getHeight: () => 50 });
		expect(flow.totalHeight).toBe(5000);
	});

	test("initial visible range is empty before setViewport", () => {
		const flow = createFlow({ count: 100, getHeight: () => 50 });
		expect(flow.visibleRange.start).toBe(0);
		expect(flow.visibleRange.end).toBe(0);
	});

	test("setViewport returns true when range changes", () => {
		const flow = createFlow({ count: 100, getHeight: () => 50 });
		const changed = flow.setViewport(0, 400);
		expect(changed).toBe(true);
	});

	test("setViewport returns false when range does not change", () => {
		const flow = createFlow({ count: 100, getHeight: () => 50 });
		flow.setViewport(0, 400);
		const changed = flow.setViewport(0, 400);
		expect(changed).toBe(false);
	});

	test("getItems returns items within visible range", () => {
		const flow = createFlow({ count: 100, getHeight: () => 50 });
		flow.setViewport(0, 400);
		const items = flow.getItems();
		expect(items.length).toBeGreaterThan(0);
		expect(items[0]!.index).toBe(0);
		expect(items[0]!.y).toBe(0);
		expect(items[0]!.height).toBe(50);
	});

	test("items have correct sequential offsets", () => {
		const flow = createFlow({ count: 100, getHeight: () => 50 });
		flow.setViewport(0, 400);
		const items = flow.getItems();
		for (let i = 1; i < items.length; i++) {
			expect(items[i]!.y).toBe(items[i - 1]!.y + 50);
		}
	});

	test("scrollToIndex returns correct offset for start align", () => {
		const flow = createFlow({ count: 100, getHeight: () => 50 });
		flow.setViewport(0, 400);
		expect(flow.scrollToIndex(10)).toBe(500);
		expect(flow.scrollToIndex(0)).toBe(0);
		expect(flow.scrollToIndex(99)).toBe(4950);
	});

	test("scrollToIndex center alignment", () => {
		const flow = createFlow({ count: 100, getHeight: () => 50 });
		flow.setViewport(0, 400);
		// center = itemOffset - viewportHeight/2 + itemHeight/2
		// item 10: 500 - 200 + 25 = 325
		expect(flow.scrollToIndex(10, "center")).toBe(325);
	});

	test("scrollToIndex end alignment", () => {
		const flow = createFlow({ count: 100, getHeight: () => 50 });
		flow.setViewport(0, 400);
		// end = itemOffset - viewportHeight + itemHeight
		// item 10: 500 - 400 + 50 = 150
		expect(flow.scrollToIndex(10, "end")).toBe(150);
	});

	test("scrollToEnd returns offset to show last items", () => {
		const flow = createFlow({ count: 100, getHeight: () => 50 });
		flow.setViewport(0, 400);
		// totalHeight - viewport = 5000 - 400 = 4600
		expect(flow.scrollToEnd()).toBe(4600);
	});

	test("setCount updates total height", () => {
		const flow = createFlow({ count: 50, getHeight: () => 50 });
		expect(flow.totalHeight).toBe(2500);
		flow.setCount(100);
		expect(flow.totalHeight).toBe(5000);
	});

	test("setCount shrinks correctly", () => {
		const flow = createFlow({ count: 100, getHeight: () => 50 });
		flow.setCount(10);
		expect(flow.totalHeight).toBe(500);
	});
});
