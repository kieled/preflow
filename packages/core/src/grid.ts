import { buildPrefixSums } from "./prefix-sum";
import type { Flow, FlowItem, GridOptions, Range, ScrollCorrection } from "./types";

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
	let rowHeights: Float64Array = new Float64Array(0);
	let sums: Float64Array = new Float64Array(0);
	let dirty = true;
	let scrollTop = 0;
	let viewportHeight = 0;
	let rangeStart = 0;
	let rangeEnd = 0;

	function build(): void {
		rowCount = Math.ceil(count / columns);
		rowHeights = new Float64Array(rowCount);
		for (let row = 0; row < rowCount; row++) {
			let maxH = 0;
			const base = row * columns;
			const end = Math.min(base + columns, count);
			for (let i = base; i < end; i++) {
				const h = getHeight(i);
				if (h > maxH) maxH = h;
			}
			rowHeights[row] = maxH;
		}
		sums = buildPrefixSums(rowCount, (row) => rowHeights[row]! + (row > 0 ? gap : 0));
		dirty = false;
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

	function computeRange(): void {
		if (rowCount === 0) {
			rangeStart = 0;
			rangeEnd = 0;
			return;
		}
		const first = findRowIndex(scrollTop);
		const last = findRowIndex(scrollTop + viewportHeight);
		rangeStart = Math.max(0, first - overscan);
		rangeEnd = Math.min(rowCount, last + 1 + overscan);
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
			return items;
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
			scrollTop = newScrollTop;
			viewportHeight = newViewportHeight;
			ensure();
			const oldStart = rangeStart;
			const oldEnd = rangeEnd;
			computeRange();
			return rangeStart !== oldStart || rangeEnd !== oldEnd;
		},

		setContainerWidth(width: number): void {
			columnWidth = (width - gap * (columns - 1)) / columns;
			build();
			computeRange();
		},

		setCount(newCount: number): void {
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

		scrollToIndex(index: number, align: "start" | "center" | "end" = "start"): number {
			ensure();
			const ci = Math.max(0, Math.min(index, count - 1));
			const row = Math.floor(ci / columns);
			const rowOffset = sums[row]!;
			const rowH = sums[row + 1]! - sums[row]!;

			switch (align) {
				case "start":
					return rowOffset;
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
