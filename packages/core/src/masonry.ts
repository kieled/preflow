import type { Flow, FlowItem, MasonryOptions, Range, ScrollCorrection } from "./types";

/**
 * Create a masonry virtualizer (shortest-column greedy placement).
 * Lazy init + inlined hot paths.
 */
export function createMasonry(options: MasonryOptions): Flow {
	let count = options.count;
	const columns = options.columns;
	const columnWidth = options.columnWidth;
	const gap = options.gap ?? 0;
	const getHeight = options.getHeight;
	const overscan = options.overscan ?? 3;

	// Placement arrays — parallel arrays instead of objects for cache friendliness
	let px = new Float64Array(0); // x positions
	let py = new Float64Array(0); // y positions
	let ph = new Float64Array(0); // heights
	let contentHeight = 0;
	let dirty = true;
	let scrollTop = 0;
	let viewportHeight = 0;
	let rangeStart = 0;
	let rangeEnd = 0;

	// Items cache
	let itemsCache: FlowItem[] = [];
	let cacheStart = -1;
	let cacheEnd = -1;
	let dataVer = 0;
	let cacheVer = -1;

	function build(): void {
		const colHeights = new Float64Array(columns);
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
			colHeights[shortest]! += h + gap;
		}

		contentHeight = 0;
		for (let c = 0; c < columns; c++) {
			const h = colHeights[c]!;
			const adjusted = h > 0 ? h - gap : 0;
			if (adjusted > contentHeight) contentHeight = adjusted;
		}
		dirty = false;
		dataVer++;
	}

	function ensure(): void {
		if (dirty) build();
	}

	function computeRange(): void {
		if (count === 0) {
			rangeStart = 0;
			rangeEnd = 0;
			return;
		}
		ensure();

		const viewTop = scrollTop - overscan * 100;
		const viewBottom = scrollTop + viewportHeight + overscan * 100;

		let start = count;
		let end = 0;

		for (let i = 0; i < count; i++) {
			const itemBottom = py[i]! + ph[i]!;
			if (itemBottom >= viewTop && py[i]! <= viewBottom) {
				if (i < start) start = i;
				if (i + 1 > end) end = i + 1;
			}
		}

		if (start >= end) {
			rangeStart = 0;
			rangeEnd = 0;
		} else {
			rangeStart = start;
			rangeEnd = end;
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
			if (rangeStart === cacheStart && rangeEnd === cacheEnd && dataVer === cacheVer) {
				return itemsCache;
			}
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
			cacheStart = rangeStart;
			cacheEnd = rangeEnd;
			cacheVer = dataVer;
			return items;
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
			scrollTop = newScrollTop;
			viewportHeight = newViewportHeight;
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

		scrollToIndex(index: number, align: "start" | "center" | "end" = "start"): number {
			ensure();
			const ci = Math.max(0, Math.min(index, count - 1));
			const y = py[ci]!;
			const h = ph[ci]!;

			switch (align) {
				case "start":
					return y;
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
