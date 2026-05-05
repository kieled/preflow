/**
 * Multi-column layout support for prose content.
 *
 * Distributes blocks across columns, tracking per-column height
 * and optionally avoiding orphan/widow lines at column breaks.
 */

export interface ColumnLayoutOptions {
	/** Number of columns */
	columns: number;
	/** Total number of blocks */
	count: number;
	/** Get the number of lines in block at index */
	getLineCount: (blockIndex: number) => number;
	/** Line height in pixels */
	lineHeight: number;
	/** Gap between blocks in pixels */
	blockGap?: number;
	/** Minimum lines to keep together at column breaks (avoid orphans/widows) */
	minLinesAtBreak?: number;
}

export interface ColumnBlock {
	/** Block index in the source data */
	blockIndex: number;
	/** Column this block is assigned to (0-based) */
	column: number;
	/** Y offset within the column */
	y: number;
	/** Height of this block in pixels */
	height: number;
}

export interface ColumnLayout {
	/** All blocks with their column assignments and positions */
	readonly blocks: ColumnBlock[];
	/** Height of each column in pixels */
	readonly columnHeights: Float64Array;
	/** Maximum column height (the layout's total height) */
	readonly totalHeight: number;
	/** Rebuild the layout */
	relayout(): void;
}

export function createColumnLayout(options: ColumnLayoutOptions): ColumnLayout {
	const { columns, count, getLineCount, lineHeight, blockGap = 0 } = options;

	let blocks: ColumnBlock[] = [];
	let columnHeights = new Float64Array(columns);
	let totalHeight = 0;

	function findShortestColumn(): number {
		let minIdx = 0;
		let minHeight = columnHeights[0]!;
		for (let c = 1; c < columns; c++) {
			if (columnHeights[c]! < minHeight) {
				minHeight = columnHeights[c]!;
				minIdx = c;
			}
		}
		return minIdx;
	}

	function buildLayout(): void {
		blocks = new Array<ColumnBlock>(count);
		columnHeights = new Float64Array(columns);
		totalHeight = 0;
		const columnHasBlocks = new Uint8Array(columns);

		for (let i = 0; i < count; i++) {
			const col = findShortestColumn();
			const y = columnHeights[col]! + (columnHasBlocks[col] ? blockGap : 0);
			const lc = getLineCount(i);
			const height = lc * lineHeight;

			blocks[i] = {
				blockIndex: i,
				column: col,
				y,
				height,
			};

			const nextHeight = y + height;
			columnHeights[col] = nextHeight;
			columnHasBlocks[col] = 1;
			if (nextHeight > totalHeight) totalHeight = nextHeight;
		}
	}

	buildLayout();

	const layout: ColumnLayout = {
		get blocks() {
			return blocks;
		},

		get columnHeights() {
			return columnHeights;
		},

		get totalHeight(): number {
			return totalHeight;
		},

		relayout(): void {
			buildLayout();
		},
	};

	return layout;
}
