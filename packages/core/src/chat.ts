import { buildPrefixSums, rebuildPrefixSumsFrom } from "./prefix-sum";
import type {
	ChatOptions,
	Flow,
	FlowItem,
	FlowItemVisitor,
	Range,
	ScrollCorrection,
} from "./types";

const EMPTY_FLOAT64 = new Float64Array(0);

/**
 * Create a chat (reverse-scroll) virtualizer.
 * Bottom-anchored: auto-follows new messages, preserves position when reading history.
 * Lazy init + inlined hot paths.
 */
export function createChat(options: ChatOptions): Flow {
	let count = options.count;
	const getHeight = options.getHeight;
	const overscan = options.overscan ?? 5;

	let sums: Float64Array = EMPTY_FLOAT64;
	let dirty = true;
	let scrollTop = 0;
	let viewportHeight = 0;
	let rangeStart = 0;
	let rangeEnd = 0;
	let isAtBottom = true;
	let containerWidth = Number.NaN;

	// Items cache
	let itemsCache: FlowItem[] = [];
	let itemsCacheValid = false;

	function build(): void {
		sums = buildPrefixSums(count, getHeight);
		dirty = false;
		itemsCacheValid = false;
	}

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

	function findIndexForward(offset: number, start: number): number {
		let i = start;
		while (i < count - 1 && sums[i + 1]! <= offset) i++;
		return i;
	}

	function computeRange(): void {
		if (count === 0) {
			rangeStart = 0;
			rangeEnd = 0;
			itemsCacheValid = false;
			return;
		}
		const first = findIndex(scrollTop);
		const last = findIndexForward(scrollTop + viewportHeight, first);
		const nextStart = Math.max(0, first - overscan);
		const nextEnd = Math.min(count, last + 1 + overscan);
		if (nextStart !== rangeStart || nextEnd !== rangeEnd) {
			rangeStart = nextStart;
			rangeEnd = nextEnd;
			itemsCacheValid = false;
		}
	}

	function scrollBottom(): number {
		const total = sums[count]!;
		return total > viewportHeight ? total - viewportHeight : 0;
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
			if (itemsCacheValid) return itemsCache;
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
			itemsCacheValid = true;
			return items;
		},

		forEachItem(visitor: FlowItemVisitor): void {
			if (dirty) build();
			for (let i = rangeStart; i < rangeEnd; i++) {
				const y = sums[i]!;
				visitor(i, 0, y, 0, sums[i + 1]! - y);
			}
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
			if (!dirty && newScrollTop === scrollTop && newViewportHeight === viewportHeight)
				return false;
			scrollTop = newScrollTop;
			viewportHeight = newViewportHeight;
			if (dirty) build();

			const bottom = scrollBottom();
			isAtBottom = scrollTop >= bottom - 1;

			const oldStart = rangeStart;
			const oldEnd = rangeEnd;
			computeRange();
			return rangeStart !== oldStart || rangeEnd !== oldEnd;
		},

		setContainerWidth(width: number): void {
			if (width === containerWidth) return;
			containerWidth = width;
			build();
			if (isAtBottom) scrollTop = scrollBottom();
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
			itemsCacheValid = false;
			if (isAtBottom) scrollTop = scrollBottom();
			computeRange();
		},

		prepend(prependCount: number): ScrollCorrection {
			const newCount = count + prependCount;
			sums = buildPrefixSums(newCount, getHeight);
			count = newCount;
			dirty = false;
			itemsCacheValid = false;

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
			itemsCacheValid = false;
			if (isAtBottom) scrollTop = scrollBottom();
			computeRange();
		},

		scrollToIndex(index: number, align?: "start" | "center" | "end"): number {
			if (dirty) build();
			const ci = index < 0 ? 0 : index >= count ? count - 1 : index;
			const offset = sums[ci]!;
			if (align === undefined || align === "start") return offset;
			const height = sums[ci + 1]! - offset;
			if (align === "center") return offset - viewportHeight / 2 + height / 2;
			return offset - viewportHeight + height;
		},

		scrollToEnd(): number {
			if (dirty) build();
			isAtBottom = true;
			const offset = scrollBottom();
			scrollTop = offset;
			computeRange();
			return offset;
		},
	};

	return flow;
}
