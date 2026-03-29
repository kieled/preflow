import { describe, expect, test } from "bun:test";
import {
	buildPrefixSums,
	computeVisibleRange,
	findIndexAtOffset,
	getItemHeight,
	getOffset,
	getTotalHeight,
	rebuildPrefixSumsFrom,
} from "../src/prefix-sum";

describe("buildPrefixSums", () => {
	test("empty list", () => {
		const sums = buildPrefixSums(0, () => 50);
		expect(sums.length).toBe(1);
		expect(sums[0]).toBe(0);
	});

	test("single item", () => {
		const sums = buildPrefixSums(1, () => 100);
		expect(Array.from(sums)).toEqual([0, 100]);
	});

	test("uniform heights", () => {
		const sums = buildPrefixSums(5, () => 40);
		expect(Array.from(sums)).toEqual([0, 40, 80, 120, 160, 200]);
	});

	test("variable heights", () => {
		const heights = [10, 20, 30, 40, 50];
		const sums = buildPrefixSums(5, (i) => heights[i]!);
		expect(Array.from(sums)).toEqual([0, 10, 30, 60, 100, 150]);
	});

	test("large count (10,000 items)", () => {
		const sums = buildPrefixSums(10000, () => 25);
		expect(sums.length).toBe(10001);
		expect(sums[10000]).toBe(250000);
		expect(sums[5000]).toBe(125000);
	});

	test("fractional heights maintain precision", () => {
		const sums = buildPrefixSums(3, (i) => [10.5, 20.3, 15.7][i]!);
		expect(sums[3]).toBeCloseTo(46.5, 10);
	});
});

describe("rebuildPrefixSumsFrom", () => {
	test("rebuild from middle", () => {
		const heights = [10, 20, 30, 40, 50];
		const sums = buildPrefixSums(5, (i) => heights[i]!);

		// Change item 2 from 30 to 100
		const newHeights = [10, 20, 100, 40, 50];
		const rebuilt = rebuildPrefixSumsFrom(sums, 2, 5, (i) => newHeights[i]!);
		expect(Array.from(rebuilt)).toEqual([0, 10, 30, 130, 170, 220]);
	});

	test("grow array (append)", () => {
		const sums = buildPrefixSums(3, () => 10);
		const allHeights = [10, 10, 10, 20, 20];
		const grown = rebuildPrefixSumsFrom(sums, 3, 5, (i) => allHeights[i]!);
		expect(grown.length).toBe(6);
		expect(Array.from(grown)).toEqual([0, 10, 20, 30, 50, 70]);
	});

	test("rebuild from index 0 is equivalent to full rebuild", () => {
		const heights = [5, 15, 25, 35];
		const full = buildPrefixSums(4, (i) => heights[i]!);
		const sums = new Float64Array(5);
		const rebuilt = rebuildPrefixSumsFrom(sums, 0, 4, (i) => heights[i]!);
		expect(Array.from(rebuilt)).toEqual(Array.from(full));
	});
});

describe("getOffset", () => {
	test("returns correct offset for each item", () => {
		const heights = [10, 20, 30];
		const sums = buildPrefixSums(3, (i) => heights[i]!);
		expect(getOffset(sums, 0)).toBe(0);
		expect(getOffset(sums, 1)).toBe(10);
		expect(getOffset(sums, 2)).toBe(30);
	});

	test("out-of-bounds returns 0", () => {
		const sums = buildPrefixSums(2, () => 10);
		expect(getOffset(sums, 99)).toBe(0);
	});
});

describe("getItemHeight", () => {
	test("returns correct height for each item", () => {
		const heights = [10, 20, 30];
		const sums = buildPrefixSums(3, (i) => heights[i]!);
		expect(getItemHeight(sums, 0)).toBe(10);
		expect(getItemHeight(sums, 1)).toBe(20);
		expect(getItemHeight(sums, 2)).toBe(30);
	});

	test("out-of-bounds returns 0", () => {
		const sums = buildPrefixSums(2, () => 10);
		expect(getItemHeight(sums, 99)).toBe(0);
	});
});

describe("getTotalHeight", () => {
	test("returns sum of all heights", () => {
		const sums = buildPrefixSums(4, () => 25);
		expect(getTotalHeight(sums, 4)).toBe(100);
	});

	test("empty list returns 0", () => {
		const sums = buildPrefixSums(0, () => 0);
		expect(getTotalHeight(sums, 0)).toBe(0);
	});
});

