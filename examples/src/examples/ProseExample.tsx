import { createProse } from "@preflow/prose";
import type { ProseFlow, LineItem } from "@preflow/prose";
import { useState, useRef, useCallback, useEffect } from "react";

const loremParagraphs = [
	"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
	"Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.",
	"Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis.",
	"Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.",
	"Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore.",
	"At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias.",
	"Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus.",
	"Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae.",
];

// Generate deterministic line counts per paragraph (3-20 lines)
function getLineCountForBlock(blockIndex: number): number {
	return 3 + ((blockIndex * 5381 + 7919) % 18);
}

const BLOCK_COUNT = 200;

export function ProseExample() {
	const [lineHeight, setLineHeight] = useState(24);
	const [blockGap, setBlockGap] = useState(16);
	const [scrollToLineInput, setScrollToLineInput] = useState(0);

	const proseRef = useRef<ProseFlow | null>(null);
	const containerRef = useRef<HTMLElement | null>(null);
	const [lines, setLines] = useState<LineItem[]>([]);
	const [totalHeight, setTotalHeight] = useState(0);
	const [totalLines, setTotalLines] = useState(0);

	// Rebuild prose when config changes
	useEffect(() => {
		const prose = createProse({
			count: BLOCK_COUNT,
			getLineCount: getLineCountForBlock,
			lineHeight,
			blockGap,
			overscan: 5,
		});
		proseRef.current = prose;

		// Do initial viewport set if container exists
		const el = containerRef.current;
		if (el) {
			prose.setViewport(el.scrollTop, el.clientHeight);
		}

		setLines(prose.getLines());
		setTotalHeight(prose.totalHeight);
		setTotalLines(prose.totalLines);
	}, [lineHeight, blockGap]);

	const handleRef = useCallback((el: HTMLElement | null) => {
		containerRef.current = el;
		if (!el) return;

		const prose = proseRef.current;
		if (prose) {
			prose.setViewport(el.scrollTop, el.clientHeight);
			setLines(prose.getLines());
			setTotalHeight(prose.totalHeight);
			setTotalLines(prose.totalLines);
		}
	}, []);

	const handleScroll = useCallback(() => {
		const el = containerRef.current;
		const prose = proseRef.current;
		if (!el || !prose) return;
		if (prose.setViewport(el.scrollTop, el.clientHeight)) {
			setLines(prose.getLines());
		}
	}, []);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		const observer = new ResizeObserver(() => {
			const prose = proseRef.current;
			if (!prose) return;
			if (prose.setViewport(el.scrollTop, el.clientHeight)) {
				setLines(prose.getLines());
				setTotalHeight(prose.totalHeight);
			}
		});

		el.addEventListener("scroll", handleScroll, { passive: true });
		observer.observe(el);

		return () => {
			el.removeEventListener("scroll", handleScroll);
			observer.disconnect();
		};
	}, [handleScroll]);

	const handleScrollToLine = useCallback(() => {
		const prose = proseRef.current;
		const el = containerRef.current;
		if (!prose || !el) return;
		const offset = prose.scrollToLine(scrollToLineInput, "center");
		el.scrollTop = offset;
	}, [scrollToLineInput]);

	const handleScrollToEnd = useCallback(() => {
		const prose = proseRef.current;
		const el = containerRef.current;
		if (!prose || !el) return;
		el.scrollTop = prose.scrollToEnd();
	}, []);

	// Determine paragraph text for a given block/line
	function getLineText(line: LineItem): string {
		const paraText =
			loremParagraphs[line.blockIndex % loremParagraphs.length]!;
		if (line.isBlockStart) {
			return `P${line.blockIndex}: ${paraText}`;
		}
		// Subsequent lines: simulate continuation
		const fragment = paraText.substring(
			(line.localLineIndex * 47) % paraText.length,
		);
		return fragment || paraText;
	}

	return (
		<div className="example-layout">
			<div className="example-controls">
				<h3>Prose</h3>
				<p>
					Line-level virtualization for long documents. Instead of
					virtualizing whole blocks, individual lines within
					paragraphs are virtualized. Uses createProse from
					@preflow/prose directly.
				</p>
				<label>
					Line height:{" "}
					<input
						type="range"
						min={16}
						max={40}
						value={lineHeight}
						onChange={(e) => setLineHeight(+e.target.value)}
					/>
					<span>{lineHeight}px</span>
				</label>
				<label>
					Block gap:{" "}
					<input
						type="range"
						min={0}
						max={40}
						value={blockGap}
						onChange={(e) => setBlockGap(+e.target.value)}
					/>
					<span>{blockGap}px</span>
				</label>
				<div
					style={{
						display: "flex",
						gap: 6,
						alignItems: "center",
						marginTop: 12,
					}}
				>
					<label style={{ marginBottom: 0 }}>
						Go to line:{" "}
						<input
							type="number"
							min={0}
							max={totalLines - 1}
							value={scrollToLineInput}
							onChange={(e) =>
								setScrollToLineInput(+e.target.value)
							}
						/>
					</label>
					<button
						onClick={handleScrollToLine}
						style={{
							padding: "4px 10px",
							background: "var(--accent)",
							color: "white",
							border: "none",
							borderRadius: 4,
							fontSize: 12,
							cursor: "pointer",
						}}
					>
						Go
					</button>
				</div>
				<div className="example-actions">
					<button onClick={handleScrollToEnd}>
						Scroll to End
					</button>
				</div>
				<div className="example-stats">
					<div>
						<span>Blocks</span>
						<span>{BLOCK_COUNT}</span>
					</div>
					<div>
						<span>Total lines</span>
						<span>{totalLines.toLocaleString()}</span>
					</div>
					<div>
						<span>Visible lines</span>
						<span>{lines.length}</span>
					</div>
					<div>
						<span>Total height</span>
						<span>
							{Math.round(totalHeight).toLocaleString()}px
						</span>
					</div>
					<div>
						<span>Range</span>
						<span>
							{lines[0]?.lineIndex ?? 0} -{" "}
							{lines[lines.length - 1]?.lineIndex ?? 0}
						</span>
					</div>
				</div>
			</div>
			<div
				className="example-viewport"
				ref={handleRef}
				style={{ fontFamily: "Georgia, serif" }}
			>
				<div style={{ height: totalHeight, position: "relative" }}>
					{lines.map((line) => (
						<div
							key={line.lineIndex}
							className={`prose-line${line.isBlockStart ? " block-start" : ""}`}
							style={{
								position: "absolute",
								top: line.y,
								left: 0,
								right: 0,
								height: line.height,
								backgroundColor: line.isBlockStart
									? "rgba(108, 92, 231, 0.08)"
									: "transparent",
							}}
						>
							<span className="line-number">
								{line.lineIndex}
							</span>
							<span
								style={{
									opacity: line.isBlockStart ? 1 : 0.7,
									fontSize: line.isBlockStart ? 15 : 14,
								}}
							>
								{getLineText(line)}
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
