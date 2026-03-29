import { describe, expect, test } from "bun:test";
import { createProse } from "../src/prose";

describe("createProse", () => {
	function makeProse(lineCounts: number[], lineHeight = 20, blockGap = 0, overscan = 3) {
		return createProse({
			count: lineCounts.length,
			getLineCount: (i) => lineCounts[i]!,
			lineHeight,
			blockGap,
			overscan,
		});
	}

	describe("totalHeight computation", () => {
		test("3 blocks [5,3,7], lineHeight=20, blockGap=10 -> 320", () => {
			// block 0: 5*20 = 100
			// gap: 10
			// block 1: 3*20 = 60
			// gap: 10
			// block 2: 7*20 = 140
			// total: 100 + 10 + 60 + 10 + 140 = 320
			const prose = makeProse([5, 3, 7], 20, 10);
			expect(prose.totalHeight).toBe(320);
		});

		test("single block, no gap", () => {
			const prose = makeProse([10], 15, 0);
			expect(prose.totalHeight).toBe(150);
		});

		test("empty", () => {
			const prose = makeProse([], 20, 10);
			expect(prose.totalHeight).toBe(0);
		});

		test("all empty blocks", () => {
			const prose = makeProse([0, 0, 0], 20, 10);
			// Each block height = 0, gaps between: 0 + 10 + 0 + 10 + 0 = 20
			expect(prose.totalHeight).toBe(20);
		});
	});

	describe("totalLines", () => {
		test("sums line counts across blocks", () => {
			const prose = makeProse([5, 3, 7], 20);
			expect(prose.totalLines).toBe(15);
		});
	});

	describe("getLines", () => {
		test("returns correct LineItem fields", () => {
			const prose = makeProse([3, 2], 20, 10, 100);
			prose.setViewport(0, 1000);
			const lines = prose.getLines();

			expect(lines.length).toBe(5);

			// Block 0, line 0
			expect(lines[0]!.lineIndex).toBe(0);
			expect(lines[0]!.blockIndex).toBe(0);
			expect(lines[0]!.localLineIndex).toBe(0);
			expect(lines[0]!.y).toBe(0);
			expect(lines[0]!.height).toBe(20);
			expect(lines[0]!.isBlockStart).toBe(true);
			expect(lines[0]!.isBlockEnd).toBe(false);

			// Block 0, line 2 (last line of block 0)
			expect(lines[2]!.lineIndex).toBe(2);
			expect(lines[2]!.blockIndex).toBe(0);
			expect(lines[2]!.localLineIndex).toBe(2);
			expect(lines[2]!.y).toBe(40);
			expect(lines[2]!.isBlockStart).toBe(false);
			expect(lines[2]!.isBlockEnd).toBe(true);

			// Block 1, line 0 (first line of block 1)
			// Block 0: 3*20 = 60, then gap = 10, so block 1 content starts at 60 + 10 = 70
			expect(lines[3]!.lineIndex).toBe(3);
			expect(lines[3]!.blockIndex).toBe(1);
			expect(lines[3]!.localLineIndex).toBe(0);
			expect(lines[3]!.y).toBe(70);
			expect(lines[3]!.isBlockStart).toBe(true);

			// Block 1, line 1 (last line of block 1)
			expect(lines[4]!.lineIndex).toBe(4);
			expect(lines[4]!.blockIndex).toBe(1);
			expect(lines[4]!.localLineIndex).toBe(1);
			expect(lines[4]!.y).toBe(90);
			expect(lines[4]!.isBlockEnd).toBe(true);
		});

		test("only returns visible lines", () => {
			const prose = makeProse([10, 10, 10], 20, 0, 0);
			prose.setViewport(100, 80);
			const lines = prose.getLines();

			// scrollTop=100, viewportHeight=80 -> visible pixel range [100, 180)
			// line at y=100 is global line 5 (block 0 has 10 lines: 0-199px)
			// line at y=180 is global line 9
			// Without overscan, should get lines 5..9 or close
			for (const line of lines) {
				expect(line.y).toBeLessThan(200); // within or near the viewport
			}
			expect(lines.length).toBeLessThan(30); // not all 30 lines
		});
	});

	describe("scrollToLine", () => {
		test("align=start returns line offset", () => {
			const prose = makeProse([5, 5], 20, 10);
			prose.setViewport(0, 200);

			// Line 0: y=0
			expect(prose.scrollToLine(0, "start")).toBe(0);
			// Line 4: y=80 (block 0, local 4)
			expect(prose.scrollToLine(4, "start")).toBe(80);
			// Line 5: y=110 (block 1, local 0; block 0 = 100px, gap = 10px)
			expect(prose.scrollToLine(5, "start")).toBe(110);
			// Line 7: y=150 (block 1, local 2)
			expect(prose.scrollToLine(7, "start")).toBe(150);
		});

		test("align=center centers line in viewport", () => {
			const prose = makeProse([10], 20, 0);
			prose.setViewport(0, 200);
			// Line 5: y=100. Center: 100 - 200/2 + 20/2 = 100 - 100 + 10 = 10
			expect(prose.scrollToLine(5, "center")).toBe(10);
		});

		test("align=end puts line at bottom of viewport", () => {
			const prose = makeProse([10], 20, 0);
			prose.setViewport(0, 200);
			// Line 5: y=100. End: 100 - 200 + 20 = -80
			expect(prose.scrollToLine(5, "end")).toBe(-80);
		});

		test("clamps out-of-range line index", () => {
			const prose = makeProse([5, 5], 20, 0);
			prose.setViewport(0, 200);
			// Negative: clamps to 0
			expect(prose.scrollToLine(-10)).toBe(0);
			// Beyond total: clamps to last line
			expect(prose.scrollToLine(999)).toBe(180); // line 9, y=180
		});
	});

	describe("setViewport", () => {
		test("returns true when range changes", () => {
			const prose = makeProse(Array(50).fill(10), 20, 0, 0);
			const changed = prose.setViewport(0, 200);
			expect(changed).toBe(true);
		});

		test("returns false when range unchanged", () => {
			const prose = makeProse(Array(50).fill(10), 20, 0, 0);
			prose.setViewport(0, 200);
			const changed = prose.setViewport(0, 200);
			expect(changed).toBe(false);
		});

		test("scroll forward changes range", () => {
			const prose = makeProse(Array(50).fill(10), 20, 0, 0);
			prose.setViewport(0, 200);
			const r1 = { ...prose.visibleRange };
			prose.setViewport(500, 200);
			const r2 = prose.visibleRange;
			expect(r2.start).toBeGreaterThan(r1.start);
		});
	});

	describe("overscan", () => {
		test("overscan=0 gives minimal range", () => {
			const prose = makeProse(Array(100).fill(5), 20, 0, 0);
			prose.setViewport(0, 200);
			const r = prose.visibleRange;
			// 200px / 20px = 10 lines visible, with 5 lines per block
			expect(r.end - r.start).toBeLessThanOrEqual(15);
		});

		test("overscan extends range", () => {
			const prose = makeProse(Array(100).fill(5), 20, 0, 10);
			prose.setViewport(2000, 200);
			const r = prose.visibleRange;
			// Without overscan: ~10 lines visible
			// With overscan=10: extended by 10 on each side
			expect(r.end - r.start).toBeGreaterThan(15);
		});

		test("overscan clamped at boundaries", () => {
			const prose = makeProse(Array(10).fill(5), 20, 0, 100);
			prose.setViewport(0, 200);
			expect(prose.visibleRange.start).toBe(0);
			expect(prose.visibleRange.end).toBeLessThanOrEqual(50);
		});
	});

	describe("setCount", () => {
		test("adding blocks increases totalHeight and totalLines", () => {
			const allLineCounts = [5, 3, 7, 4, 6];
			const prose = createProse({
				count: 3,
				getLineCount: (i) => allLineCounts[i]!,
				lineHeight: 20,
				blockGap: 10,
			});
			expect(prose.totalLines).toBe(15);
			const oldHeight = prose.totalHeight;

			prose.setCount(5);
			expect(prose.totalLines).toBe(25);
			expect(prose.totalHeight).toBeGreaterThan(oldHeight);
		});

		test("removing blocks decreases totalHeight", () => {
			const lineCounts = [5, 3, 7];
			const prose = makeProse(lineCounts, 20, 10);
			expect(prose.totalHeight).toBe(320);

			prose.setCount(1);
			expect(prose.totalHeight).toBe(100); // just block 0: 5*20
		});

		test("setCount to same value is no-op", () => {
			const prose = makeProse([5, 3, 7], 20, 10);
			const h1 = prose.totalHeight;
			prose.setCount(3);
			expect(prose.totalHeight).toBe(h1);
		});
	});

	describe("scrollToEnd", () => {
		test("returns offset to show last lines", () => {
			const prose = makeProse([10, 10], 20, 0);
			prose.setViewport(0, 100);
			// Total = 400, scrollToEnd = 400 - 100 = 300
			expect(prose.scrollToEnd()).toBe(300);
		});

		test("returns 0 when content fits in viewport", () => {
			const prose = makeProse([3], 20, 0);
			prose.setViewport(0, 200);
			// Total = 60 < 200
			expect(prose.scrollToEnd()).toBe(0);
		});
	});

	describe("getBlockForLine and getGlobalLineIndex", () => {
		test("roundtrip consistency", () => {
			const lineCounts = [5, 3, 7];
			const prose = makeProse(lineCounts, 20, 10);

			for (let g = 0; g < 15; g++) {
				const pos = prose.getBlockForLine(g);
				const roundtrip = prose.getGlobalLineIndex(pos.blockIndex, pos.localLineIndex);
				expect(roundtrip).toBe(g);
			}
		});
	});

	describe("relayout", () => {
		test("rebuilds when line counts change", () => {
			let counts = [5, 3, 7];
			const prose = createProse({
				count: 3,
				getLineCount: (i) => counts[i]!,
				lineHeight: 20,
				blockGap: 0,
			});
			expect(prose.totalLines).toBe(15);
			expect(prose.totalHeight).toBe(300);

			// Simulate a width change that changes line wrapping
			counts = [3, 2, 4];
			prose.relayout();
			expect(prose.totalLines).toBe(9);
			expect(prose.totalHeight).toBe(180);
		});
	});

	describe("getLineOffset", () => {
		test("returns correct offsets with blockGap", () => {
			const prose = makeProse([3, 2], 20, 10);

			// Block 0: lines 0,1,2 at y=0,20,40
			expect(prose.getLineOffset(0)).toBe(0);
			expect(prose.getLineOffset(1)).toBe(20);
			expect(prose.getLineOffset(2)).toBe(40);

			// Block 1: starts at 60 (block 0 height) + 10 (gap) = 70
			// lines 3,4 at y=70,90
			expect(prose.getLineOffset(3)).toBe(70);
			expect(prose.getLineOffset(4)).toBe(90);
		});

		test("returns 0 for empty prose", () => {
			const prose = makeProse([], 20, 10);
			expect(prose.getLineOffset(0)).toBe(0);
		});
	});
});
