import { createCursorIndex } from "./cursor";
import type { LineItem, ProseFlow, ProseOptions } from "./types";

/**
 * Create a line-level virtualizer for prose content.
 *
 * Instead of virtualizing whole items, this virtualizes individual lines of text
 * within a document composed of blocks (paragraphs, headings, etc.).
 *
 * Internally builds:
 * - A cursor index (prefix-sum of line counts per block) for O(log n) block lookup
 * - A block prefix-sum (block heights including gaps) for O(1) offset lookups
 */
export function createProse(options: ProseOptions): ProseFlow {
	let count = options.count;
	const getLineCount = options.getLineCount;
	const lineHeight = options.lineHeight;
	const blockGap = options.blockGap ?? 0;
	const overscan = options.overscan ?? 3;

	// Cursor index: maps global line <-> (block, localLine)
	const cursor = createCursorIndex(count, getLineCount);

	// Block prefix-sum: blockPrefixSums[i] = pixel offset of block i
	// Each block's height = lineCount * lineHeight
	// Between blocks there's a blockGap
	let blockPrefixSums = buildBlockPrefixSums();

	let scrollTop = 0;
	let viewportHeight = 0;
	let visibleRange = { start: 0, end: 0 };

	function getBlockHeight(blockIndex: number): number {
		return getLineCount(blockIndex) * lineHeight;
	}

	function buildBlockPrefixSums(): Float64Array {
		const sums = new Float64Array(count + 1);
		for (let i = 0; i < count; i++) {
			const gap = i > 0 ? blockGap : 0;
			sums[i + 1] = sums[i]! + gap + getBlockHeight(i);
		}
		return sums;
	}

	function getTotalHeight(): number {
		return blockPrefixSums[count] ?? 0;
	}

	/**
	 * Find the block that contains a given pixel offset via binary search on blockPrefixSums.
	 */
	function findBlockAtOffset(offset: number): number {
		if (count === 0) return 0;
		if (offset <= 0) return 0;
		const total = blockPrefixSums[count]!;
		if (offset >= total) return Math.max(0, count - 1);

		let lo = 0;
		let hi = count - 1;
		while (lo < hi) {
			const mid = (lo + hi) >>> 1;
			if (blockPrefixSums[mid + 1]! <= offset) {
				lo = mid + 1;
			} else {
				hi = mid;
			}
		}
		return lo;
	}

	/**
	 * Get the pixel offset of the start of a block (including preceding gaps).
	 */
	function getBlockOffset(blockIndex: number): number {
		return blockPrefixSums[blockIndex] ?? 0;
	}

	/**
	 * Convert a pixel offset to a global line index.
	 */
	function globalLineAtOffset(offset: number): number {
		if (count === 0) return 0;
		if (offset <= 0) return 0;

		const total = getTotalHeight();
		if (offset >= total) return Math.max(0, cursor.totalLines - 1);

		const block = findBlockAtOffset(offset);
		const blockStart = getBlockOffset(block);
		const blockLines = getLineCount(block);

		// For the first block, blockStart is 0.
		// For subsequent blocks, the actual content starts after the gap.
		let contentStart = blockStart;
		if (block > 0) {
			contentStart = blockStart + blockGap;
		}

		// How far into this block's content area
		const intoBlock = Math.max(0, offset - contentStart);
		const localLine = Math.min(Math.floor(intoBlock / lineHeight), blockLines - 1);

		return cursor.getGlobalLineIndex(block, Math.max(0, localLine));
	}

	/**
	 * Compute visible line range [start, end) with overscan.
	 */
	function computeVisibleRange(): { start: number; end: number } {
		const total = cursor.totalLines;
		if (total === 0) return { start: 0, end: 0 };

		const firstVisible = globalLineAtOffset(scrollTop);
		const lastVisible = globalLineAtOffset(scrollTop + viewportHeight);

		const start = Math.max(0, firstVisible - overscan);
		const end = Math.min(total, lastVisible + 1 + overscan);

		return { start, end };
	}

	function rangesEqual(
		a: { start: number; end: number },
		b: { start: number; end: number },
	): boolean {
		return a.start === b.start && a.end === b.end;
	}

	/**
	 * Get the pixel offset of a global line index.
	 */
	function getLineOffset(globalLineIndex: number): number {
		if (cursor.totalLines === 0) return 0;
		const clamped = Math.max(0, Math.min(globalLineIndex, cursor.totalLines - 1));
		const pos = cursor.getBlockForLine(clamped);

		let blockStart = getBlockOffset(pos.blockIndex);
		// For blocks after the first, add the gap to get to the content area
		if (pos.blockIndex > 0) {
			blockStart += blockGap;
		}

		return blockStart + pos.localLineIndex * lineHeight;
	}

	function rebuildAll(): void {
		cursor.rebuild(count, getLineCount);
		blockPrefixSums = buildBlockPrefixSums();
		visibleRange = computeVisibleRange();
	}

	const prose: ProseFlow = {
		get totalHeight() {
			return getTotalHeight();
		},

		get totalLines() {
			return cursor.totalLines;
		},

		get visibleRange() {
			return visibleRange;
		},

		getLines(): LineItem[] {
			const lines: LineItem[] = [];
			for (let g = visibleRange.start; g < visibleRange.end; g++) {
				const pos = cursor.getBlockForLine(g);
				const blockLines = getLineCount(pos.blockIndex);
				lines.push({
					lineIndex: g,
					blockIndex: pos.blockIndex,
					localLineIndex: pos.localLineIndex,
					y: getLineOffset(g),
					height: lineHeight,
					isBlockStart: pos.localLineIndex === 0,
					isBlockEnd: pos.localLineIndex === blockLines - 1,
				});
			}
			return lines;
		},

		getLineOffset(globalLineIndex: number): number {
			return getLineOffset(globalLineIndex);
		},

		getBlockForLine(globalLineIndex: number) {
			return cursor.getBlockForLine(globalLineIndex);
		},

		getGlobalLineIndex(blockIndex: number, localLineIndex: number) {
			return cursor.getGlobalLineIndex(blockIndex, localLineIndex);
		},

		setViewport(newScrollTop: number, newViewportHeight: number): boolean {
			scrollTop = newScrollTop;
			viewportHeight = newViewportHeight;
			const newRange = computeVisibleRange();
			if (rangesEqual(visibleRange, newRange)) return false;
			visibleRange = newRange;
			return true;
		},

		setCount(newCount: number): void {
			if (newCount === count) return;
			count = newCount;
			rebuildAll();
		},

		scrollToLine(lineIndex: number, align: "start" | "center" | "end" = "start"): number {
			const total = cursor.totalLines;
			if (total === 0) return 0;
			const clamped = Math.max(0, Math.min(lineIndex, total - 1));
			const offset = getLineOffset(clamped);

			switch (align) {
				case "start":
					return offset;
				case "center":
					return offset - viewportHeight / 2 + lineHeight / 2;
				case "end":
					return offset - viewportHeight + lineHeight;
			}
		},

		scrollToEnd(): number {
			const total = getTotalHeight();
			return Math.max(0, total - viewportHeight);
		},

		relayout(): void {
			rebuildAll();
		},
	};

	return prose;
}
