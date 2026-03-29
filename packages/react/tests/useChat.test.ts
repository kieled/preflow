import { describe, expect, test } from "bun:test";
import { createChat } from "@preflow/core";

describe("useChat logic", () => {
	test("creates chat with correct total height", () => {
		const flow = createChat({ count: 20, getHeight: () => 40 });
		expect(flow.totalHeight).toBe(800);
	});

	test("setViewport tracks visible range", () => {
		const flow = createChat({ count: 50, getHeight: () => 40 });
		const changed = flow.setViewport(0, 300);
		expect(changed).toBe(true);
		const items = flow.getItems();
		expect(items.length).toBeGreaterThan(0);
	});

	test("append increases total height", () => {
		const flow = createChat({ count: 10, getHeight: () => 40 });
		expect(flow.totalHeight).toBe(400);
		flow.append(5);
		expect(flow.totalHeight).toBe(600);
	});

	test("prepend returns scroll correction", () => {
		const flow = createChat({ count: 10, getHeight: () => 40 });
		flow.setViewport(0, 300);
		const correction = flow.prepend(5);
		expect(correction.offset).toBeGreaterThan(0);
		// Prepended 5 items of height 40 each = 200px correction
		expect(correction.offset).toBe(200);
	});

	test("prepend increases total count", () => {
		const flow = createChat({ count: 10, getHeight: () => 40 });
		flow.prepend(5);
		expect(flow.totalHeight).toBe(600); // 15 * 40
	});

	test("scrollToEnd returns bottom offset", () => {
		const flow = createChat({ count: 50, getHeight: () => 40 });
		flow.setViewport(0, 300);
		// totalHeight - viewport = 2000 - 300 = 1700
		expect(flow.scrollToEnd()).toBe(1700);
	});

	test("scrollToIndex works for chat items", () => {
		const flow = createChat({ count: 50, getHeight: () => 40 });
		flow.setViewport(0, 300);
		// Item 10 at offset 400
		expect(flow.scrollToIndex(10)).toBe(400);
	});

	test("scrollToIndex center alignment", () => {
		const flow = createChat({ count: 50, getHeight: () => 40 });
		flow.setViewport(0, 300);
		// center = 400 - 150 + 20 = 270
		expect(flow.scrollToIndex(10, "center")).toBe(270);
	});

	test("setCount updates height", () => {
		const flow = createChat({ count: 10, getHeight: () => 40 });
		expect(flow.totalHeight).toBe(400);
		flow.setCount(20);
		expect(flow.totalHeight).toBe(800);
	});

	test("getItemOffset returns correct position", () => {
		const flow = createChat({ count: 10, getHeight: () => 40 });
		expect(flow.getItemOffset(5)).toBe(200);
	});

	test("getItemHeight returns correct height", () => {
		const flow = createChat({ count: 10, getHeight: () => 40 });
		expect(flow.getItemHeight(5)).toBe(40);
	});

	test("setViewport returns false when range unchanged", () => {
		const flow = createChat({ count: 50, getHeight: () => 40 });
		flow.setViewport(0, 300);
		const changed = flow.setViewport(0, 300);
		expect(changed).toBe(false);
	});
});
