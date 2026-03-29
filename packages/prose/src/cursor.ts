import type { CursorPosition } from "./types";

/**
 * Cursor index: maps between global line indices and (block, localLine) pairs.
 *
 * Internally maintains a prefix-sum of line counts per block:
 *   linePrefixSums[i] = total lines in blocks 0..i-1
 *   linePrefixSums[0] = 0
 *   linePrefixSums[count] = totalLines
 */
export interface CursorIndex {
	/** Total number of lines across all blocks */
	readonly totalLines: number;
	/** O(log n) binary search to find which block a global line belongs to */
	getBlockForLine(globalLineIndex: number): CursorPosition;
	/** O(1) prefix-sum lookup: global line index for a given block + localLine */
	getGlobalLineIndex(blockIndex: number, localLineIndex: number): number;
	/** Get the number of lines in a specific block */
	getBlockLineCount(blockIndex: number): number;
	/** Get the first global line index in a block */
	getBlockStartLine(blockIndex: number): number;
	/** Rebuild the cursor index (when block count or line counts change) */
	rebuild(count: number, getLineCount: (blockIndex: number) => number): void;
}

export function createCursorIndex(
	count: number,
	getLineCount: (blockIndex: number) => number,
): CursorIndex {
	let blockCount = count;
	let linePrefixSums = buildLinePrefixSums(count, getLineCount);

	function buildLinePrefixSums(n: number, getLC: (blockIndex: number) => number): Float64Array {
		const sums = new Float64Array(n + 1);
		for (let i = 0; i < n; i++) {
			sums[i + 1] = sums[i]! + getLC(i);
		}
		return sums;
	}

	const cursor: CursorIndex = {
		get totalLines(): number {
			return linePrefixSums[blockCount] ?? 0;
		},

		getBlockForLine(globalLineIndex: number): CursorPosition {
			if (blockCount === 0) return { blockIndex: 0, localLineIndex: 0 };

			// Clamp to valid range
			const total = linePrefixSums[blockCount]!;
			const clamped = Math.max(0, Math.min(globalLineIndex, total - 1));

			// Binary search: find the block where linePrefixSums[block] <= clamped < linePrefixSums[block+1]
			let lo = 0;
			let hi = blockCount - 1;
			while (lo < hi) {
				const mid = (lo + hi) >>> 1;
				if (linePrefixSums[mid + 1]! <= clamped) {
					lo = mid + 1;
				} else {
					hi = mid;
				}
			}

			const blockStart = linePrefixSums[lo]!;
			return {
				blockIndex: lo,
				localLineIndex: clamped - blockStart,
			};
		},

		getGlobalLineIndex(blockIndex: number, localLineIndex: number): number {
			const clampedBlock = Math.max(0, Math.min(blockIndex, blockCount - 1));
			if (blockCount === 0) return 0;
			const blockStart = linePrefixSums[clampedBlock]!;
			const blockLines = (linePrefixSums[clampedBlock + 1] ?? 0) - blockStart;
			const clampedLocal = Math.max(0, Math.min(localLineIndex, blockLines - 1));
			return blockStart + clampedLocal;
		},

		getBlockLineCount(blockIndex: number): number {
			if (blockIndex < 0 || blockIndex >= blockCount) return 0;
			return (linePrefixSums[blockIndex + 1] ?? 0) - (linePrefixSums[blockIndex] ?? 0);
		},

		getBlockStartLine(blockIndex: number): number {
			if (blockIndex < 0 || blockIndex >= blockCount) return 0;
			return linePrefixSums[blockIndex] ?? 0;
		},

		rebuild(newCount: number, newGetLineCount: (blockIndex: number) => number): void {
			blockCount = newCount;
			linePrefixSums = buildLinePrefixSums(newCount, newGetLineCount);
		},
	};

	return cursor;
}
