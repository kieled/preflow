import { describe, expect, test } from "bun:test";
import { createColumnLayout } from "../src/columns";

describe("createColumnLayout", () => {
	describe("2-column layout", () => {
		test("distributes blocks roughly evenly", () => {
			const lineCounts = [5, 3, 7, 4, 6, 2];
			const layout = createColumnLayout({
				columns: 2,
				count: lineCounts.length,
				getLineCount: (i) => lineCounts[i]!,
				lineHeight: 20,
				blockGap: 0,
			});

			expect(layout.blocks.length).toBe(6);

			// Each block should be assigned to a column
			const col0Blocks = layout.blocks.filter((b) => b.column === 0);
			const col1Blocks = layout.blocks.filter((b) => b.column === 1);

			expect(col0Blocks.length + col1Blocks.length).toBe(6);

			// Both columns should have blocks
			expect(col0Blocks.length).toBeGreaterThan(0);
			expect(col1Blocks.length).toBeGreaterThan(0);
		});

		test("column heights are within reasonable balance", () => {
			const lineCounts = [10, 10, 10, 10];
			const layout = createColumnLayout({
				columns: 2,
				count: lineCounts.length,
				getLineCount: (i) => lineCounts[i]!,
				lineHeight: 20,
				blockGap: 0,
			});

			// With uniform blocks, columns should be balanced
			const h0 = layout.columnHeights[0]!;
			const h1 = layout.columnHeights[1]!;
			// Difference should be at most one block height
			expect(Math.abs(h0 - h1)).toBeLessThanOrEqual(200);
		});

		test("totalHeight is the max column height", () => {
			const lineCounts = [5, 3];
			const layout = createColumnLayout({
				columns: 2,
				count: lineCounts.length,
				getLineCount: (i) => lineCounts[i]!,
				lineHeight: 20,
				blockGap: 0,
			});

			const maxCol = Math.max(layout.columnHeights[0]!, layout.columnHeights[1]!);
			expect(layout.totalHeight).toBe(maxCol);
		});
	});

	describe("3-column layout", () => {
		test("distributes to shortest column", () => {
			const lineCounts = [10, 10, 10, 5, 5, 5];
			const layout = createColumnLayout({
				columns: 3,
				count: lineCounts.length,
				getLineCount: (i) => lineCounts[i]!,
				lineHeight: 20,
				blockGap: 0,
			});

			// First 3 blocks go to 3 columns (shortest-column greedy)
			// Then remaining 3 fill in
			expect(layout.blocks.length).toBe(6);

			for (let c = 0; c < 3; c++) {
				const colBlocks = layout.blocks.filter((b) => b.column === c);
				expect(colBlocks.length).toBeGreaterThan(0);
			}
		});
	});

	describe("blockGap", () => {
		test("gaps are applied between blocks in same column", () => {
			const lineCounts = [2, 2];
			const layout = createColumnLayout({
				columns: 1,
				count: lineCounts.length,
				getLineCount: (i) => lineCounts[i]!,
				lineHeight: 20,
				blockGap: 10,
			});

			// Single column: block 0 at y=0 (height=40), block 1 at y=50 (height=40)
			expect(layout.blocks[0]!.y).toBe(0);
			expect(layout.blocks[0]!.height).toBe(40);
			expect(layout.blocks[1]!.y).toBe(50);
			expect(layout.blocks[1]!.height).toBe(40);

			// Column height should be 90 (not 100, no trailing gap)
			expect(layout.columnHeights[0]).toBe(90);
		});
	});

	describe("block height computation", () => {
		test("block height = lineCount * lineHeight", () => {
			const lineCounts = [5, 3];
			const layout = createColumnLayout({
				columns: 2,
				count: lineCounts.length,
				getLineCount: (i) => lineCounts[i]!,
				lineHeight: 15,
				blockGap: 0,
			});

			expect(layout.blocks[0]!.height).toBe(75); // 5 * 15
			expect(layout.blocks[1]!.height).toBe(45); // 3 * 15
		});
	});

	describe("empty layout", () => {
		test("zero blocks", () => {
			const layout = createColumnLayout({
				columns: 2,
				count: 0,
				getLineCount: () => 0,
				lineHeight: 20,
				blockGap: 10,
			});

			expect(layout.blocks.length).toBe(0);
			expect(layout.totalHeight).toBe(0);
		});
	});

	describe("column break avoidance", () => {
		test("small blocks stay together (not split)", () => {
			// With minLinesAtBreak=2, a block with 1 line should still be placed whole
			const lineCounts = [1, 1, 1, 1];
			const layout = createColumnLayout({
				columns: 2,
				count: lineCounts.length,
				getLineCount: (i) => lineCounts[i]!,
				lineHeight: 20,
				blockGap: 0,
				minLinesAtBreak: 2,
			});

			// All blocks should be intact
			for (const block of layout.blocks) {
				expect(block.height).toBe(20); // 1 * 20, not split
			}
		});
	});

	describe("relayout", () => {
		test("rebuilds layout", () => {
			const lineCounts = [5, 5];
			const layout = createColumnLayout({
				columns: 2,
				count: lineCounts.length,
				getLineCount: (i) => lineCounts[i]!,
				lineHeight: 20,
				blockGap: 0,
			});

			const h1 = layout.totalHeight;

			// Can't change options dynamically, but relayout recomputes with same options
			layout.relayout();
			expect(layout.totalHeight).toBe(h1);
		});
	});

	describe("single column", () => {
		test("all blocks in column 0", () => {
			const lineCounts = [3, 4, 5];
			const layout = createColumnLayout({
				columns: 1,
				count: lineCounts.length,
				getLineCount: (i) => lineCounts[i]!,
				lineHeight: 20,
				blockGap: 0,
			});

			for (const block of layout.blocks) {
				expect(block.column).toBe(0);
			}

			expect(layout.totalHeight).toBe((3 + 4 + 5) * 20);
		});
	});
});
