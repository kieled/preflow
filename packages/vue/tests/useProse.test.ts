import { describe, expect, test } from "bun:test";
import { createFlow } from "@preflow/core";

describe("useProse composable logic (delegates to flow)", () => {
	test("prose delegates to flow - instance creation", () => {
		const flow = createFlow({ count: 30, getHeight: () => 20 });
		expect(flow.totalHeight).toBe(600);
	});

	test("prose delegates to flow - viewport and items", () => {
		const flow = createFlow({ count: 100, getHeight: () => 20, overscan: 2 });
		flow.setViewport(0, 200);
		const items = flow.getItems();
		expect(items.length).toBeGreaterThan(0);
		expect(items[0]!.index).toBe(0);
	});

	test("prose delegates to flow - scrollToIndex", () => {
		const flow = createFlow({ count: 100, getHeight: () => 20 });
		flow.setViewport(0, 200);
		const offset = flow.scrollToIndex(20);
		expect(offset).toBe(400);
	});

	test("prose delegates to flow - scrollToEnd", () => {
		const flow = createFlow({ count: 100, getHeight: () => 20 });
		flow.setViewport(0, 200);
		const offset = flow.scrollToEnd();
		expect(offset).toBe(1800);
	});

	test("prose delegates to flow - setCount", () => {
		const flow = createFlow({ count: 50, getHeight: () => 20 });
		expect(flow.totalHeight).toBe(1000);
		flow.setCount(75);
		expect(flow.totalHeight).toBe(1500);
	});

	test("prose delegates to flow - variable heights", () => {
		const heights = [15, 25, 35, 45];
		const flow = createFlow({
			count: 4,
			getHeight: (i) => heights[i]!,
		});
		expect(flow.totalHeight).toBe(120);
		expect(flow.getItemOffset(2)).toBe(40);
	});

	test("prose delegates to flow - setContainerWidth triggers relayout", () => {
		const flow = createFlow({ count: 10, getHeight: () => 20 });
		flow.setViewport(0, 100);
		const itemsBefore = flow.getItems();
		flow.setContainerWidth(500);
		const itemsAfter = flow.getItems();
		// Items should still be valid after width change
		expect(itemsAfter.length).toBeGreaterThan(0);
		expect(itemsBefore.length).toBe(itemsAfter.length);
	});

	test("prose delegates to flow - append adds items", () => {
		const flow = createFlow({ count: 10, getHeight: () => 20 });
		expect(flow.totalHeight).toBe(200);
		flow.append(5);
		expect(flow.totalHeight).toBe(300);
	});
});
