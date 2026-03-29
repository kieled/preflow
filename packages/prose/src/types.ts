/** Options for createProse */
export interface ProseOptions {
	/** Total number of blocks (paragraphs, headings, etc.) */
	count: number;
	/** Get the number of lines in block at index */
	getLineCount: (blockIndex: number) => number;
	/** Line height in pixels (uniform for all lines) */
	lineHeight: number;
	/** Gap between blocks in pixels */
	blockGap?: number;
	/** Overscan in number of lines */
	overscan?: number;
}

/** A positioned line ready for rendering */
export interface LineItem {
	/** Global line index across all blocks */
	lineIndex: number;
	/** Block index this line belongs to */
	blockIndex: number;
	/** Line index within the block (0-based) */
	localLineIndex: number;
	/** Vertical offset in pixels */
	y: number;
	/** Height in pixels (= lineHeight) */
	height: number;
	/** Whether this is the first line of a block */
	isBlockStart: boolean;
	/** Whether this is the last line of a block */
	isBlockEnd: boolean;
}

/** Cursor position in the document */
export interface CursorPosition {
	blockIndex: number;
	localLineIndex: number;
}

/** The ProseFlow interface */
export interface ProseFlow {
	/** Total scrollable height in pixels */
	readonly totalHeight: number;
	/** Total number of lines across all blocks */
	readonly totalLines: number;
	/** Current visible line range [start, end) -- global line indices */
	readonly visibleRange: { start: number; end: number };
	/** Get positioned lines for the current visible range */
	getLines(): LineItem[];
	/** Get the y-offset of a global line index */
	getLineOffset(globalLineIndex: number): number;
	/** Get the block index that contains a global line index */
	getBlockForLine(globalLineIndex: number): CursorPosition;
	/** Get the global line index for a block + local line */
	getGlobalLineIndex(blockIndex: number, localLineIndex: number): number;
	/** Update scroll position and viewport height. Returns true if range changed. */
	setViewport(scrollTop: number, viewportHeight: number): boolean;
	/** Update block count (e.g. new paragraphs added) */
	setCount(count: number): void;
	/** Scroll to a specific global line index */
	scrollToLine(lineIndex: number, align?: "start" | "center" | "end"): number;
	/** Scroll to end of document */
	scrollToEnd(): number;
	/** Relayout all blocks (e.g. when container width changes, line counts change) */
	relayout(): void;
}