describe("findIndexAtOffset", () => {
	const heights = [10, 20, 30, 40, 50];
	const sums = buildPrefixSums(5, (i) => heights[i]!);
	// sums = [0, 10, 30, 60, 100, 150]

	test("offset 0 returns index 0", () => {
		expect(findIndexAtOffset(sums, 5, 0)).toBe(0);
	});

	test("negative offset returns index 0", () => {
		expect(findIndexAtOffset(sums, 5, -100)).toBe(0);
	});

	test("offset at exact item boundary", () => {
		expect(findIndexAtOffset(sums, 5, 10)).toBe(1);
		expect(findIndexAtOffset(sums, 5, 30)).toBe(2);
		expect(findIndexAtOffset(sums, 5, 60)).toBe(3);
		expect(findIndexAtOffset(sums, 5, 100)).toBe(4);
	});

	test("offset in middle of item", () => {
		expect(findIndexAtOffset(sums, 5, 5)).toBe(0); // middle of item 0
		expect(findIndexAtOffset(sums, 5, 15)).toBe(1); // middle of item 1
		expect(findIndexAtOffset(sums, 5, 45)).toBe(2); // middle of item 2
		expect(findIndexAtOffset(sums, 5, 80)).toBe(3); // middle of item 3
		expect(findIndexAtOffset(sums, 5, 125)).toBe(4); // middle of item 4
	});

	test("offset beyond total returns last item", () => {
		expect(findIndexAtOffset(sums, 5, 200)).toBe(4);
		expect(findIndexAtOffset(sums, 5, 999999)).toBe(4);
	});

	test("empty count returns 0", () => {
		expect(findIndexAtOffset(sums, 0, 50)).toBe(0);
	});

	test("uniform heights binary search", () => {
		const uniSums = buildPrefixSums(1000, () => 50);
		expect(findIndexAtOffset(uniSums, 1000, 0)).toBe(0);
		expect(findIndexAtOffset(uniSums, 1000, 50)).toBe(1);
		expect(findIndexAtOffset(uniSums, 1000, 250)).toBe(5);
		expect(findIndexAtOffset(uniSums, 1000, 49999)).toBe(999);
	});

	test("single item", () => {
		const s = buildPrefixSums(1, () => 100);
		expect(findIndexAtOffset(s, 1, 0)).toBe(0);
		expect(findIndexAtOffset(s, 1, 50)).toBe(0);
		expect(findIndexAtOffset(s, 1, 100)).toBe(0);
	});
});

describe("computeVisibleRange", () => {
	const sums = buildPrefixSums(100, () => 50);
	// Each item is 50px. Total = 5000px.

	test("viewport at top", () => {
		const r = computeVisibleRange(sums, 100, 0, 300, 3);
		// firstVisible=0, lastVisible=5 (300/50=6 items fit, item 5 at offset 250 is last contained)
		expect(r.start).toBe(0);
		expect(r.end).toBeLessThanOrEqual(10); // with overscan
		expect(r.end).toBeGreaterThanOrEqual(7);
	});

	test("viewport in middle", () => {
		const r = computeVisibleRange(sums, 100, 2500, 300, 3);
		// scrollTop=2500 → item 50. viewport shows items 50-55.
		expect(r.start).toBeLessThanOrEqual(50);
		expect(r.start).toBeGreaterThanOrEqual(47);
		expect(r.end).toBeGreaterThanOrEqual(56);
	});

	test("viewport at bottom", () => {
		const r = computeVisibleRange(sums, 100, 4700, 300, 3);
		// Near end
		expect(r.end).toBe(100);
	});

	test("overscan=0 gives tight range", () => {
		const r = computeVisibleRange(sums, 100, 500, 200, 0);
		// scrollTop=500 → item 10. 200px viewport → items 10-13.
		expect(r.start).toBe(10);
		expect(r.end).toBe(15); // item at offset 700 is last touched by viewport
	});

	test("empty list", () => {
		const emptySums = buildPrefixSums(0, () => 0);
		const r = computeVisibleRange(emptySums, 0, 0, 300, 3);
		expect(r.start).toBe(0);
		expect(r.end).toBe(0);
	});

	test("viewport larger than content", () => {
		const smallSums = buildPrefixSums(3, () => 50);
		const r = computeVisibleRange(smallSums, 3, 0, 1000, 3);
		expect(r.start).toBe(0);
		expect(r.end).toBe(3);
	});
});
