import { useFlow } from "@preflow/react";
import { useState, useCallback, useRef, useEffect } from "react";

function seededHeight(index: number): number {
	return 40 + ((index * 7919 + 104729) % 161);
}

function seededColor(index: number): string {
	const hue = (index * 137) % 360;
	return `hsl(${hue}, 65%, 85%)`;
}

export function FlowExample() {
	const [count, setCount] = useState(200);
	const [overscan, setOverscan] = useState(5);
	const [loading, setLoading] = useState(false);
	const [infiniteScroll, setInfiniteScroll] = useState(true);
	const scrollRef = useRef<HTMLElement | null>(null);
	const getHeight = useCallback((i: number) => seededHeight(i), []);

	const { containerRef, items, totalHeight, scrollToIndex, scrollToEnd } =
		useFlow({
			count,
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

	// Infinite scroll: load more when near bottom
	const handleScroll = useCallback(() => {
		if (!infiniteScroll || loading) return;
		const el = scrollRef.current;
		if (!el) return;
		const nearBottom =
			el.scrollTop + el.clientHeight >= el.scrollHeight - 300;
		if (nearBottom && count < 100000) {
			setLoading(true);
			setTimeout(() => {
				setCount((c) => Math.min(c + 100, 100000));
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
				<h3>Flow (1D List)</h3>
				<p>
					Variable-height items in a single column. Scroll down to
					auto-load more items (infinite scroll). Each item has a
					deterministic random height between 40-200px.
				</p>
				<label>
					Items:{" "}
					<input
						type="range"
						min={50}
						max={100000}
						value={count}
						onChange={(e) => setCount(+e.target.value)}
					/>
					<span>{count.toLocaleString()}</span>
				</label>
				<label>
					Overscan:{" "}
					<input
						type="range"
						min={0}
						max={20}
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
					<button onClick={() => scrollToIndex(0)}>
						Scroll to Top
					</button>
					<button
						onClick={() =>
							scrollToIndex(Math.floor(count / 2), "center")
						}
					>
						Scroll to Middle
					</button>
					<button onClick={() => scrollToEnd()}>
						Scroll to End
					</button>
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
					<button
						onClick={() => setCount((c) => c + 50)}
					>
						Load 50 More
					</button>
				</div>
				<div className="example-stats">
					<div>
						<span>Visible</span>
						<span>{items.length} items</span>
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
							{items[0]?.index ?? 0} -{" "}
							{items[items.length - 1]?.index ?? 0}
						</span>
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
							className="flow-item"
							style={{
								position: "absolute",
								top: item.y,
								left: 0,
								right: 0,
								height: item.height,
								backgroundColor: seededColor(item.index),
							}}
						>
							<span className="item-index">#{item.index}</span>
							<span className="item-info">
								{item.height}px
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
