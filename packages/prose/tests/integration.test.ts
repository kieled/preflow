import { describe, expect, test } from "bun:test";
import { createProse } from "../src/prose";

describe("integration tests", () => {
	describe("1000 blocks with varying line counts", () => {
		const blockCount = 1000;
		const lineCounts: number[] = [];
		for (let i = 0; i < blockCount; i++) {
			lineCounts.push(1 + (i % 20)); // 1 to 20 lines per block
		}
		const lineHeight = 18;
		const blockGap = 8;

		const prose = createProse({
			count: blockCount,
			getLineCount: (i) => lineCounts[i]!,
			lineHeight,
			blockGap,
		});

		test("totalLines is correct", () => {
			let expected = 0;
			for (let i = 0; i < blockCount; i++) {
				expected += lineCounts[i]!;
			}
			expect(prose.totalLines).toBe(expected);
		});

		test("totalHeight is correct", () => {
			let expected = 0;
			for (let i = 0; i < blockCount; i++) {
				if (i > 0) expected += blockGap;
				expected += lineCounts[i]! * lineHeight;
			}
			expect(prose.totalHeight).toBe(expected);
		});

		test("getBlockForLine -> getGlobalLineIndex roundtrips for all lines", () => {
			// Test a sampling of lines throughout the document
			const totalLines = prose.totalLines;
			const step = Math.max(1, Math.floor(totalLines / 200));
			for (let g = 0; g < totalLines; g += step) {
				const pos = prose.getBlockForLine(g);
				const roundtrip = prose.getGlobalLineIndex(pos.blockIndex, pos.localLineIndex);
				expect(roundtrip).toBe(g);
			}
			// Also test the very last line
			const lastPos = prose.getBlockForLine(totalLines - 1);
			const lastRoundtrip = prose.getGlobalLineIndex(lastPos.blockIndex, lastPos.localLineIndex);
			expect(lastRoundtrip).toBe(totalLines - 1);
		});

		test("getLineOffset is monotonically non-decreasing", () => {
			let prevOffset = 0;
			const totalLines = prose.totalLines;
			const step = Math.max(1, Math.floor(totalLines / 500));
			for (let g = 0; g < totalLines; g += step) {
				const offset = prose.getLineOffset(g);
				expect(offset).toBeGreaterThanOrEqual(prevOffset);
				prevOffset = offset;
			}
		});
	});

	describe("rapid scrolling through a long document", () => {
		const blockCount = 500;
		const lineCounts: number[] = [];
		for (let i = 0; i < blockCount; i++) {
			lineCounts.push(5 + (i % 15));
		}
		const lineHeight = 20;
		const blockGap = 10;

		test("1000 viewport updates return valid items", () => {
			const prose = createProse({
				count: blockCount,
				getLineCount: (i) => lineCounts[i]!,
				lineHeight,
				blockGap,
				overscan: 3,
			});

			const total = prose.totalHeight;

			for (let step = 0; step < 1000; step++) {
				const scrollTop = (step / 1000) * total;
				prose.setViewport(scrollTop, 600);
				const lines = prose.getLines();

				if (scrollTop < total) {
					expect(lines.length).toBeGreaterThan(0);
				}

				// All returned lines should have valid properties
				for (const line of lines) {
					expect(line.lineIndex).toBeGreaterThanOrEqual(0);
					expect(line.lineIndex).toBeLessThan(prose.totalLines);
					expect(line.blockIndex).toBeGreaterThanOrEqual(0);
					expect(line.blockIndex).toBeLessThan(blockCount);
					expect(line.height).toBe(lineHeight);
					expect(line.y).toBeGreaterThanOrEqual(0);
				}
			}
		});
	});

	describe("scrollToLine precision", () => {
		const lineCounts = [10, 20, 30, 15, 25];
		const lineHeight = 16;
		const blockGap = 12;

		test("scrollToLine + setViewport shows the target line", () => {
			const prose = createProse({
				count: lineCounts.length,
				getLineCount: (i) => lineCounts[i]!,
				lineHeight,
				blockGap,
				overscan: 0,
			});

			const totalLines = prose.totalLines;

			// Test a variety of target lines
			for (let target = 0; target < totalLines; target += 7) {
				const scrollTo = prose.scrollToLine(target, "start");
				prose.setViewport(scrollTo, 300);
				const lines = prose.getLines();

				// The target line should be in the returned lines
				const found = lines.some((l) => l.lineIndex === target);
				expect(found).toBe(true);
			}
		});

		test("scrollToLine returns exact getLineOffset value", () => {
			const prose = createProse({
				count: lineCounts.length,
				getLineCount: (i) => lineCounts[i]!,
				lineHeight,
				blockGap,
			});

			const totalLines = prose.totalLines;
			for (let g = 0; g < totalLines; g++) {
				expect(prose.scrollToLine(g, "start")).toBe(prose.getLineOffset(g));
			}
		});
	});

	describe("dynamic document growth", () => {
		test("setCount grows document and maintains consistency", () => {
			const lineCounts = [5, 10, 3, 8, 12, 7, 4, 9, 6, 11];
			const prose = createProse({
				count: 2,
				getLineCount: (i) => lineCounts[i]!,
				lineHeight: 20,
				blockGap: 10,
			});

			expect(prose.totalLines).toBe(15);

			// Grow incrementally
			for (let c = 3; c <= 10; c++) {
				prose.setCount(c);
				let expectedLines = 0;
				for (let i = 0; i < c; i++) expectedLines += lineCounts[i]!;
				expect(prose.totalLines).toBe(expectedLines);
			}
		});
	});

	describe("edge case: all blocks have 1 line", () => {
		test("behaves like a simple list", () => {
			const count = 100;
			const lineHeight = 24;
			const blockGap = 4;

			const prose = createProse({
				count,
				getLineCount: () => 1,
				lineHeight,
				blockGap,
			});

			// Total: 100 * 24 + 99 * 4 = 2400 + 396 = 2796
			expect(prose.totalHeight).toBe(2796);
			expect(prose.totalLines).toBe(100);

			// Each line is both block start and block end
			prose.setViewport(0, 500);
			const lines = prose.getLines();
			for (const line of lines) {
				expect(line.isBlockStart).toBe(true);
				expect(line.isBlockEnd).toBe(true);
			}
		});
	});
});
