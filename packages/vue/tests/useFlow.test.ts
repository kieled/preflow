import { describe, expect, test } from "bun:test";
import { createFlow } from "@preflow/core";

describe("useFlow composable logic", () => {
	test("flow instance creation with correct total height", () => {
		const flow = createFlow({ count: 50, getHeight: () => 40 });
		expect(flow.totalHeight).toBe(2000);
	});

	test("flow instance with zero items", () => {
		const flow = createFlow({ count: 0, getHeight: () => 40 });
		expect(flow.totalHeight).toBe(0);
		expect(flow.getItems()).toEqual([]);
	});

	test("viewport updates return items within visible range", () => {
		const flow = createFlow({ count: 100, getHeight: () => 50, overscan: 2 });
		flow.setViewport(0, 400);
		const items = flow.getItems();
		expect(items.length).toBeGreaterThan(0);
		expect(items[0]!.y).toBe(0);
		expect(items[0]!.index).toBe(0);
	});

	test("setViewport returns true when range changes", () => {
		const flow = createFlow({ count: 100, getHeight: () => 50 });
		const changed = flow.setViewport(0, 400);
		expect(changed).toBe(true);
	});

	test("setViewport returns false when range stays the same", () => {
		const flow = createFlow({ count: 100, getHeight: () => 50 });
		flow.setViewport(0, 400);
		const changed = flow.setViewport(0, 400);
		expect(changed).toBe(false);
	});

	test("scrollToIndex returns correct offset for start align", () => {
		const flow = createFlow({ count: 100, getHeight: () => 50 });
		flow.setViewport(0, 400);
		const offset = flow.scrollToIndex(10);
		expect(offset).toBe(500); // 10 * 50
	});

	test("scrollToIndex with center align", () => {
		const flow = createFlow({ count: 100, getHeight: () => 50 });
		flow.setViewport(0, 400);
		const offset = flow.scrollToIndex(10, "center");
		// itemOffset(500) - viewport/2(200) + itemHeight/2(25) = 325
		expect(offset).toBe(325);
	});

	test("scrollToIndex with end align", () => {
		const flow = createFlow({ count: 100, getHeight: () => 50 });
		flow.setViewport(0, 400);
		const offset = flow.scrollToIndex(10, "end");
		// itemOffset(500) - viewport(400) + itemHeight(50) = 150
		expect(offset).toBe(150);
	});

	test("scrollToEnd returns correct offset", () => {
		const flow = createFlow({ count: 100, getHeight: () => 50 });
		flow.setViewport(0, 400);
		const offset = flow.scrollToEnd();
		// totalHeight(5000) - viewport(400) = 4600
		expect(offset).toBe(4600);
	});

	test("setCount updates total height", () => {
		const flow = createFlow({ count: 50, getHeight: () => 40 });
		expect(flow.totalHeight).toBe(2000);
		flow.setCount(100);
		expect(flow.totalHeight).toBe(4000);
	});

	test("setCount to smaller value shrinks total height", () => {
		const flow = createFlow({ count: 100, getHeight: () => 40 });
		expect(flow.totalHeight).toBe(4000);
		flow.setCount(25);
		expect(flow.totalHeight).toBe(1000);
	});

	test("variable height items produce correct offsets", () => {
		const heights = [20, 30, 40, 50, 60];
		const flow = createFlow({
			count: 5,
			getHeight: (i) => heights[i]!,
		});
		expect(flow.totalHeight).toBe(200);
		expect(flow.getItemOffset(0)).toBe(0);
		expect(flow.getItemOffset(1)).toBe(20);
		expect(flow.getItemOffset(2)).toBe(50);
		expect(flow.getItemOffset(3)).toBe(90);
		expect(flow.getItemOffset(4)).toBe(140);
	});
});
