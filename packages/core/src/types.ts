/** A positioned item ready for rendering. */
export interface FlowItem {
	/** Item index in the data array. */
	index: number;
	/** Horizontal offset in pixels. */
	x: number;
	/** Vertical offset in pixels. */
	y: number;
	/** Width in pixels. */
	width: number;
	/** Height in pixels. */
	height: number;
}

/** Visible range [start, end) — end is exclusive. */
export interface Range {
	start: number;
	end: number;
}

/** Scroll correction returned by prepend/append. */
export interface ScrollCorrection {
	/** Pixel amount to add to current scrollTop to maintain visual position. */
	offset: number;
}

/** The Flow interface — returned by all createX functions. */
export interface Flow {
	/** Total scrollable height in pixels. */
	readonly totalHeight: number;

	/** Current visible range [start, end). */
	readonly visibleRange: Range;

	/** Get positioned items for the current visible range. */
	getItems(): FlowItem[];

	/** O(1): get exact pixel offset of item at index. */
	getItemOffset(index: number): number;

	/** O(1): get height of item at index. */
	getItemHeight(index: number): number;

	/**
	 * Update scroll position and viewport size.
	 * Returns true if the visible range changed.
	 */
	setViewport(scrollTop: number, viewportHeight: number): boolean;

	/** Update container width — triggers full height relayout. */
	setContainerWidth(width: number): void;

	/** Update item count (for dynamic data). */
	setCount(count: number): void;

	/**
	 * Prepend items to the beginning.
	 * Returns the scroll correction needed to maintain visual position.
	 */
	prepend(count: number): ScrollCorrection;

	/** Append items to the end. */
	append(count: number): void;

	/** O(1): get exact pixel offset to scroll item into view. */
	scrollToIndex(index: number, align?: "start" | "center" | "end"): number;

	/** O(1): get pixel offset to scroll to the very end. */
	scrollToEnd(): number;
}

/** Options for createFlow (1D list). */
export interface FlowOptions {
	count: number;
	getHeight: (index: number) => number;
	overscan?: number;
}

/** Options for createGrid (uniform columns, rows sized by tallest cell). */
export interface GridOptions {
	count: number;
	columns: number;
	columnWidth: number;
	gap?: number;
	getHeight: (index: number) => number;
	overscan?: number;
}

/** Options for createMasonry (shortest-column greedy placement). */
export interface MasonryOptions {
	count: number;
	columns: number;
	columnWidth: number;
	gap?: number;
	getHeight: (index: number) => number;
	overscan?: number;
}

/** Options for createChat (reverse-scroll, bottom-anchored). */
export interface ChatOptions {
	count: number;
	getHeight: (index: number) => number;
	overscan?: number;
	/** If provided, used for shrinkwrap width calculation. */
	getTightWidth?: (index: number) => number;
}
