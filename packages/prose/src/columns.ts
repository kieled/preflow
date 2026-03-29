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
	const { columns, count, getLineCount, lineHeight, blockGap = 0, minLinesAtBreak = 2 } = options;

	let blocks: ColumnBlock[] = [];
	let columnHeights = new Float64Array(columns);

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

	function computeBlockHeight(blockIndex: number): number {
		const lc = getLineCount(blockIndex);
		return lc * lineHeight;
	}

	function buildLayout(): void {
		blocks = [];
		columnHeights = new Float64Array(columns);

		for (let i = 0; i < count; i++) {
			const col = findShortestColumn();
			const y = columnHeights[col]!;
			const lc = getLineCount(i);
			let height = computeBlockHeight(i);

			// Orphan/widow avoidance: if a block has fewer lines than minLinesAtBreak,
			// we still place it whole. The check matters when splitting would occur,
			// but since we place whole blocks, we just ensure we don't leave tiny blocks
			// isolated. For now, we keep blocks intact (no splitting across columns).
			if (lc > 0 && lc < minLinesAtBreak) {
				// Keep the block whole -- just ensure it stays together
				height = lc * lineHeight;
			}

			blocks.push({
				blockIndex: i,
				column: col,
				y,
				height,
			});

			columnHeights[col] = y + height + (i < count - 1 ? blockGap : 0);
		}

		// Remove trailing blockGap from column heights
		for (let c = 0; c < columns; c++) {
			// Check if column has any blocks
			const hasBlocks = blocks.some((b) => b.column === c);
			if (hasBlocks && columnHeights[c]! > 0) {
				// The last block in this column added an extra gap; remove it
				const lastInCol = blocks.filter((b) => b.column === c).pop();
				if (lastInCol) {
					// Only remove gap if there's actually trailing gap
					const expectedEnd = lastInCol.y + lastInCol.height;
					if (columnHeights[c]! > expectedEnd) {
						columnHeights[c] = expectedEnd;
					}
				}
			}
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
			let max = 0;
			for (let c = 0; c < columns; c++) {
				if (columnHeights[c]! > max) max = columnHeights[c]!;
			}
			return max;
		},

		relayout(): void {
			buildLayout();
		},
	};

	return layout;
}
