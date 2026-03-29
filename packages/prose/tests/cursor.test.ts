import { describe, expect, test } from "bun:test";
import { createCursorIndex } from "../src/cursor";

describe("createCursorIndex", () => {
	describe("basic: 3 blocks with [5, 3, 7] lines", () => {
		const lineCounts = [5, 3, 7];
		const cursor = createCursorIndex(lineCounts.length, (i) => lineCounts[i]!);

		test("totalLines = 15", () => {
			expect(cursor.totalLines).toBe(15);
		});

		test("getBlockForLine: line 0 -> block 0", () => {
			const pos = cursor.getBlockForLine(0);
			expect(pos.blockIndex).toBe(0);
			expect(pos.localLineIndex).toBe(0);
		});

		test("getBlockForLine: line 4 -> block 0, localLine 4", () => {
			const pos = cursor.getBlockForLine(4);
			expect(pos.blockIndex).toBe(0);
			expect(pos.localLineIndex).toBe(4);
		});

		test("getBlockForLine: line 5 -> block 1, localLine 0", () => {
			const pos = cursor.getBlockForLine(5);
			expect(pos.blockIndex).toBe(1);
			expect(pos.localLineIndex).toBe(0);
		});

		test("getBlockForLine: line 7 -> block 1, localLine 2", () => {
			const pos = cursor.getBlockForLine(7);
			expect(pos.blockIndex).toBe(1);
			expect(pos.localLineIndex).toBe(2);
		});

		test("getBlockForLine: line 8 -> block 2, localLine 0", () => {
			const pos = cursor.getBlockForLine(8);
			expect(pos.blockIndex).toBe(2);
			expect(pos.localLineIndex).toBe(0);
		});

		test("getBlockForLine: line 14 -> block 2, localLine 6", () => {
			const pos = cursor.getBlockForLine(14);
			expect(pos.blockIndex).toBe(2);
			expect(pos.localLineIndex).toBe(6);
		});

		test("getGlobalLineIndex: (block 0, line 0) -> 0", () => {
			expect(cursor.getGlobalLineIndex(0, 0)).toBe(0);
		});

		test("getGlobalLineIndex: (block 1, line 0) -> 5", () => {
			expect(cursor.getGlobalLineIndex(1, 0)).toBe(5);
		});

		test("getGlobalLineIndex: (block 2, line 3) -> 11", () => {
			expect(cursor.getGlobalLineIndex(2, 3)).toBe(11);
		});
	});

	describe("single block", () => {
		const cursor = createCursorIndex(1, () => 10);

		test("totalLines = 10", () => {
			expect(cursor.totalLines).toBe(10);
		});

		test("all lines map to block 0", () => {
			for (let i = 0; i < 10; i++) {
				const pos = cursor.getBlockForLine(i);
				expect(pos.blockIndex).toBe(0);
				expect(pos.localLineIndex).toBe(i);
			}
		});

		test("getGlobalLineIndex roundtrips", () => {
			for (let i = 0; i < 10; i++) {
				expect(cursor.getGlobalLineIndex(0, i)).toBe(i);
			}
		});
	});

	describe("empty blocks (0 lines)", () => {
		const lineCounts = [3, 0, 0, 5, 0, 2];
		const cursor = createCursorIndex(lineCounts.length, (i) => lineCounts[i]!);

		test("totalLines = 10", () => {
			expect(cursor.totalLines).toBe(10);
		});

		test("lines 0-2 map to block 0", () => {
			for (let i = 0; i < 3; i++) {
				expect(cursor.getBlockForLine(i).blockIndex).toBe(0);
			}
		});

		test("lines 3-7 map to block 3", () => {
			for (let i = 3; i < 8; i++) {
				const pos = cursor.getBlockForLine(i);
				expect(pos.blockIndex).toBe(3);
				expect(pos.localLineIndex).toBe(i - 3);
			}
		});

		test("lines 8-9 map to block 5", () => {
			for (let i = 8; i < 10; i++) {
				const pos = cursor.getBlockForLine(i);
				expect(pos.blockIndex).toBe(5);
				expect(pos.localLineIndex).toBe(i - 8);
			}
		});

		test("getBlockLineCount for empty blocks", () => {
			expect(cursor.getBlockLineCount(1)).toBe(0);
			expect(cursor.getBlockLineCount(2)).toBe(0);
			expect(cursor.getBlockLineCount(4)).toBe(0);
		});
	});

	describe("clamping out-of-range", () => {
		const lineCounts = [5, 3, 7];
		const cursor = createCursorIndex(lineCounts.length, (i) => lineCounts[i]!);

		test("negative global line clamps to 0", () => {
			const pos = cursor.getBlockForLine(-5);
			expect(pos.blockIndex).toBe(0);
			expect(pos.localLineIndex).toBe(0);
		});

		test("global line beyond total clamps to last line", () => {
			const pos = cursor.getBlockForLine(999);
			expect(pos.blockIndex).toBe(2);
			expect(pos.localLineIndex).toBe(6);
		});

		test("getGlobalLineIndex with out-of-range block clamps", () => {
			// Block index beyond range clamps to last block
			const global = cursor.getGlobalLineIndex(999, 0);
			expect(global).toBe(8); // start of last block
		});
	});

	describe("zero blocks", () => {
		const cursor = createCursorIndex(0, () => 0);

		test("totalLines = 0", () => {
			expect(cursor.totalLines).toBe(0);
		});

		test("getBlockForLine returns zero position", () => {
			const pos = cursor.getBlockForLine(0);
			expect(pos.blockIndex).toBe(0);
			expect(pos.localLineIndex).toBe(0);
		});

		test("getGlobalLineIndex returns 0", () => {
			expect(cursor.getGlobalLineIndex(0, 0)).toBe(0);
		});
	});

	describe("rebuild", () => {
		const lineCounts = [5, 3];
		const cursor = createCursorIndex(lineCounts.length, (i) => lineCounts[i]!);

		test("rebuild updates internal state", () => {
			expect(cursor.totalLines).toBe(8);

			const newLineCounts = [2, 4, 6];
			cursor.rebuild(newLineCounts.length, (i) => newLineCounts[i]!);

			expect(cursor.totalLines).toBe(12);
			expect(cursor.getBlockForLine(2).blockIndex).toBe(1);
			expect(cursor.getBlockForLine(6).blockIndex).toBe(2);
		});
	});

	describe("getBlockStartLine", () => {
		const lineCounts = [5, 3, 7];
		const cursor = createCursorIndex(lineCounts.length, (i) => lineCounts[i]!);

		test("block 0 starts at line 0", () => {
			expect(cursor.getBlockStartLine(0)).toBe(0);
		});

		test("block 1 starts at line 5", () => {
			expect(cursor.getBlockStartLine(1)).toBe(5);
		});

		test("block 2 starts at line 8", () => {
			expect(cursor.getBlockStartLine(2)).toBe(8);
		});
	});
});
