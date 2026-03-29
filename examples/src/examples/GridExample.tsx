import { useGrid } from "@preflow/react";
import { useState, useCallback, useRef, useEffect } from "react";

function seededHeight(index: number): number {
	return 60 + ((index * 4391 + 77731) % 91);
}

function seededColor(index: number): string {
	const hue = (index * 73 + 20) % 360;
	return `hsl(${hue}, 60%, 78%)`;
}

function computeGridLayout(containerWidth: number, minColWidth: number, gap: number) {
	const columns = Math.max(1, Math.floor((containerWidth + gap) / (minColWidth + gap)));
	const columnWidth = (containerWidth - gap * (columns - 1)) / columns;
	return { columns, columnWidth };
}

export function GridExample() {
	const [count, setCount] = useState(200);
	const [minColWidth, setMinColWidth] = useState(200);
	const [gap, setGap] = useState(8);
	const [overscan, setOverscan] = useState(3);
	const [loading, setLoading] = useState(false);
	const [infiniteScroll, setInfiniteScroll] = useState(true);
	const [containerWidth, setContainerWidth] = useState(800);
	const scrollRef = useRef<HTMLElement | null>(null);

	const { columns, columnWidth } = computeGridLayout(containerWidth, minColWidth, gap);

	const getHeight = useCallback((i: number) => seededHeight(i), []);

	const { containerRef, items, totalHeight, scrollToIndex, scrollToEnd } =
		useGrid({
			count,
			columns,
			columnWidth,
			gap,
			getHeight,
			overscan,
		});

	const combinedRef = useCallback(
		(el: HTMLElement | null) => {
			scrollRef.current = el;
			if (el) setContainerWidth(el.clientWidth);
			containerRef(el);
		},
		[containerRef],
	);

	// Track width changes
	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				setContainerWidth(entry.contentRect.width);
			}
		});
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	// Infinite scroll
	const handleScroll = useCallback(() => {
		if (!infiniteScroll || loading) return;
		const el = scrollRef.current;
		if (!el) return;
		const nearBottom =
			el.scrollTop + el.clientHeight >= el.scrollHeight - 300;
		if (nearBottom && count < 50000) {
			setLoading(true);
			setTimeout(() => {
				setCount((c) => Math.min(c + 60, 50000));
				setLoading(false);
			}, 300);
		}
	}, [infiniteScroll, loading, count]);

	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		el.addEventListener("scroll", handleScroll, { passive: true });
		return () => el.removeEventListener("scroll", handleScroll);
	}, [handleScroll]);

	return (
		<div className="example-layout">
			<div className="example-controls">
				<h3>Grid</h3>
				<p>
					Auto-columns grid with a minimum column width. Columns and
					widths adjust dynamically to fill the container, like CSS{" "}
					<code>repeat(auto-fill, minmax(...))</code>.
				</p>
				<label>
					Items:{" "}
					<input
						type="range"
						min={20}
						max={50000}
						value={count}
						onChange={(e) => setCount(+e.target.value)}
					/>
					<span>{count.toLocaleString()}</span>
				</label>
				<label>
					Min column width:{" "}
					<input
						type="range"
						min={80}
						max={400}
						value={minColWidth}
						onChange={(e) => setMinColWidth(+e.target.value)}
					/>
					<span>{minColWidth}px</span>
				</label>
				<label>
					Gap:{" "}
					<input
						type="range"
						min={0}
						max={20}
						value={gap}
						onChange={(e) => setGap(+e.target.value)}
					/>
					<span>{gap}px</span>
				</label>
				<label>
					Overscan:{" "}
					<input
						type="range"
						min={0}
						max={10}
						value={overscan}
						onChange={(e) => setOverscan(+e.target.value)}
					/>
					<span>{overscan}</span>
				</label>
				<label>
					<input
						type="checkbox"
						checked={infiniteScroll}
						onChange={(e) => setInfiniteScroll(e.target.checked)}
					/>
					Infinite scroll
				</label>
				<div className="example-actions">
					<button onClick={() => scrollToIndex(0)}>Top</button>
					<button
						onClick={() =>
							scrollToIndex(Math.floor(count / 2), "center")
						}
					>
						Middle
					</button>
					<button onClick={() => scrollToEnd()}>End</button>
					<button
						onClick={() =>
							scrollToIndex(
								Math.floor(Math.random() * count),
								"center",
							)
						}
					>
						Random
					</button>
					<button onClick={() => setCount((c) => c + 30)}>
						Load 30 More
					</button>
				</div>
				<div className="example-stats">
					<div>
						<span>Visible</span>
						<span>{items.length} cells</span>
					</div>
					<div>
						<span>Total height</span>
						<span>
							{Math.round(totalHeight).toLocaleString()}px
						</span>
					</div>
					<div>
						<span>Columns</span>
						<span>{columns}</span>
					</div>
					<div>
						<span>Column width</span>
						<span>{Math.round(columnWidth)}px</span>
					</div>
					<div>
						<span>Container</span>
						<span>{Math.round(containerWidth)}px</span>
					</div>
					<div>
						<span>Total items</span>
						<span>{count.toLocaleString()}</span>
					</div>
					{loading && (
						<div style={{ color: "var(--accent)", marginTop: 4 }}>
							Loading more...
						</div>
					)}
				</div>
			</div>
			<div className="example-viewport" ref={combinedRef}>
				<div style={{ height: totalHeight, position: "relative" }}>
					{items.map((item) => (
						<div
							key={item.index}
							className="grid-item"
							style={{
								position: "absolute",
								top: item.y,
								left: item.x,
								width: item.width,
								height: item.height,
								backgroundColor: seededColor(item.index),
							}}
						>
							<div style={{ textAlign: "center" }}>
								<div
									style={{
										fontWeight: 600,
										color: "rgba(0,0,0,0.7)",
									}}
								>
									#{item.index}
								</div>
								<div
									style={{
										fontSize: 10,
										color: "rgba(0,0,0,0.4)",
										marginTop: 2,
									}}
								>
									{Math.round(item.width)}x{item.height}
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
