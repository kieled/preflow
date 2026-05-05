import type {
	Flow,
	FlowItem,
	FlowItemVisitor,
	GridOptions,
	Range,
	ScrollCorrection,
} from "./types";

const EMPTY_FLOAT64 = new Float64Array(0);

/**
 * Create a grid virtualizer with fixed column count.
 * Items placed left-to-right, top-to-bottom. Row height = tallest cell in row.
 * Lazy init + inlined hot paths.
 */
export function createGrid(options: GridOptions): Flow {
	let count = options.count;
	const columns = options.columns;
	let columnWidth = options.columnWidth;
	const gap = options.gap ?? 0;
	const getHeight = options.getHeight;
	const overscan = options.overscan ?? 2;

	let rowCount = 0;
	let sums: Float64Array = EMPTY_FLOAT64;
	let dirty = true;
	let scrollTop = 0;
	let viewportHeight = 0;
	let rangeStart = 0;
	let rangeEnd = 0;
	let containerWidth = Number.NaN;

	// Items cache
	let itemsCache: FlowItem[] = [];
	let itemsCacheValid = false;

	function build(): void {
		rowCount = Math.ceil(count / columns);
		sums = new Float64Array(rowCount + 1);
		let acc = 0;
		for (let row = 0; row < rowCount; row++) {
			let maxH = 0;
			const base = row * columns;
			const end = base + columns < count ? base + columns : count;
			for (let i = base; i < end; i++) {
				const h = getHeight(i);
				if (h > maxH) maxH = h;
			}
			acc += maxH + (row > 0 ? gap : 0);
			sums[row + 1] = acc;
		}
		dirty = false;
		itemsCacheValid = false;
	}

	function ensure(): void {
		if (dirty) build();
	}

	function findRowIndex(offset: number): number {
		if (rowCount === 0) return 0;
		if (offset <= 0) return 0;
		const total = sums[rowCount]!;
		if (offset >= total) return rowCount - 1;

		let lo = 0;
		let hi = rowCount - 1;
		while (lo < hi) {
			const mid = (lo + hi) >>> 1;
			if (sums[mid + 1]! <= offset) lo = mid + 1;
			else hi = mid;
		}
		return lo;
	}

	function findRowIndexForward(offset: number, start: number): number {
		let row = start;
		while (row < rowCount - 1 && sums[row + 1]! <= offset) row++;
		return row;
	}

	function computeRange(): void {
		if (rowCount === 0) {
			rangeStart = 0;
			rangeEnd = 0;
			itemsCacheValid = false;
			return;
		}
		const first = findRowIndex(scrollTop);
		const last = findRowIndexForward(scrollTop + viewportHeight, first);
		const nextStart = Math.max(0, first - overscan);
		const nextEnd = Math.min(rowCount, last + 1 + overscan);
		if (nextStart !== rangeStart || nextEnd !== rangeEnd) {
			rangeStart = nextStart;
			rangeEnd = nextEnd;
			itemsCacheValid = false;
		}
	}

	const flow: Flow = {
		get totalHeight() {
			ensure();
			return sums[rowCount]!;
		},

		get visibleRange(): Range {
			return {
				start: rangeStart * columns,
				end: Math.min(rangeEnd * columns, count),
			};
		},

		getItems(): FlowItem[] {
			ensure();
			if (itemsCacheValid) return itemsCache;
			const items: FlowItem[] = [];
			for (let row = rangeStart; row < rangeEnd; row++) {
				const rowY = sums[row]!;
				const base = row * columns;
				const end = Math.min(base + columns, count);
				for (let i = base; i < end; i++) {
					const col = i - base;
					items.push({
						index: i,
						x: col * (columnWidth + gap),
						y: rowY,
						width: columnWidth,
						height: getHeight(i),
					});
				}
			}
			itemsCache = items;
			itemsCacheValid = true;
			return items;
		},

		forEachItem(visitor: FlowItemVisitor): void {
			ensure();
			const stride = columnWidth + gap;
			for (let row = rangeStart; row < rangeEnd; row++) {
				const rowY = sums[row]!;
				const base = row * columns;
				const end = base + columns < count ? base + columns : count;
				for (let i = base; i < end; i++) {
					visitor(i, (i - base) * stride, rowY, columnWidth, getHeight(i));
				}
			}
		},

		getItemOffset(index: number): number {
			ensure();
			const row = Math.floor(index / columns);
			return sums[row]!;
		},

		getItemHeight(index: number): number {
			return getHeight(index);
		},

		setViewport(newScrollTop: number, newViewportHeight: number): boolean {
			ensure();
			if (newScrollTop === scrollTop && newViewportHeight === viewportHeight) return false;
			scrollTop = newScrollTop;
			viewportHeight = newViewportHeight;
			const oldStart = rangeStart;
			const oldEnd = rangeEnd;
			computeRange();
			return rangeStart !== oldStart || rangeEnd !== oldEnd;
		},

		setContainerWidth(width: number): void {
			if (width === containerWidth) return;
			containerWidth = width;
			columnWidth = (width - gap * (columns - 1)) / columns;
			build();
			computeRange();
		},

		setCount(newCount: number): void {
			if (newCount === count) return;
			count = newCount;
			build();
			computeRange();
		},

		prepend(prependCount: number): ScrollCorrection {
			count += prependCount;
			build();

			const prependRows = Math.ceil(prependCount / columns);
			const correction = sums[prependRows]!;
			scrollTop += correction;
			computeRange();
			return { offset: correction };
		},

		append(appendCount: number): void {
			count += appendCount;
			build();
			computeRange();
		},

		scrollToIndex(index: number, align?: "start" | "center" | "end"): number {
			ensure();
			const ci = Math.max(0, Math.min(index, count - 1));
			const row = Math.floor(ci / columns);
			const rowOffset = sums[row]!;
			const rowH = sums[row + 1]! - sums[row]!;

			if (align === undefined || align === "start") return rowOffset;
			switch (align) {
				case "center":
					return rowOffset - viewportHeight / 2 + rowH / 2;
				case "end":
					return rowOffset - viewportHeight + rowH;
			}
		},

		scrollToEnd(): number {
			ensure();
			return Math.max(0, sums[rowCount]! - viewportHeight);
		},
	};

	return flow;
}
