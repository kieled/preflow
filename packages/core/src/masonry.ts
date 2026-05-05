import type {
	Flow,
	FlowItem,
	FlowItemVisitor,
	MasonryOptions,
	Range,
	ScrollCorrection,
} from "./types";

const EMPTY_FLOAT64 = new Float64Array(0);

/**
 * Create a masonry virtualizer (shortest-column greedy placement).
 * Lazy init + inlined hot paths.
 */
export function createMasonry(options: MasonryOptions): Flow {
	let count = options.count;
	const columns = options.columns;
	let columnWidth = options.columnWidth;
	const gap = options.gap ?? 0;
	const getHeight = options.getHeight;
	const overscan = options.overscan ?? 3;

	// Placement arrays — parallel arrays instead of objects for cache friendliness
	let px = EMPTY_FLOAT64; // x positions
	let py = EMPTY_FLOAT64; // y positions
	let ph = EMPTY_FLOAT64; // heights
	let columnItems: Int32Array[] = [];
	let contentHeight = 0;
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
		const colHeights = new Float64Array(columns);
		const itemColumns = new Int32Array(count);
		const columnCounts = new Int32Array(columns);
		px = new Float64Array(count);
		py = new Float64Array(count);
		ph = new Float64Array(count);

		for (let i = 0; i < count; i++) {
			let shortest = 0;
			for (let c = 1; c < columns; c++) {
				if (colHeights[c]! < colHeights[shortest]!) shortest = c;
			}

			const h = getHeight(i);
			px[i] = shortest * (columnWidth + gap);
			py[i] = colHeights[shortest]!;
			ph[i] = h;
			itemColumns[i] = shortest;
			columnCounts[shortest]!++;
			colHeights[shortest]! += h + gap;
		}

		columnItems = new Array<Int32Array>(columns);
		const columnOffsets = new Int32Array(columns);
		for (let c = 0; c < columns; c++) columnItems[c] = new Int32Array(columnCounts[c]!);
		for (let i = 0; i < count; i++) {
			const c = itemColumns[i]!;
			columnItems[c]![columnOffsets[c]!] = i;
			columnOffsets[c]!++;
		}

		contentHeight = 0;
		for (let c = 0; c < columns; c++) {
			const h = colHeights[c]!;
			const adjusted = h > 0 ? h - gap : 0;
			if (adjusted > contentHeight) contentHeight = adjusted;
		}
		dirty = false;
		itemsCacheValid = false;
	}

	function ensure(): void {
		if (dirty) build();
	}

	function computeRange(): void {
		if (count === 0) {
			rangeStart = 0;
			rangeEnd = 0;
			itemsCacheValid = false;
			return;
		}
		ensure();

		const viewTop = scrollTop - overscan * 100;
		const viewBottom = scrollTop + viewportHeight + overscan * 100;

		let start = count;
		let end = 0;

		for (let c = 0; c < columns; c++) {
			const items = columnItems[c]!;
			let lo = 0;
			let hi = items.length;
			while (lo < hi) {
				const mid = (lo + hi) >>> 1;
				const idx = items[mid]!;
				if (py[idx]! + ph[idx]! < viewTop) lo = mid + 1;
				else hi = mid;
			}

			for (let j = lo; j < items.length; j++) {
				const i = items[j]!;
				if (py[i]! > viewBottom) break;
				if (i < start) start = i;
				if (i + 1 > end) end = i + 1;
			}
		}

		if (start >= end) {
			if (rangeStart !== 0 || rangeEnd !== 0) {
				rangeStart = 0;
				rangeEnd = 0;
				itemsCacheValid = false;
			}
		} else {
			if (start !== rangeStart || end !== rangeEnd) {
				rangeStart = start;
				rangeEnd = end;
				itemsCacheValid = false;
			}
		}
	}

	const flow: Flow = {
		get totalHeight() {
			ensure();
			return contentHeight;
		},

		get visibleRange() {
			return { start: rangeStart, end: rangeEnd };
		},

		getItems(): FlowItem[] {
			ensure();
			if (itemsCacheValid) return itemsCache;
			const items: FlowItem[] = [];
			const viewTop = scrollTop - overscan * 100;
			const viewBottom = scrollTop + viewportHeight + overscan * 100;
			for (let i = rangeStart; i < rangeEnd; i++) {
				const itemBottom = py[i]! + ph[i]!;
				if (itemBottom >= viewTop && py[i]! <= viewBottom) {
					items.push({
						index: i,
						x: px[i]!,
						y: py[i]!,
						width: columnWidth,
						height: ph[i]!,
					});
				}
			}
			itemsCache = items;
			itemsCacheValid = true;
			return items;
		},

		forEachItem(visitor: FlowItemVisitor): void {
			ensure();
			const viewTop = scrollTop - overscan * 100;
			const viewBottom = scrollTop + viewportHeight + overscan * 100;
			for (let i = rangeStart; i < rangeEnd; i++) {
				const y = py[i]!;
				const h = ph[i]!;
				if (y + h >= viewTop && y <= viewBottom) {
					visitor(i, px[i]!, y, columnWidth, h);
				}
			}
		},

		getItemOffset(index: number): number {
			ensure();
			return py[index] ?? 0;
		},

		getItemHeight(index: number): number {
			ensure();
			return ph[index] ?? 0;
		},

		setViewport(newScrollTop: number, newViewportHeight: number): boolean {
			if (!dirty && newScrollTop === scrollTop && newViewportHeight === viewportHeight)
				return false;
			scrollTop = newScrollTop;
			viewportHeight = newViewportHeight;
			itemsCacheValid = false;
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
			const anchorIndex = rangeStart < count ? rangeStart : 0;
			ensure();
			const oldY = py[anchorIndex] ?? 0;

			count += prependCount;
			build();

			const newY = py[anchorIndex + prependCount] ?? 0;
			const correction = newY - oldY;
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
			const y = py[ci]!;
			const h = ph[ci]!;

			if (align === undefined || align === "start") return y;
			switch (align) {
				case "center":
					return y - viewportHeight / 2 + h / 2;
				case "end":
					return y - viewportHeight + h;
			}
		},

		scrollToEnd(): number {
			ensure();
			return Math.max(0, contentHeight - viewportHeight);
		},
	};

	return flow;
}
