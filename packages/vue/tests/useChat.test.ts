import { describe, expect, test } from "bun:test";
import { createChat } from "@preflow/core";

describe("useChat composable logic", () => {
	test("chat instance creation with correct total height", () => {
		const chat = createChat({ count: 20, getHeight: () => 40 });
		expect(chat.totalHeight).toBe(800);
	});

	test("chat with zero items", () => {
		const chat = createChat({ count: 0, getHeight: () => 40 });
		expect(chat.totalHeight).toBe(0);
		expect(chat.getItems()).toEqual([]);
	});

	test("viewport updates return visible items", () => {
		const chat = createChat({ count: 50, getHeight: () => 40, overscan: 2 });
		chat.setViewport(0, 400);
		const items = chat.getItems();
		expect(items.length).toBeGreaterThan(0);
	});

	test("scrollToEnd returns correct offset", () => {
		const chat = createChat({ count: 50, getHeight: () => 40 });
		chat.setViewport(0, 400);
		const offset = chat.scrollToEnd();
		// totalHeight(2000) - viewport(400) = 1600
		expect(offset).toBe(1600);
	});

	test("append increases total height", () => {
		const chat = createChat({ count: 10, getHeight: () => 40 });
		expect(chat.totalHeight).toBe(400);
		chat.append(5);
		expect(chat.totalHeight).toBe(600);
	});

	test("prepend increases total height and returns correction", () => {
		const chat = createChat({ count: 10, getHeight: () => 40 });
		expect(chat.totalHeight).toBe(400);
		const correction = chat.prepend(5);
		expect(chat.totalHeight).toBe(600);
		expect(correction.offset).toBe(200); // 5 * 40
	});

	test("setCount updates total height", () => {
		const chat = createChat({ count: 10, getHeight: () => 40 });
		expect(chat.totalHeight).toBe(400);
		chat.setCount(20);
		expect(chat.totalHeight).toBe(800);
	});

	test("scrollToIndex with start align", () => {
		const chat = createChat({ count: 50, getHeight: () => 40 });
		chat.setViewport(0, 400);
		const offset = chat.scrollToIndex(5);
		expect(offset).toBe(200); // 5 * 40
	});

	test("scrollToIndex with center align", () => {
		const chat = createChat({ count: 50, getHeight: () => 40 });
		chat.setViewport(0, 400);
		const offset = chat.scrollToIndex(10, "center");
		// itemOffset(400) - viewport/2(200) + itemHeight/2(20) = 220
		expect(offset).toBe(220);
	});

	test("scrollToIndex with end align", () => {
		const chat = createChat({ count: 50, getHeight: () => 40 });
		chat.setViewport(0, 400);
		const offset = chat.scrollToIndex(10, "end");
		// itemOffset(400) - viewport(400) + itemHeight(40) = 40
		expect(offset).toBe(40);
	});

	test("getItemOffset returns correct values", () => {
		const chat = createChat({ count: 5, getHeight: () => 40 });
		expect(chat.getItemOffset(0)).toBe(0);
		expect(chat.getItemOffset(1)).toBe(40);
		expect(chat.getItemOffset(4)).toBe(160);
	});

	test("getItemHeight returns correct height", () => {
		const heights = [30, 40, 50, 60, 70];
		const chat = createChat({
			count: 5,
			getHeight: (i) => heights[i]!,
		});
		expect(chat.getItemHeight(0)).toBe(30);
		expect(chat.getItemHeight(2)).toBe(50);
		expect(chat.getItemHeight(4)).toBe(70);
	});
});
