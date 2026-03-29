import { useGrid } from "@preflow/react";
import { useState, useCallback, useRef, useEffect } from "react";

function seededHeight(index: number): number {
	return 60 + ((index * 4391 + 77731) % 91);
}

function seededColor(index: number): string {
	const hue = (index * 73 + 20) % 360;
	return `hsl(${hue}, 60%, 78%)`;
}

export function GridExample() {
	const [count, setCount] = useState(200);
	const [columns, setColumns] = useState(3);
	const [gap, setGap] = useState(8);
	const [overscan, setOverscan] = useState(3);
	const [loading, setLoading] = useState(false);
	const [infiniteScroll, setInfiniteScroll] = useState(true);
	const columnWidth = 200;
	const scrollRef = useRef<HTMLElement | null>(null);

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
			containerRef(el);
		},
		[containerRef],
	);

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
					Fixed-column grid where each row is sized by its tallest
					cell. Scroll down to auto-load more items.
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
					Columns:{" "}
					<input
						type="range"
						min={1}
						max={6}
						value={columns}
						onChange={(e) => setColumns(+e.target.value)}
					/>
					<span>{columns}</span>
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
						<span>Rows</span>
						<span>{Math.ceil(count / columns)}</span>
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
									{item.width}x{item.height}
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
