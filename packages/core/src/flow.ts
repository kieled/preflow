import { buildPrefixSums, rebuildPrefixSumsFrom } from "./prefix-sum";
import type { Flow, FlowItem, FlowOptions, Range, ScrollCorrection } from "./types";

/**
 * Create a 1D list virtualizer.
 * Heights are provided synchronously via getHeight — no DOM measurement needed.
 *
 * Prefix-sum array is built lazily on first access, making creation O(1).
 * All hot-path operations use inlined array access — no function call overhead.
 */
export function createFlow(options: FlowOptions): Flow {
	let count = options.count;
	const getHeight = options.getHeight;
	const overscan = options.overscan ?? 3;

	// Lazy: starts empty, built on first access
	let sums: Float64Array = new Float64Array(0);
	let dirty = true;
	let scrollTop = 0;
	let viewportHeight = 0;
	let rangeStart = 0;
	let rangeEnd = 0;

	// Items cache — avoids allocating new FlowItem[] on every getItems() call
	let itemsCache: FlowItem[] = [];
	let cacheStart = -1;
	let cacheEnd = -1;
	let dataVer = 0;
	let cacheVer = -1;

	function build(): void {
		sums = buildPrefixSums(count, getHeight);
		dirty = false;
		dataVer++;
	}

	// Inlined binary search — avoids function call overhead
	function findIndex(offset: number): number {
		if (count === 0) return 0;
		if (offset <= 0) return 0;
		const total = sums[count]!;
		if (offset >= total) return count - 1;

		let lo = 0;
		let hi = count - 1;
		while (lo < hi) {
			const mid = (lo + hi) >>> 1;
			if (sums[mid + 1]! <= offset) lo = mid + 1;
			else hi = mid;
		}
		return lo;
	}

	function computeRange(): void {
		if (count === 0) {
			rangeStart = 0;
			rangeEnd = 0;
			return;
		}
		const first = findIndex(scrollTop);
		const last = findIndex(scrollTop + viewportHeight);
		rangeStart = Math.max(0, first - overscan);
		rangeEnd = Math.min(count, last + 1 + overscan);
	}

	const flow: Flow = {
		get totalHeight() {
			if (dirty) build();
			return sums[count]!;
		},

		get visibleRange() {
			return { start: rangeStart, end: rangeEnd };
		},

		getItems(): FlowItem[] {
			if (dirty) build();
			if (rangeStart === cacheStart && rangeEnd === cacheEnd && dataVer === cacheVer) {
				return itemsCache;
			}
			const items: FlowItem[] = [];
			for (let i = rangeStart; i < rangeEnd; i++) {
				items.push({
					index: i,
					x: 0,
					y: sums[i]!,
					width: 0,
					height: sums[i + 1]! - sums[i]!,
				});
			}
			itemsCache = items;
			cacheStart = rangeStart;
			cacheEnd = rangeEnd;
			cacheVer = dataVer;
			return items;
		},

		getItemOffset(index: number): number {
			if (dirty) build();
			return sums[index]!;
		},

		getItemHeight(index: number): number {
			if (dirty) build();
			return sums[index + 1]! - sums[index]!;
		},

		setViewport(newScrollTop: number, newViewportHeight: number): boolean {
			scrollTop = newScrollTop;
			viewportHeight = newViewportHeight;
			if (dirty) build();
			const oldStart = rangeStart;
			const oldEnd = rangeEnd;
			computeRange();
			return rangeStart !== oldStart || rangeEnd !== oldEnd;
		},

		setContainerWidth(_width: number): void {
			build();
			computeRange();
		},

		setCount(newCount: number): void {
			if (newCount === count) return;
			if (dirty) build();
			if (newCount > count) {
				sums = rebuildPrefixSumsFrom(sums, count, newCount, getHeight);
			} else {
				sums = buildPrefixSums(newCount, getHeight);
			}
			count = newCount;
			dirty = false;
			dataVer++;
			computeRange();
		},

		prepend(prependCount: number): ScrollCorrection {
			const newCount = count + prependCount;
			sums = buildPrefixSums(newCount, getHeight);
			count = newCount;
			dirty = false;
			dataVer++;

			const correction = sums[prependCount]!;
			scrollTop += correction;
			computeRange();

			return { offset: correction };
		},

		append(appendCount: number): void {
			if (dirty) build();
			const newCount = count + appendCount;
			sums = rebuildPrefixSumsFrom(sums, count, newCount, getHeight);
			count = newCount;
			dataVer++;
			computeRange();
		},

		scrollToIndex(index: number, align: "start" | "center" | "end" = "start"): number {
			if (dirty) build();
			const ci = index < 0 ? 0 : index >= count ? count - 1 : index;
			const offset = sums[ci]!;
			if (align === "start") return offset;
			const height = sums[ci + 1]! - offset;
			if (align === "center") return offset - viewportHeight / 2 + height / 2;
			return offset - viewportHeight + height;
		},

		scrollToEnd(): number {
			if (dirty) build();
			const total = sums[count]!;
			return total > viewportHeight ? total - viewportHeight : 0;
		},
	};

	return flow;
}
